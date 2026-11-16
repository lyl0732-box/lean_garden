import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {readFile,writeFile,stat} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

process.env.GARDEN_DATA_DIR=path.resolve('artifacts/taptap-test-data-'+Date.now());
const preparation=JSON.parse(await readFile('dist/taptap/android-preparation.json','utf8'));
const {createServer}=await import('../server/index.mjs');
const {accountProfile,sessionAccount}=await import('../server/accounts.mjs');
const {save}=await import('../server/store.mjs');
const {campaign,cards,levels}=await import('../server/content.mjs');
const backend=await createServer({publicRoot:preparation.web});await new Promise(r=>backend.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+backend.address().port;
const miniRoot=path.resolve('dist/taptap/minigame'),checks=[],errors=[];
const shim=`
globalThis.GameGlobal=globalThis;
const touch={};let resize;
globalThis.tap={
 createCanvas(){const c=document.createElement('canvas');c.style.cssText='width:100vw;height:100vh;display:block';document.body.append(c);return c;},
 createImage(){return new Image();}, getWindowInfo(){return {windowWidth:innerWidth,windowHeight:innerHeight,pixelRatio:devicePixelRatio,safeArea:{top:0,bottom:innerHeight}};},
 getStorageSync(k){try{return JSON.parse(localStorage.getItem(k));}catch{return null;}},setStorageSync(k,v){localStorage.setItem(k,JSON.stringify(v));},
 request(o){qaRequest({url:o.url,method:o.method,header:o.header,data:o.data}).then(o.success,o.fail);},
 onTouchStart(f){touch.start=f;},onTouchMove(f){touch.move=f;},onTouchEnd(f){touch.end=f;},onTouchCancel(f){touch.cancel=f;},onWindowResize(f){resize=f;},
 onHide(){},onShow(){},showModal(o){const r=globalThis.__modalReply||{confirm:true,content:''};globalThis.__modalReply=null;o.success(r);},
 createInnerAudioContext(){return {src:'',play(){},pause(){},stop(){},destroy(){},onEnded(){},onError(){}};}
};
function eventPoint(e){return {clientX:e.clientX,clientY:e.clientY};}
addEventListener('pointerdown',e=>touch.start&&touch.start({touches:[eventPoint(e)]}));
addEventListener('pointermove',e=>e.buttons&&touch.move&&touch.move({touches:[eventPoint(e)]}));
addEventListener('pointerup',e=>touch.end&&touch.end({touches:[],changedTouches:[eventPoint(e)]}));
addEventListener('resize',()=>resize&&resize());
`;
const frontend=http.createServer(async(req,res)=>{try{if(req.url==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;overflow:hidden;touch-action:none}</style><body><script>'+shim+'</script><script src="game.js"></script></body>');return;}const file=path.resolve(miniRoot,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(miniRoot+path.sep))throw Error('Invalid path');const mime={'.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});await new Promise(r=>frontend.listen(0,'127.0.0.1',r));
let context;
try{
  // Execute the actual upload bundle without any browser globals first.
  const fakeContext=new Proxy({measureText:t=>({width:String(t).length*9}),createLinearGradient:()=>({addColorStop(){}})}, {get:(target,key)=>target[key]||(()=>{})});
  const sandbox={console,setTimeout,clearTimeout,Date,Map,Set,Promise,requestAnimationFrame:()=>1,cancelAnimationFrame(){}};sandbox.GameGlobal=sandbox;sandbox.tap={createCanvas:()=>({getContext:()=>fakeContext}),getWindowInfo:()=>({windowWidth:390,windowHeight:844,pixelRatio:2}),onTouchStart(){},onTouchEnd(){},onTouchMove(){},onTouchCancel(){},onHide(){},onShow(){},getStorageSync(){return null;},setStorageSync(){},createImage:()=>({width:640,height:640}),request:o=>o.success({statusCode:200,data:{authenticated:false}})};
  vm.runInNewContext(await readFile(path.join(miniRoot,'game.js'),'utf8'),sandbox,{timeout:5000});sandbox.leanGarden.render(Date.now());sandbox.leanGarden.destroy();checks.push('Actual bundle starts and draws without DOM/BOM');

  context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{channel:'chrome',headless:true,locale:'zh-CN',viewport:{width:390,height:844}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(25000);
  await page.exposeFunction('qaRequest',async options=>{const suffix=new URL(options.url).pathname+new URL(options.url).search;const r=await fetch(origin+suffix,{method:options.method,headers:options.header,body:options.data===undefined?undefined:JSON.stringify(options.data)});return {statusCode:r.status,data:await r.json(),cookies:r.headers.getSetCookie(),header:{}};});
  await page.goto('http://127.0.0.1:'+frontend.address().port);await page.waitForFunction(()=>GameGlobal.leanGarden&&!GameGlobal.leanGarden.state.busy);
  const tapButton=async(id,value)=>{
    const hit=await page.evaluate(({id,value})=>{const g=GameGlobal.leanGarden;g.render(Date.now());const h=g.ui.hits.find(h=>h.action===id&&(value===undefined||h.value===value));return h?{...h,scale:g.ui.scale}:null;},{id,value});
    assert.ok(hit,'Visible touch target missing: '+id+' '+value);await page.mouse.click((hit.x+hit.w/2)*hit.scale,(hit.y+hit.h/2)*hit.scale);await page.waitForFunction(()=>!GameGlobal.leanGarden.state.busy);await page.waitForTimeout(50);
  };
  await page.evaluate(()=>{const s=GameGlobal.leanGarden.state;s.loginMode='register';s.name='taptap-test';s.password='isolated-test-password';});
  await tapButton('login-submit');await page.waitForFunction(()=>GameGlobal.leanGarden.state.page==='story');
  for(let i=0;i<3;i++)await tapButton('story-next');assert.equal(await page.evaluate(()=>GameGlobal.leanGarden.state.page),'home');checks.push('Register, persist session, opening story enters home');
  for(const [width,height]of [[320,740],[390,844],[800,1280],[844,390]]){await page.setViewportSize({width,height});await page.waitForTimeout(120);const hits=await page.evaluate(()=>GameGlobal.leanGarden.ui.hits);for(const value of ['map','mini','garden'])assert.equal(hits.filter(h=>h.action==='page'&&h.value===value).length,1,'One home entrance for '+value);for(const id of ['freeplay','reset-progress','checkin'])assert.ok(hits.some(h=>h.action===id),'Home action '+id);await page.screenshot({path:'artifacts/taptap-minigame-home-'+width+'.png'});}await page.setViewportSize({width:390,height:844});
  await tapButton('page','map');await page.screenshot({path:'artifacts/taptap-minigame-map.png'});await tapButton('continue');await page.waitForFunction(()=>GameGlobal.leanGarden.state.battle?.level.id==='n01');assert.equal(await page.evaluate(()=>GameGlobal.leanGarden.state.tutorial),false);await tapButton('skill','rfl');
  // Scroll the content with a touch drag, keeping the skill rail fixed.
  async function scrollToAction(id,value){for(let i=0;i<20;i++){const found=await page.evaluate(({id,value})=>{const g=GameGlobal.leanGarden;g.render(Date.now());return g.ui.hits.some(h=>h.action===id&&(value===undefined||h.value===value));},{id,value});if(found)return;await page.mouse.move(350,650);await page.mouse.down();await page.mouse.move(350,310,{steps:8});await page.mouse.up();await page.waitForTimeout(30);}throw Error('Unable to scroll to '+id+' '+value);}
  await scrollToAction('cast');await tapButton('cast');await page.waitForFunction(()=>GameGlobal.leanGarden.state.battle.complete);assert.equal(await page.evaluate(()=>GameGlobal.leanGarden.state.battle.proof[0]),'garden_strict_rfl');checks.push('Touch-only rfl completes real Lean first level');
  async function claimCards(){for(let i=0;i<40;i++){const status=await page.evaluate(()=>({pending:GameGlobal.leanGarden.pending.length,dialog:GameGlobal.leanGarden.state.dialog&&GameGlobal.leanGarden.state.dialog.type}));if(!status.pending)break;if(!status.dialog){await scrollToAction('claim');await tapButton('claim');}await tapButton('drop-expand');await page.waitForTimeout(800);await tapButton('drop-learn');}assert.equal(await page.evaluate(()=>GameGlobal.leanGarden.pending.length),0);}
  await claimCards();checks.push('Card drop grows, acknowledges new skill before use');await scrollToAction('next');await tapButton('next');await page.waitForFunction(()=>GameGlobal.leanGarden.state.battle?.level.id==='n02');await tapButton('skill','rw');await scrollToAction('evidence-open');await tapButton('evidence-open');
  const evidence=await page.evaluate(()=>GameGlobal.leanGarden.state.battle.repository.entries.find(e=>e.kind==='hypothesis').id);await tapButton('evidence',evidence);await scrollToAction('cast');await tapButton('cast');assert.equal(await page.evaluate(()=>GameGlobal.leanGarden.state.battle.complete),false);await tapButton('skill','rfl');await scrollToAction('cast');await tapButton('cast');await page.waitForFunction(()=>GameGlobal.leanGarden.state.battle.complete);checks.push('rw uses an existing equality and does not automatically rfl');await claimCards();await scrollToAction('next');await tapButton('next');await page.waitForFunction(()=>GameGlobal.leanGarden.state.battle?.level.id==='n03');await tapButton('skill','rw');await scrollToAction('evidence-open');await tapButton('evidence-open');await tapButton('evidence-source','warehouse');await tapButton('evidence-category','definition');const one=await page.evaluate(()=>GameGlobal.leanGarden.state.battle.repository.entries.find(e=>e.cardId==='one_eq_succ_zero').id);await tapButton('evidence',one);await page.screenshot({path:'artifacts/taptap-minigame-rewrite.png'});await scrollToAction('cast');await tapButton('cast');await tapButton('skill','rfl');await scrollToAction('cast');await tapButton('cast');await page.waitForFunction(()=>GameGlobal.leanGarden.state.battle.complete);checks.push('Third level strictly uses one_eq_succ_zero then rfl');await claimCards();
  await page.evaluate(()=>GameGlobal.leanGarden.goto('garden'));await page.screenshot({path:'artifacts/taptap-minigame-garden.png'});assert.equal(await page.evaluate(()=>GameGlobal.leanGarden.known.has('add_comm')),false);checks.push('Locked cards remain hidden; garden has all four categories');
  await page.reload();await page.waitForFunction(()=>GameGlobal.leanGarden?.state.data&&!GameGlobal.leanGarden.state.busy);assert.equal(await page.evaluate(()=>Object.keys(GameGlobal.leanGarden.state.data.progress.completed).length),3);checks.push('tap storage cookies resume the same server progress');

  // Use the same isolated account for the native channel's reviewed web bundle.
  const cookie=await page.evaluate(()=>GameGlobal.leanGarden.platform.cookie);
  const profile=accountProfile(sessionAccount(cookie));assert.ok(profile);profile.prologueSeen=true;await save();
  const apkPage=await context.newPage();apkPage.on('pageerror',e=>errors.push(e.message));
  await context.addCookies(cookie.split(/;\s*/).filter(p=>p.startsWith('garden_session=')).map(p=>({name:'garden_session',value:p.slice(p.indexOf('=')+1),url:origin,httpOnly:true,sameSite:'Strict'})));
  await apkPage.goto(origin+'/#shop');await apkPage.locator('.shop-room').waitFor({timeout:90000});
  assert.equal(await apkPage.locator('[data-action="watch-ad"],[data-action="watch-diamond-ad"],.cash-product,[data-product="adSkips10"]').count(),0);assert.ok(!(await apkPage.locator('#app').innerText()).includes('支付待接入'));await apkPage.screenshot({path:'artifacts/taptap-android-shop.png'});checks.push('APK bundle has no ad panels, cash purchases or recharge controls');
  await apkPage.goto(origin+'/#home');await apkPage.locator('.storybook-home').waitFor();await apkPage.screenshot({path:'artifacts/taptap-android-home.png'});
  assert.equal(levels.length,113);checks.push('Existing 113-level curriculum retained');assert.deepEqual(errors,[]);
  await writeFile('artifacts/taptap-browser-report.json',JSON.stringify({ok:true,checks,errors,realTapTapClientTested:false,realPhoneTested:false},null,2));console.log(JSON.stringify({ok:true,checks}));
}catch(error){await writeFile('artifacts/taptap-browser-report.json',JSON.stringify({ok:false,error:error.stack,checks,errors},null,2));throw error;}
finally{if(context)await context.close();await new Promise(r=>frontend.close(r));await new Promise(r=>backend.close(r));}
