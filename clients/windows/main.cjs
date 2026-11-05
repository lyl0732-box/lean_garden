const {app,BrowserWindow,ipcMain,Menu,shell,net,safeStorage}=require('electron');
const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const {prepareResources}=require('./resource-cache.cjs');
let resources=null,connecting=false;
const defaultURL='https://162.14.77.140/',qa=process.argv.includes('--garden-qa');let window,settingsFile,serverURL=new URL(defaultURL).origin,quality='high',username='',passwordCipher=null;
if(qa&&process.env.GARDEN_QA_DATA)app.setPath('userData',path.resolve(process.env.GARDEN_QA_DATA));
const portal=pathToFileURL(path.join(__dirname,'start.html')).href;
function normalize(value){const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('请填写 http:// 或 https:// 开头的服务器地址。');return url.origin;}
const normalizeQuality=value=>value==='low'?'low':'high';
const saveConnection=()=>fs.writeFileSync(settingsFile,JSON.stringify({serverURL,quality,username,...(passwordCipher?{passwordCipher,remember:true}:{remember:false})}));
async function recalledPassword(){try{return passwordCipher?(await safeStorage.decryptStringAsync(Buffer.from(passwordCipher,'base64'))).result:'';}catch{passwordCipher=null;saveConnection();return '';}}
async function authenticate(origin,value){
  const mode=['register','hint','status'].includes(value.mode)?value.mode:'login';
  const cookies=await window.webContents.session.cookies.get({url:origin});
  const headers={'Origin':origin,'Cookie':cookies.map(c=>c.name+'='+c.value).join('; ')};
  const options={headers,signal:AbortSignal.timeout(20000),redirect:'error'};
  if(mode!=='status'){headers['Content-Type']='application/json';options.method='POST';options.body=JSON.stringify({username:value.username,password:value.password,recoveryHint:value.recoveryHint||'',adoptLegacy:value.adoptLegacy!==false});}
  const response=await fetch(origin+'/api/auth/'+mode,options);const result=await response.json();
  if(!response.ok)throw new Error(result.error||'登录失败，请稍后重试。');
  for(const raw of response.headers.getSetCookie()){
    const [pair,...attributes]=raw.split(';'),split=pair.indexOf('='),name=pair.slice(0,split).trim(),cookieValue=pair.slice(split+1);
    if(!['garden_session','garden_profile'].includes(name))continue;
    const age=attributes.find(a=>/^\s*max-age=/i.test(a)),seconds=age?Number(age.split('=')[1]):undefined;
    if(seconds!==undefined&&seconds<=0){await window.webContents.session.cookies.remove(origin,name);continue;}
    await window.webContents.session.cookies.set({url:origin,name,value:cookieValue,path:'/',httpOnly:true,sameSite:'strict',secure:origin.startsWith('https:'),...(seconds?{expirationDate:Date.now()/1000+seconds}:{})});
  }
  return result;
}
async function openPortal(){
  try{if(new URL(window.webContents.getURL()).origin===serverURL){const stored=await Promise.race([window.webContents.executeJavaScript("localStorage.getItem('garden-asset-quality')"),new Promise(resolve=>setTimeout(resolve,1000))]);if(['auto','high','low'].includes(stored)){quality=normalizeQuality(stored);saveConnection();}}}catch{}
  return window.loadFile(path.join(__dirname,'start.html'));
}
app.whenReady().then(async()=>{
  settingsFile=path.join(app.getPath('userData'),'connection.json');try{const saved=JSON.parse(fs.readFileSync(settingsFile,'utf8'));serverURL=normalize(saved.serverURL);quality=normalizeQuality(saved.quality);username=typeof saved.username==='string'?saved.username:'';passwordCipher=saved.remember&&typeof saved.passwordCipher==='string'?saved.passwordCipher:null;}catch{}
  window=new BrowserWindow({width:1280,height:850,minWidth:760,minHeight:540,show:!qa,fullscreen:true,autoHideMenuBar:true,title:'证明花园',backgroundColor:'#edf3df',icon:path.join(__dirname,'icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const localResponse=async request=>{
    const url=new URL(request.url),file=url.origin===serverURL&&['GET','HEAD'].includes(request.method)&&resources?.files.get(url.pathname==='/'?'/index.html':url.pathname);
    const version=url.searchParams.get('v');
    if(file&&(!version||version===file.sha256.slice(0,16))){
      const headers={'Content-Type':file.mime,'Content-Length':String(file.bytes),'Cache-Control':'no-store','X-Garden-Asset-Source':file.source,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
      return new Response(request.method==='HEAD'?null:await fs.promises.readFile(file.file),{headers});
    }
    return net.fetch(request,{bypassCustomProtocolHandlers:true});
  };
  await window.webContents.session.protocol.handle('http',localResponse);await window.webContents.session.protocol.handle('https',localResponse);
  const trustedWindow=event=>{if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)throw new Error('Unavailable');const url=event.senderFrame.url;if(url!==portal&&new URL(url).origin!==serverURL)throw new Error('Unavailable');};
  ipcMain.handle('window:fullscreen-state',event=>{trustedWindow(event);return window.isFullScreen();});
  ipcMain.handle('window:fullscreen-toggle',event=>{
    trustedWindow(event);const next=!window.isFullScreen(),name=next?'enter-full-screen':'leave-full-screen';
    return new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);window.removeListener(name,done);resolve(window.isFullScreen());};window.once(name,done);timer=setTimeout(done,1500);window.setFullScreen(next);});
  });
  const fullscreenChanged=()=>{if(!window.isDestroyed()&&!window.webContents.isDestroyed())window.webContents.send('window:fullscreen-changed',window.isFullScreen());};
  window.on('enter-full-screen',fullscreenChanged);window.on('leave-full-screen',fullscreenChanged);
  const trustedPortal=event=>{if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame||event.senderFrame.url!==portal)throw new Error('Unavailable');};
  ipcMain.handle('connection:read',async event=>{trustedPortal(event);return {serverURL:serverURL+'/',quality,username,remember:!!passwordCipher,password:await recalledPassword(),version:app.getVersion()};});
  ipcMain.handle('connection:forget',event=>{trustedPortal(event);passwordCipher=null;saveConnection();return true;});
  ipcMain.handle('connection:exit',event=>{trustedPortal(event);window.close();});
  ipcMain.handle('connection:check',async(event,value)=>{
    trustedPortal(event);if(connecting)throw new Error('正在连接，请稍候。');connecting=true;
    try{const checked=await prepareResources({origin:normalize(value.serverURL),bundle:app.isPackaged?path.join(process.resourcesPath,'garden-assets'):path.join(__dirname,'../bundled'),cache:path.join(app.getPath('userData'),'resource-cache'),onProgress:p=>window.webContents.send('connection:update',p)});return {revision:checked.manifest.revision,...checked.stats};}finally{connecting=false;}
  });
  ipcMain.handle('connection:auth',async(event,value)=>{trustedPortal(event);if(!['hint','status'].includes(value.mode))throw new Error('Unavailable');return authenticate(normalize(value.serverURL),value);});
  ipcMain.handle('connection:open',async(event,value)=>{
    trustedPortal(event);if(connecting)return false;
    const nextURL=normalize(value.serverURL);connecting=true;
    try{
      await authenticate(nextURL,value);
      const cipher=value.remember?await safeStorage.encryptStringAsync(String(value.password)):null;
      const prepared=await prepareResources({origin:nextURL,bundle:app.isPackaged?path.join(process.resourcesPath,'garden-assets'):path.join(__dirname,'../bundled'),cache:path.join(app.getPath('userData'),'resource-cache'),onProgress:progress=>{if(!window.isDestroyed()&&window.webContents.getURL()===portal)window.webContents.send('connection:update',progress);}});
      serverURL=nextURL;quality=normalizeQuality(value.quality);username=String(value.username||'').trim();passwordCipher=cipher?.toString('base64')||null;resources=prepared;saveConnection();
      const target=new URL(serverURL);target.searchParams.set('garden-quality',quality);await window.loadURL(target.href);return true;
    }finally{connecting=false;}
  });
  window.webContents.on('will-navigate',(event,url)=>{if(url===portal)return;if(url==='leangarden://exit'){event.preventDefault();window.close();return;}if(url==='leangarden://connection'){event.preventDefault();void openPortal();return;}try{if(new URL(url).origin===new URL(serverURL).origin)return;if(new URL(url).protocol==='https:')shell.openExternal(url);}catch{}event.preventDefault();});
  window.webContents.setWindowOpenHandler(({url})=>{try{if(['http:','https:'].includes(new URL(url).protocol))shell.openExternal(url);}catch{}return{action:'deny'};});
  window.webContents.on('did-fail-load',(_event,code,_description,url,isMainFrame)=>{if(isMainFrame&&code!==-3&&url!==portal)openPortal();});
  window.webContents.session.setPermissionRequestHandler((_webContents,permission,callback)=>callback(permission==='fullscreen'));
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'花园',submenu:[{label:'更换服务器',click:openPortal},{label:'返回主页',click:()=>window.loadURL(serverURL+'/#home')},{label:'重新加载',role:'reload'},{type:'separator'},{role:'quit',label:'退出'}]},{label:'显示',submenu:[{role:'togglefullscreen',label:'全屏',accelerator:'F11'},{role:'resetZoom',label:'恢复大小'},{role:'zoomIn',label:'放大'},{role:'zoomOut',label:'缩小'}]}]));
  openPortal();
});
app.on('window-all-closed',()=>app.quit());
