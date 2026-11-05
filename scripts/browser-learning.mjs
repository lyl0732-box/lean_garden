import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','learning-ui-'+Date.now());
const {createServer}=await import('../server/index.mjs'),{getProfile,save}=await import('../server/store.mjs'),{campaign,unlocked}=await import('../server/content.mjs');
const server=await createServer();await new Promise(r=>server.listen(3211,'127.0.0.1',r));
const context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{headless:true,channel:'chrome',viewport:{width:390,height:844}});
const page=await context.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
const base='http://127.0.0.1:3211',action=id=>page.locator(`[data-action="${id}"]`),idle=()=>page.waitForFunction(()=>!document.querySelector('#scene-transition')&&!document.querySelector('.verifying'));
const record=text=>{checks.push(text);console.log(text);};
async function fixture(id){const cookies=await context.cookies(base),{profile}=getProfile(cookies.map(c=>c.name+'='+c.value).join('; '));profile.completed=Object.fromEntries(campaign.slice(0,campaign.findIndex(l=>l.id===id)).map(l=>[l.id,{proofVersion:4,stars:3,steps:[]}]));profile.introduced=[...unlocked(profile)];profile.topicsLearned=['successor','addition','multiplication','exponentiation'];profile.attempts={};profile.lastLevel=id;await save();await page.goto(base+'/#adventure/'+id[0]);await page.locator('.level-map').waitFor();await page.locator(`[data-action="level"][data-level="${id}"]`).click();await page.locator('.battle-layout').waitFor();await idle();}
async function post(route,body){return page.evaluate(async({route,body})=>{const r=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};},{route,body});}
async function hint(){const response=page.waitForResponse(r=>r.url().endsWith('/api/level/hint'));await action('hint').last().click();const result=await(await response).json();await page.locator('.hint-modal').waitFor();return result;}
async function step(button){const response=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));await button.click();const r=await response,b=await r.json();assert.equal(r.status(),200);assert.ok(!b.rejected,JSON.stringify(b));await idle();return b;}
try{
  await page.goto(base);await page.locator('.home-title').waitFor();await fixture('n03');
  assert.ok(page.url().endsWith('#battle/n03'));
  const h1=await hint();assert.equal(h1.suggestion,null);const h2=await hint();assert.equal(h2.suggestion.skill,'rw');assert.ok((await page.locator('.hint-steps').innerText()).includes('定义'));
  await page.screenshot({path:'artifacts/learning-hint-mobile.png',fullPage:true,animations:'disabled'});
  await action('prepare-hint').click();await page.locator('[data-action="confirm-rewrite"]:enabled').waitFor();
  assert.equal(await page.locator('[data-testid="goal"]').innerText(),'succ 0 = 1');
  assert.equal(await page.locator('.battle-steps').innerText(),'0 步');
  let b=await step(action('confirm-rewrite'));assert.equal(b.goals[0].target,'succ 0 = succ 0');
  await page.reload();await page.locator('.battle-layout').waitFor();await idle();assert.equal(await page.locator('[data-testid="goal"]').innerText(),'succ 0 = succ 0');assert.equal(await page.locator('.battle-steps').innerText(),'1 步');
  await page.goBack();await page.locator('.level-map').waitFor();await idle();assert.ok(page.url().endsWith('#adventure/n'));await page.goForward();await page.locator('.battle-layout').waitFor();await idle();assert.equal(await page.locator('.battle-steps').innerText(),'1 步');
  const prior=await post('level/start',{level:'n03'});await action('notation').click();assert.ok((await page.locator('.symbol-guide').innerText()).includes('下一个自然数'));await action('close-modal').first().click();const after=await post('level/start',{level:'n03'});assert.equal(after.data.attempt.hints,prior.data.attempt.hints);assert.equal(after.data.attempt.revision,prior.data.attempt.revision);
  record('rw hint prepares parameters without moving; reload and browser back/forward preserve actual proof; notation is free.');
  await fixture('n07');await hint();const induction=await hint();assert.equal(induction.suggestion.variable,'n');await action('prepare-hint').click();assert.equal(await page.locator('[data-control="variable"]').inputValue(),'n');b=await step(action('confirm-induction'));assert.equal(b.goals.length,2);
  assert.ok((await page.locator('.branch-tabs').innerText()).includes('起点'));await page.locator('[data-branch="1"]').click();assert.ok((await page.locator('.branch-preview').innerText()).includes('ih'));await action('close-modal').first().click();assert.equal(await page.locator('[data-testid="goal"]').innerText(),'0 + 0 = 0');
  await page.screenshot({path:'artifacts/learning-induction-mobile.png',fullPage:true});const baseHint=await hint();assert.equal(baseHint.suggestion.skill,'rw');assert.equal(baseHint.suggestion.category,'definition');await action('prepare-hint').click();await page.locator('[data-action="confirm-rewrite"]:enabled').waitFor();b=await step(action('confirm-rewrite'));assert.equal(await page.locator('[data-testid="goal"]').innerText(),'0 = 0');
  const rfl=await hint();assert.equal(rfl.suggestion.skill,'rfl');await action('prepare-hint').click();assert.equal(await page.locator('.battle-steps').innerText(),'2 步');b=await step(action('confirm-action'));assert.equal(b.goals.length,1);assert.match(await page.locator('.branch-guide').innerText(),/ih/);
  record('Induction branch names and read-only previews work; hints guide base rewrite then explicit rfl.');
  await fixture('n09');await hint();assert.equal((await hint()).suggestion.skill,'apply');await action('prepare-hint').click();assert.equal(await page.locator('.battle-steps').innerText(),'0 步');b=await step(action('confirm-apply'));assert.equal(b.proof[0],'garden_nat_apply Nat.succ.inj');assert.equal(b.complete,false);assert.equal((await hint()).suggestion.source,'hypothesis');await action('prepare-hint').click();b=await step(action('confirm-apply'));assert.equal(b.complete,true);assert.equal(b.progress.completed.n09.stars,1);
  record('apply hint selects the unlocked axiom, then an existing hypothesis; only confirmation executes.');
  await fixture('a16');await page.locator('[data-skill="have"]').click();assert.ok((await page.locator('[data-control="action"]').innerText()).includes('平均斜率'));await action('lesson-cards').click();assert.ok((await page.locator('.modal').innerText()).includes('定义'));assert.ok((await page.locator('.modal').innerText()).includes('定理'));await action('close-modal').first().click();
  await action('leave').click();await page.locator('.level-map').waitFor();await idle();await page.reload();await page.locator('.map-panel.a').waitFor();assert.equal(await page.locator('.chapter-tab.active').getAttribute('data-chapter'),'a');await page.locator('nav [data-page="home"]').click();await page.locator('.home-title').waitFor();await idle();await action('start-next').click();await page.locator('.battle-layout').waitFor();await idle();assert.ok(page.url().endsWith('#battle/a16'));
  for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  record('Advanced buttons are readable; pocket collection includes owned definitions and theorems; chapter and unfinished adventure resume; 320/390/1440 layouts fit.');
  // A failed navigation must not leave the whole game busy.
  await page.route('**/api/bootstrap',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'test offline'})}));await action('leave').click();await idle();assert.equal(await page.locator('.battle-layout').count(),1);await page.unroute('**/api/bootstrap');await action('leave').click();await page.locator('.level-map').waitFor();await idle();record('Navigation failure leaves the current screen usable and can be retried.');
  assert.deepEqual(errors,[]);await writeFile('artifacts/learning-ui-report.json',JSON.stringify({date:new Date().toISOString(),checks,errors},null,2));
}finally{await context.close();await new Promise(r=>server.close(r));}
