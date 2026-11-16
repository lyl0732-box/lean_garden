import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts/taptap-selector-data-'+Date.now());
const {createServer}=await import('../server/index.mjs');
const {sessionAccount,accountProfile}=await import('../server/accounts.mjs');
const {campaign,cards,unlocked}=await import('../server/content.mjs');
const {save}=await import('../server/store.mjs');
const {Presence}=await import('../server/presence.mjs');
const presence=new Presence(),server=await createServer({presence});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,checks=[],requests=[],badRequests=[];
let game;
try{
  const auth=await fetch(origin+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'tap-selectors',password:'isolated-test-password'})});assert.equal(auth.status,200);
  const cookie=auth.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '),owner=accountProfile(sessionAccount(cookie));assert.ok(owner);
  const store=new Map([['lean-garden-session',cookie]]),touch={},canvasContext=new Proxy({measureText:t=>({width:String(t).length*9}),createLinearGradient:()=>({addColorStop(){}})}, {get:(target,key)=>target[key]||(()=>{})});
  const box={console,setTimeout,clearTimeout,Date,Map,Set,Promise,requestAnimationFrame:()=>1,cancelAnimationFrame(){}};box.GameGlobal=box;
  box.tap={createCanvas:()=>({getContext:()=>canvasContext}),getWindowInfo:()=>({windowWidth:390,windowHeight:844,pixelRatio:2}),onTouchStart:f=>touch.start=f,onTouchEnd:f=>touch.end=f,onTouchMove:f=>touch.move=f,onTouchCancel(){},onHide(){},onShow(){},getStorageSync:k=>store.get(k),setStorageSync:(k,v)=>store.set(k,v),createImage:()=>({width:640,height:640}),showModal:o=>o.success({confirm:true}),request:o=>{const url=new URL(o.url);requests.push(url.pathname);fetch(origin+url.pathname+url.search,{method:o.method,headers:o.header,body:o.data===undefined?undefined:JSON.stringify(o.data)}).then(async r=>{if(r.status>=400)badRequests.push({path:url.pathname,status:r.status});o.success({statusCode:r.status,data:await r.json(),cookies:r.headers.getSetCookie()});}).catch(o.fail);}};
  vm.runInNewContext(await readFile('dist/taptap/minigame/game.js','utf8'),box);game=box.leanGarden;
  while(game.state.busy)await new Promise(r=>setTimeout(r,10));
  async function seedBefore(id){owner.completed=Object.fromEntries(campaign.slice(0,campaign.findIndex(l=>l.id===id)).map(l=>[l.id,{stars:3,proofVersion:4,steps:[],proof:[]} ]));owner.introduced=cards.map(c=>c.id);owner.topicsLearned=[...new Set(campaign.flatMap(l=>l.discoveries||[]))];owner.economy.energy=50;owner.economy.energyAt=Date.now();owner.prologueSeen=true;await save();await game.refresh();}
  function visible(id,value){for(let i=0;i<30;i++){game.render(Date.now());const hit=game.ui.hits.find(h=>h.action===id&&(value===undefined||h.value===value));if(hit)return hit;game.ui.scroll=Math.min(game.ui.maxScroll,game.ui.scroll+180);}throw Error('No selectable UI control: '+id+' '+value);}
  async function press(id,value){const h=visible(id,value);const point={clientX:(h.x+h.w/2)*game.ui.scale,clientY:(h.y+h.h/2)*game.ui.scale};touch.start({touches:[point]});touch.end({changedTouches:[point],touches:[]});while(game.state.busy)await new Promise(r=>setTimeout(r,15));await new Promise(r=>setTimeout(r,0));}
  await seedBefore('n07');await game.startLevel('n07');await press('skill','induction');assert.equal(game.state.selection.variable,'');await press('variable','n');await press('cast');assert.equal(game.state.battle.goals.length,2);assert.equal(game.state.battle.attempt.steps[0].kind,'induction');checks.push('Induction requires selecting n, then Lean produces base and successor branches');
  await seedBefore('l10');await game.startLevel('l10');await press('skill','use');await press('witness-key','0');await press('cast');assert.equal(game.state.battle.attempt.steps[0].kind,'witness');assert.equal(game.state.battle.attempt.steps[0].expression,'0');checks.push('Existential witness is constructed with buttons and verified by Lean');
  await seedBefore('n03');await game.startLevel('n03');await press('skill','rw');await press('evidence-open');await press('evidence-source','warehouse');await press('evidence-category','definition');const entry=game.state.battle.repository.entries.find(e=>e.cardId==='one_eq_succ_zero');await press('evidence',entry.id);await press('rewrite-mode','nth');assert.ok(game.state.selection.matches.length);await press('direction','backward');assert.equal(game.state.selection.direction,'backward');await press('direction','forward');await press('cast');assert.equal(game.state.battle.attempt.steps[0].mode,'nth');checks.push('Direction radios and occurrence selection use actual rewrite-preview and nth rewrite APIs');
  assert.ok(!requests.some(p=>/\/ads\//.test(p)));checks.push('No legacy advertising endpoints are called');
  assert.deepEqual(badRequests,[]);assert.ok(presence.online().has(sessionAccount(cookie).id));checks.push('Mini-game heartbeat is accepted by the existing online-user monitor');
  await writeFile('artifacts/taptap-selector-report.json',JSON.stringify({ok:true,checks,productionDataChanged:false},null,2));console.log(JSON.stringify({ok:true,checks}));
}catch(error){await writeFile('artifacts/taptap-selector-report.json',JSON.stringify({ok:false,error:error.stack,checks},null,2));throw error;}
finally{if(game)game.destroy();await new Promise(r=>server.close(r));}
