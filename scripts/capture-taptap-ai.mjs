import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

process.env.GARDEN_DATA_DIR=path.resolve('artifacts/taptap-ai-screenshot-data-'+Date.now());
const preparation=JSON.parse(await readFile('dist/taptap/android-preparation.json','utf8'));
const disclosure=JSON.parse(await readFile('clients/taptap-minigame/ai-disclosure.json','utf8'));
const {createServer}=await import('../server/index.mjs');
const {sessionAccount,accountProfile}=await import('../server/accounts.mjs');
const {save}=await import('../server/store.mjs');
const backend=await createServer({publicRoot:preparation.web});await new Promise(r=>backend.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+backend.address().port;
const harness=await readFile('scripts/verify-taptap.mjs','utf8');
const match=/const shim=(`[^`]+`);/.exec(harness);assert.ok(match,'Existing local tap API test adapter is missing');const shim=vm.runInNewContext(match[1]);
const miniRoot=path.resolve('dist/taptap/minigame');
const frontend=http.createServer(async(req,res)=>{try{if(req.url==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;overflow:hidden;touch-action:none}</style><body><script>'+shim+'</script><script src="game.js"></script></body>');return;}const file=path.resolve(miniRoot,'.'+new URL(req.url,'http://local').pathname);assert.ok(file.startsWith(miniRoot+path.sep));res.setHeader('Content-Type',({'.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});await new Promise(r=>frontend.listen(0,'127.0.0.1',r));
let context;const errors=[],checks=[];
const screenshotAPK=path.resolve('dist/taptap/AI声明证明截图_APK.png'),screenshotMini=path.resolve('dist/taptap/AI声明证明截图_小游戏.png');
try{
  context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{channel:'chrome',headless:true,locale:'zh-CN',viewport:{width:390,height:844},deviceScaleFactor:2,userAgent:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/134.0.0.0 Mobile Safari/537.36 LeanGarden/0.13.2 LeanGardenTapTap/1'});
  await context.addInitScript(()=>{localStorage.setItem('garden-sound','off');localStorage.setItem('garden-music','off');localStorage.setItem('garden-motion','off');});
  const auth=await context.request.post(origin+'/api/auth/register',{data:{username:'花园旅人',password:'isolated-ai-screenshot-password',remember:false}});assert.equal(auth.status(),200);
  const cookie=auth.headers()['set-cookie'],owner=accountProfile(sessionAccount(cookie));owner.prologueSeen=true;await save();
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(origin+'/#home');await page.locator('.ai-content-notice').waitFor({timeout:90000});
  await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.querySelectorAll('.hero-yaya img')].every(img=>img.complete&&img.naturalWidth>0));
  for(const [width,height]of [[320,740],[390,844],[844,390],[800,1280]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(100);const box=await page.locator('.ai-content-notice').boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,'Visible AI notice '+width);
    const overflow=await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}));assert.ok(overflow.w<=width&&overflow.h<=height,'Home remains fixed at '+width);checks.push('AI notice visible without scrolling at '+width+'x'+height);
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert.ok((await page.locator('.ai-content-notice').innerText()).includes(disclosure.short));await page.screenshot({path:screenshotAPK});
  await page.locator('.home-toolbar [data-action="settings"]').click();await page.locator('.ai-disclosure-details').waitFor();assert.ok((await page.locator('.ai-disclosure-details').innerText()).includes(disclosure.full));checks.push('APK settings contains the full disclosure');
  const mini=await context.newPage();mini.on('pageerror',error=>errors.push(error.message));
  await mini.exposeFunction('qaRequest',async options=>{const u=new URL(options.url);const r=await fetch(origin+u.pathname+u.search,{method:options.method,headers:options.header,body:options.data===undefined?undefined:JSON.stringify(options.data)});return {statusCode:r.status,data:await r.json(),cookies:r.headers.getSetCookie(),header:{}};});
  await mini.goto('http://127.0.0.1:'+frontend.address().port);await mini.waitForFunction(()=>GameGlobal.leanGarden&&!GameGlobal.leanGarden.state.busy);
  await mini.evaluate(async()=>{const game=GameGlobal.leanGarden;game.state.name='花园旅人';game.state.password='isolated-ai-screenshot-password';await game.handle('login-submit');});
  await mini.waitForFunction(()=>GameGlobal.leanGarden.state.page==='home'&&!GameGlobal.leanGarden.state.busy);
  await mini.waitForFunction(()=>[...GameGlobal.leanGarden.platform.images.values()].every(item=>item.ready));await mini.waitForTimeout(250);
  await mini.screenshot({path:screenshotMini});
  if(process.argv.includes('--art-review')){
    for(const [width,height]of [[320,740],[390,844],[800,1280],[844,390]]){
      await mini.setViewportSize({width,height});await mini.waitForTimeout(180);
      const geometry=await mini.evaluate(()=>{const g=GameGlobal.leanGarden;g.render(Date.now());return {w:g.ui.w,h:g.ui.h,hits:g.ui.hits};});
      for(const name of ['map','mini','garden'])assert.equal(geometry.hits.filter(h=>h.action==='page'&&h.value===name).length,1);
      for(const hit of geometry.hits)assert.ok(hit.x>=0&&hit.y>=0&&hit.x+hit.w<=geometry.w+1&&hit.y+hit.h<=geometry.h+1,'Home hit bounds at '+width+': '+hit.action);
      await mini.screenshot({path:'artifacts/taptap-art-home-'+width+'.png'});
    }
    await mini.setViewportSize({width:390,height:844});
    for(const room of ['map','mini','garden','shop']){
      await mini.evaluate(room=>GameGlobal.leanGarden.goto(room),room);await mini.waitForTimeout(250);await mini.waitForFunction(()=>[...GameGlobal.leanGarden.platform.images.values()].every(item=>item.ready));await mini.screenshot({path:'artifacts/taptap-art-'+room+'.png'});
    }
    await mini.evaluate(async()=>{const g=GameGlobal.leanGarden;await g.startLevel('n01');await g.handle('skill','rfl');});await mini.waitForTimeout(250);await mini.screenshot({path:'artifacts/taptap-art-battle.png'});
    checks.push('Original APK artwork reviewed on home, chapter trail, challenges, garden, shop and battle');
  }
  await mini.evaluate(async()=>{const g=GameGlobal.leanGarden;g.goto('settings');await g.handle('about');});assert.ok((await mini.evaluate(()=>GameGlobal.leanGarden.state.dialog.body)).includes(disclosure.full));checks.push('Mini-game settings contains the full disclosure');
  assert.deepEqual(errors,[]);await writeFile('artifacts/taptap-ai-screenshot-report.json',JSON.stringify({ok:true,screenshotAPK,screenshotMini,checks,errors,capture:'Browser-rendered APK bundled frontend and tap API canvas adapter; no real Android/TapTap device capture',productionDataChanged:false},null,2));console.log(JSON.stringify({ok:true,screenshotAPK,screenshotMini}));
}finally{if(context)await context.close();await new Promise(r=>frontend.close(r));await new Promise(r=>backend.close(r));}
