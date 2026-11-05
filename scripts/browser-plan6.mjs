import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','browser-plan6-'+Date.now());
const {createServer}=await import('../server/index.mjs');const server=await createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
let context;const errors=[],checks=[];const record=x=>{checks.push(x);console.log(x);};
try{
  context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{channel:'chrome',headless:true,viewport:{width:800,height:1280},isMobile:true,hasTouch:true,locale:'zh-CN',userAgent:'Mozilla/5.0 (Linux; Android 14; Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 LeanGarden/0.10.0'});
  const page=await context.newPage();await page.bringToFront();page.setDefaultTimeout(40000);page.on('pageerror',e=>errors.push(e.message));
  const click=action=>page.locator(`[data-action="${action}"]`).first().click();
  const api=(route,body)=>page.evaluate(async({route,body})=>{const r=await fetch('/api/'+route,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};},{route,body});
  await page.goto(base);await page.locator('[data-action="story-skip"]').waitFor();await click('story-skip');await page.locator('.home-title').waitFor();
  for(const [width,height]of [[800,1280],[1280,800],[600,960],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(150);
    const layout=await page.locator('.mini-door strong').evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);const r=el.getBoundingClientRect();return {lines:range.getClientRects().length,scroll:document.documentElement.scrollHeight,viewport:innerHeight,text:el.textContent,width:r.width,textWidth:range.getBoundingClientRect().width,store:document.querySelector('.home-shop').getBoundingClientRect().toJSON()};});
    assert.equal(layout.lines,1,JSON.stringify(layout));assert.ok(layout.textWidth<=layout.width+1,JSON.stringify(layout));assert.ok(layout.scroll<=height,JSON.stringify(layout));
    assert.ok(layout.store.bottom<=height&&layout.store.right<=width,JSON.stringify(layout));
    await page.screenshot({path:`artifacts/plan6-home-${width}x${height}.png`});
  }
  record('Tablet/phone native layouts in both orientations: all six title characters stay on one line; home stays fixed and shop is visible.');
  await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('#fullscreen-toggle').count(),0);
  await click('shop');await page.locator('.shop-modal').waitFor();assert.equal(await page.locator('[data-action="buy-product"]:disabled').count(),3);assert.match(await page.locator('.shop-beta-note').innerText(),/仅展示价格/);
  await click('claim-beta');await page.waitForFunction(()=>document.querySelector('[data-action="claim-beta"]')?.disabled);assert.equal((await api('economy')).data.economy.adSkips,10);assert.equal(await page.locator('[data-action="claim-beta"]').isDisabled(),true);
  await page.screenshot({path:'artifacts/plan6-shop-mobile.png'});await click('close-modal');await click('growth');await page.locator('.growth-modal').waitFor();await page.screenshot({path:'artifacts/plan6-growth-mobile.png'});await click('close-modal');
  record('Store shows prices with purchases disabled; beta vouchers can be claimed once, and growth preview is available on mobile.');
  await page.goto(base+'/#battle/n01');await page.locator('.tutorial-help-button').waitFor();assert.equal((await api('economy')).data.economy.energy,45);assert.equal(await page.locator('body.guided-lesson').count(),0);
  await click('hint');await page.locator('.hint-modal').waitFor();assert.equal((await api('economy')).data.economy.hints,4);await click('close-modal');
  await click('answer');await page.locator('.answer-confirm').waitFor();assert.match(await page.locator('.answer-confirm').innerText(),/当前有 0 张/);await click('close-modal');
  const done=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));await page.locator('[data-skill="rfl"]').click();assert.equal((await(await done).json()).experience.after,2);
  let boot=(await api('bootstrap')).data;for(const card of boot.pendingCards)await api('cards/learn',{card});
  await page.goto(base+'/?qa=levelup#home');await page.locator('.home-growth').waitFor();assert.match(await page.locator('.home-growth').innerText(),/Lv.2/);await page.screenshot({path:'artifacts/plan6-growth-level2.png'});
  record('A real Lean proof consumes 5 energy, a hint consumes one of the initial five uses, zero answer packs stay locked, and a clear visibly grows Yaya to level 2.');
  for(let i=0;i<9;i++){
    let b=(await api('level/start',{level:'n01'})).data;b=(await api('level/reset',{level:'n01',revision:b.attempt.revision})).data;assert.equal(b.progress.economy.energy,40-i*5);
    b=(await api('level/step',{level:'n01',revision:b.attempt.revision,action:'rfl'})).data;assert.equal(b.complete,true);
  }
  await page.goto(base+'/#battle/n02');await page.locator('.energy-modal').waitFor();assert.match(await page.locator('.energy-orb').innerText(),/0/);await click('refill-energy');await page.waitForFunction(()=>document.querySelector('.energy-orb b')?.textContent==='50/50');assert.equal((await api('economy')).data.economy.adSkips,9);
  await page.screenshot({path:'artifacts/plan6-energy-refill.png'});await click('close-modal');await page.goto(base+'/#battle/n02');await page.locator('.tutorial-help-button').waitFor();assert.equal((await api('economy')).data.economy.energy,45);
  record('After ten paid runs energy reaches zero, a new level opens the recovery panel, and one beta voucher restores 50 energy without pretending an ad ran.');
  assert.deepEqual(errors,[]);await writeFile('artifacts/browser-plan6-report.json',JSON.stringify({date:new Date().toISOString(),checks,errors,physicalAndroidTested:false},null,2));
}catch(error){await context?.pages().at(-1)?.screenshot({path:'artifacts/plan6-failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{await context?.close();await new Promise(r=>server.close(r));}
