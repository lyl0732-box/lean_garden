import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';

process.env.GARDEN_DATA_DIR=path.resolve('artifacts','prologue-v06-'+Date.now());
const {createServer}=await import('../server/index.mjs');
const server=await createServer();await new Promise(r=>server.listen(3211,'127.0.0.1',r));
const context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{headless:true,channel:'chrome',viewport:{width:390,height:844}});
const page=await context.newPage();page.setDefaultTimeout(20000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const action=id=>page.locator(`[data-action="${id}"]`);
const local='http://127.0.0.1:3211',live='http://localhost:3210';
const previousLiveCookies=(await context.cookies(live)).filter(c=>c.name==='garden_profile');
async function lastPage(){await action('story-next').click();await action('story-next').click();}
async function replay(){await page.locator('[data-action="settings"]').first().click();await action('story-replay').click();}
const checks=[];
try{
  await page.goto(local);await lastPage();
  let finish=page.waitForResponse(r=>r.url().endsWith('/api/onboarding/seen'));
  await action('story-finish').click();await page.locator('.home-title').waitFor();assert.equal((await finish).status(),200);
  await page.reload();await page.locator('.home-title').waitFor();assert.equal(await page.locator('.prologue-screen').count(),0);
  checks.push('Finishing all three story pages saves completion and stays dismissed after reload.');

  await replay();await lastPage();
  await page.route('**/api/onboarding/seen',r=>r.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'Old backend endpoint missing'})}));
  await action('story-finish').click();await page.locator('.home-title').waitFor();
  await page.locator('#toast.visible').filter({hasText:'暂未保存'}).waitFor();
  assert.equal(await page.locator('.prologue-screen').count(),0);await page.unroute('**/api/onboarding/seen');
  checks.push('A missing endpoint no longer traps the final page; a visible save notice appears on the home screen.');

  await replay();let release;const blocked=new Promise(r=>{release=r;});
  await page.route('**/api/onboarding/seen',async route=>{await blocked;await route.continue();});
  finish=page.waitForResponse(r=>r.url().endsWith('/api/onboarding/seen'));
  await action('story-skip').click();await page.locator('.home-title').waitFor({timeout:1500});
  release();assert.equal((await finish).status(),200);await page.unroute('**/api/onboarding/seen');
  checks.push('Skipping a story returns home before a deliberately stalled save request completes.');

  // A fresh QA profile only; never reset or play on an existing player's save.
  const response=await fetch(live+'/api/bootstrap');
  const cookie=response.headers.get('set-cookie').split(';')[0].split('=');
  await context.addCookies([{name:cookie[0],value:cookie[1],url:live,httpOnly:true,sameSite:'Strict'}]);
  await page.goto(live);await lastPage();finish=page.waitForResponse(r=>r.url().endsWith('/api/onboarding/seen'));
  await action('story-finish').click();await page.locator('.home-title').waitFor();assert.equal((await finish).status(),200);
  const liveSave=await page.evaluate(async()=>await(await fetch('/api/save/export')).json());
  assert.equal(liveSave.version,6);assert.equal(liveSave.prologueSeen,true);
  await page.reload();await page.locator('.home-title').waitFor();
  await page.screenshot({path:'artifacts/v06-live-home-after-story.png'});
  checks.push('The running localhost:3210 game finishes the story, exports v6, persists seen state and reloads to home.');
  assert.deepEqual(errors,[]);
  const report={date:new Date().toISOString(),checks,errors};
  await writeFile('artifacts/browser-prologue-v06.json',JSON.stringify(report,null,2));console.log(report);
}finally{
  await context.clearCookies({name:'garden_profile',domain:'localhost'});
  if(previousLiveCookies.length)await context.addCookies(previousLiveCookies);
  await context.close();await new Promise(r=>server.close(r));
}
