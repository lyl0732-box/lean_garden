import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','browser-plan7-'+Date.now());
const {createServer}=await import('../server/index.mjs');const {sessionAccount,accountProfile}=await import('../server/accounts.mjs');const {save}=await import('../server/store.mjs');const {creditDiamonds}=await import('../server/economy.mjs');
const server=await createServer({publicRoot:process.env.GARDEN_PUBLIC_ROOT||'public'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
let context,page;const checks=[],errors=[];const record=x=>{checks.push(x);console.log(x);};
try{
  context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{channel:'chrome',headless:true,viewport:{width:1280,height:800},locale:'zh-CN'});
  page=await context.newPage();await page.bringToFront();page.setDefaultTimeout(35000);page.on('pageerror',e=>errors.push(e.message));
  const click=action=>page.locator(`[data-action="${action}"]`).first().click();
  const api=(route,body)=>page.evaluate(async({route,body})=>{const r=await fetch('/api/'+route,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};},{route,body});
  await page.goto(base);await page.locator('.account-form').waitFor();assert.equal((await api('bootstrap')).status,401);
  await page.locator('[data-auth-mode="register"]').click();await page.locator('[name=username]').fill('汉'.repeat(11));assert.match(await page.locator('[data-name-bytes]').innerText(),/33/);
  await page.locator('[name=username]').fill('浏览器测试');await page.locator('[name=password]').fill('browser-test-11');await page.locator('[name=recoveryHint]').fill('小小花园');await page.locator('.account-form [type=submit]').click();
  await page.locator('[data-action="story-skip"]').waitFor();await click('story-skip');await page.locator('.hero-yaya').waitFor();
  record('Web starts at login; registration enforces UTF-8 bytes and stores the optional recovery hint.');
  for(const [width,height]of [[1280,800],[800,1280],[600,960],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(180);
    const layout=await page.evaluate(()=>{const rect=q=>document.querySelector(q)?.getBoundingClientRect().toJSON();return {scroll:document.documentElement.scrollHeight,viewport:innerHeight,width:document.documentElement.scrollWidth,hero:rect('.hero-yaya>.yaya-form'),doors:rect('.home-doors'),shop:rect('.home-shop'),buttons:[...document.querySelectorAll('.home-toolbar .home-tool,.home-toolbar #fullscreen-toggle')].map(b=>b.getBoundingClientRect().toJSON())};});
    assert.ok(layout.scroll<=height&&layout.width<=width,JSON.stringify(layout));assert.ok(layout.hero.width>=145&&layout.hero.left<layout.doors.left,JSON.stringify(layout));assert.ok(layout.shop.bottom<=height&&layout.shop.right<=width,JSON.stringify(layout));
    for(const b of layout.buttons){assert.ok(Math.round(b.width)>=Math.round(layout.buttons[0].width));assert.equal(Math.round(b.height),Math.round(layout.buttons[0].height));assert.ok(Math.abs(b.y-layout.buttons[0].y)<2);}
    assert.equal(await page.locator('.hero-yaya img').count(),1);assert.equal(await page.locator('[data-action="growth"]').count(),0);
    await page.screenshot({path:`artifacts/plan7-home-${width}x${height}.png`});
  }
  record('Five desktop/tablet/phone layouts: home fixed, current Yaya large on the left, no future preview, toolbar sizes and alignment match.');
  await page.setViewportSize({width:390,height:844});const music=await page.locator('[data-action=music]').getAttribute('aria-pressed');await click('music');assert.notEqual(await page.locator('[data-action=music]').getAttribute('aria-pressed'),music);assert.match(await page.locator('[data-action=music]').innerText(),/音乐[开关]/);
  await click('settings');assert.equal(await page.locator('.modal').evaluate(el=>getComputedStyle(el).scrollbarWidth),'none');await page.locator('[data-setting-quality]').selectOption('low');await page.locator('[data-setting-quality]').selectOption('high');await click('close-modal');
  await click('shop');await page.locator('.shop-room').waitFor();assert.match(page.url(),/#shop$/);const cash=page.locator('.cash-product');assert.match(await cash.innerText(),/2/);assert.match(await cash.innerText(),/现金/);assert.equal(await cash.locator('button').isDisabled(),true);assert.equal(await cash.locator('.gem-icon').count(),0);
  await click('claim-beta');await page.waitForFunction(()=>document.querySelector('[data-action="claim-beta"]')?.disabled);assert.equal((await api('economy')).data.economy.adSkips,3);
  await click('claim-trial');await page.waitForFunction(()=>document.querySelector('[data-action="claim-trial"]')?.disabled);assert.equal((await api('economy')).data.economy.freeplayRemainingMs,600000);assert.equal((await api('shop/claim-trial',{})).status,409);
  await page.waitForTimeout(700);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'artifacts/plan7-shop-mobile.png',fullPage:true});
  record('Standalone shop: 3 free vouchers and one 10-minute selection gift; vouchers are cash-only ¥2/10, with payment pending and no diamond exchange.');
  const cookie=(await context.cookies(base)).map(c=>c.name+'='+c.value).join('; '),owner=accountProfile(sessionAccount(cookie));
  creditDiamonds(owner,400,'browser-earned-fixture');await save();await page.reload();await page.locator('.shop-room').waitFor();await page.locator('[data-product=answer1]').click();await click('purchase-now');await page.locator('.purchase-modal').waitFor({state:'detached'});assert.equal((await api('economy')).data.economy.diamonds,300);assert.equal(owner.economy.answers,1);
  await page.locator('[data-product=freeplay10]').click();await click('purchase-now');await page.locator('.purchase-modal').waitFor({state:'detached'});assert.equal(owner.economy.diamonds,100);assert.equal(owner.economy.freeplayMs,1200000);
  const noCash=await api('shop/purchase',{product:'adSkips10',key:'browser-cash-not-gems-1'});assert.equal(noCash.status,501);assert.equal(owner.economy.diamonds,100);
  await page.goto(base+'/#home');await page.locator('.hero-yaya').waitFor();await click('freeplay');await page.locator('.map-mode-bar').waitFor();assert.equal((await api('economy')).data.economy.freeplayActive,true);await new Promise(r=>setTimeout(r,1100));await click('freeplay');assert.ok(owner.economy.freeplayMs<1200000);assert.equal(owner.freePlay,false);
  record('Earned diamond balance buys answers and selection time; cash vouchers never debit diamonds; selection time counts down and pauses when switched off.');
  await page.goto(base+'/#battle/n01');await page.locator('.tutorial-help-button').waitFor();assert.equal(await page.locator('body.guided-lesson').count(),0);const step=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));await page.locator('[data-skill=rfl]').click();assert.equal((await(await step).json()).complete,true);
  const boot=(await api('bootstrap')).data;for(const card of boot.pendingCards)await api('cards/learn',{card});owner.economy.garden.nextAt=Date.now()-1000;await save();
  await page.goto(base+'/?qa=garden#garden');await page.locator('.quiz-bubble').first().waitFor();const q=owner.economy.garden.questions.find(q=>q.cardId==='rfl');assert.ok(q);const publicQuestion=(await api('garden/quiz?id='+q.id)).data.question;assert.equal('correct'in publicQuestion,false);
  await page.locator(`[data-quiz="${q.id}"]`).click({force:true});await page.locator('.quiz-modal').waitFor();await page.locator(`[data-quiz-choice][value="${q.correct}"]`).check({force:true});const balance=owner.economy.diamonds;await click('quiz-answer');await page.locator('.quiz-earned').waitFor();assert.equal(owner.economy.diamonds,balance+q.reward);assert.equal((await api('garden/answer',{id:q.id,choice:q.correct})).data.result.duplicate,true);assert.equal(owner.economy.diamonds,balance+q.reward);
  await page.waitForTimeout(500);await page.screenshot({path:'artifacts/plan7-quiz-mobile.png'});await click('close-modal');
  record('A real Lean proof still works. An owned garden card asks a single-choice question after the 5-hour trigger; correct answer rewards diamonds exactly once.');
  await page.goto(base+'/#home');await page.locator('.hero-yaya').waitFor();await click('exit-game');await click('exit-now');await page.locator('.account-form').waitFor();assert.equal((await api('bootstrap')).status,401);await page.locator('[name=username]').fill('浏览器测试');await page.locator('[data-auth-mode=hint]').click();await page.locator('.account-form [type=submit]').click();await page.waitForFunction(()=>document.querySelector('.account-error')?.textContent==='小小花园');
  await page.locator('[data-auth-mode=login]').click();await page.locator('[name=password]').fill('browser-test-11');await page.locator('.account-form [type=submit]').click();await page.locator('.hero-yaya').waitFor();assert.equal((await api('bootstrap')).data.progress.completed.n01.stars,3);
  record('Exit logs out, recovery hint is available, and logging back in restores the same proof progress.');
  assert.deepEqual(errors,[]);await writeFile('artifacts/browser-plan7-report.json',JSON.stringify({date:new Date().toISOString(),checks,errors,physicalAndroidTested:false},null,2));
}catch(error){await page?.screenshot({path:'artifacts/plan7-failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{await context?.close();await new Promise(r=>server.close(r));}
