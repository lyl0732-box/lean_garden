import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {writeFile} from 'node:fs/promises';

process.env.GARDEN_DATA_DIR=path.resolve('artifacts','plan10-browser-'+Date.now());
const {createServer}=await import('../server/index.mjs');
const {save}=await import('../server/store.mjs');
const {sessionAccount,accountProfile}=await import('../server/accounts.mjs');
const {threshold}=await import('../server/economy.mjs');
const server=await createServer();
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,checks=[],errors=[];
let context,page;
try{
  context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{channel:'chrome',headless:true,locale:'zh-CN',viewport:{width:390,height:844}});
  page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
  const r=await context.request.post(base+'/api/auth/register',{data:{username:'plan10-browser',password:'isolated-test-password',remember:false}});
  assert.equal(r.status(),200);
  const owner=accountProfile(sessionAccount(r.headers()['set-cookie']));owner.prologueSeen=true;await save();
  await page.addInitScript(()=>{localStorage.setItem('garden-motion','on');localStorage.setItem('garden-sound','off');localStorage.setItem('garden-music','off');});
  async function visit(hash){await page.goto(base+'/?qa='+Date.now()+'#'+hash);await page.locator('.storybook-home,.battle-shell,.room-navigation').waitFor({timeout:60000});}
  const sizes=[[320,740],[360,800],[390,844],[412,915],[844,390],[800,1280],[1280,800],[1920,1080]];
  for(const native of [false,true]){
    await context.addInitScript(native=>{
      if(native){Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/134.0.0.0 Mobile Safari/537.36 LeanGarden/0.13.1 LeanGardenAndroid/1'});document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.setProperty('--native-safe-top','28px'));}
    },native);
    for(const room of ['garden','mini']){
      await visit(room);
      for(const [width,height] of sizes){
        await page.setViewportSize({width,height});await page.waitForTimeout(80);
        const layout=await page.evaluate(()=>{
          const box=e=>({...e.getBoundingClientRect().toJSON(),name:e.getAttribute('aria-label')||e.textContent});
          return {width:document.documentElement.scrollWidth,brand:document.querySelectorAll('.room-topbar .mobile-brand').length,items:[...document.querySelectorAll('.room-resources>*,.room-actions>*')].filter(e=>e.offsetWidth).map(box),header:box(document.querySelector('.room-topbar')),nav:box(document.querySelector('.room-navigation'))};
        });
        assert.ok(layout.width<=width,JSON.stringify({native,room,width,layout}));assert.equal(layout.brand,0);
        for(const b of layout.items){assert.ok(b.width>0&&b.height>0&&b.x>=0&&b.right<=width+1&&b.y>=layout.nav.bottom&&b.bottom<=layout.header.bottom+1,JSON.stringify({native,room,width,b}));}
        for(let i=0;i<layout.items.length;i++)for(let j=i+1;j<layout.items.length;j++){
          const a=layout.items[i],b=layout.items[j];assert.ok(Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1,JSON.stringify({native,room,width,a,b}));
        }
        if(width===390)await page.screenshot({path:`artifacts/plan10-${native?'android':'web'}-${room}.png`});
      }
    }
  }
  checks.push('Garden and minigame resources/actions do not overlap at eight viewport sizes, on web and simulated Android with a 28px cutout.');
  // Exercise larger balances as well as the regular and administrator display.
  owner.economy.diamonds=999999999;await save();await visit('garden');await page.setViewportSize({width:320,height:740});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('.room-actions [data-action=settings]').click();await page.locator('.modal-close').click();
  await page.locator('.room-resources [data-action=energy]').click();await page.locator('.modal-close').click();
  checks.push('Large balances stay on screen at 320px; resource and settings buttons remain usable.');
  await page.setViewportSize({width:1280,height:800});
  const forms=await page.evaluate(async()=>{
    const {forms}=await import('/yaya-forms.js'),{wizard}=await import('/spell-flow.js'),{wands}=await import('/wands.js');
    const preview=document.createElement('div');preview.id='wand-review';preview.style.cssText='position:fixed;inset:0;background:#f5f0dd;z-index:30000;display:grid;grid-template-columns:repeat(4,1fr);gap:15px;padding:24px;overflow:auto';
    preview.innerHTML=forms.map(f=>`<div style="text-align:center"><div style="width:190px;margin:auto">${wizard(f.level)}</div><b>Lv.${f.level} · ${wands[forms.indexOf(f)].name}</b></div>`).join('');document.body.append(preview);
    return {count:preview.querySelectorAll('.wand-art').length,distinct:new Set([...preview.querySelectorAll('.wand-art')].map(e=>e.innerHTML)).size,thresholds:forms.map(f=>f.level),names:[...preview.querySelectorAll('.evolved-wand')].map(e=>e.dataset.wand),powers:[...preview.querySelectorAll('.evolved-wizard')].map(e=>Number(e.style.getPropertyValue('--spell-power')))};
  });
  assert.equal(forms.count,8);assert.equal(forms.distinct,8);assert.equal(new Set(forms.names).size,8);
  assert.ok(forms.powers.every((p,i)=>!i||p>forms.powers[i-1]));
  await page.waitForFunction(()=>[...document.querySelectorAll('#wand-review img')].every(i=>i.complete&&i.naturalWidth));
  await page.screenshot({path:'artifacts/plan10-wands.png'});
  await page.locator('#wand-review').evaluate(e=>e.remove());
  for(const level of [1,22]){
    if(level===22&&!owner.introduced.includes('rw'))owner.introduced.push('rw');
    owner.economy.xp=threshold(level);await save();await visit('battle/n01');await page.locator('.proof-arena').waitFor({timeout:60000});
    if(await page.locator('[data-action=restart]').count()){await page.locator('[data-action=restart]').click();await page.locator('[data-action=restart-now]').click();}
    await page.locator('[data-testid=goal]').waitFor({timeout:60000});
    await page.locator('[data-skill=rfl]').click();
    await page.locator('.spell-stage .wand-art').waitFor({state:'attached'});
    const beam=await page.evaluate(()=>{
      const wand=document.querySelector('.spell-stage .wand-art'),tip=document.querySelector('.spell-stage .wand-tip');
      const p=wand.createSVGPoint();p.x=40;p.y=16;const a=p.matrixTransform(wand.getScreenCTM()),b=tip.getBoundingClientRect();
      return {stage:Number(wand.dataset.wandStage),distance:Math.hypot(a.x-b.x-b.width/2,a.y-b.y-b.height/2)};
    });
    assert.equal(beam.stage,level===1?1:8);assert.ok(beam.distance<1,JSON.stringify(beam));
    await page.locator('.spell-stage').waitFor({state:'detached'});
    await page.locator('.proof-complete').waitFor({timeout:45000});
  }
  checks.push('Eight distinct progressive wands use the existing evolution thresholds; novice and sage casts keep their beam attached and finish level 1 with real Lean.');
  assert.deepEqual(errors,[]);
  await writeFile('artifacts/plan10-browser-report.json',JSON.stringify({date:new Date().toISOString(),checks,forms,errors,realPhoneTested:false,realAdPlaybackTested:false},null,2));console.log(checks);
}catch(error){await page?.screenshot({path:'artifacts/plan10-browser-failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{await context?.close();await new Promise(r=>server.close(r));}
