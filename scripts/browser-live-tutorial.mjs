import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const base='http://localhost:3210';
const context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{headless:true,channel:'chrome',viewport:{width:390,height:844},locale:'zh-CN'});
const previous=(await context.cookies(base)).filter(c=>c.name==='garden_profile'),errors=[];
try{
  const response=await fetch(base+'/api/bootstrap'),[name,value]=response.headers.get('set-cookie').split(';')[0].split('=');
  await context.addCookies([{name,value,url:base,httpOnly:true,sameSite:'Strict'}]);
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  const click=async action=>page.locator(`[data-action="${action}"]`).click();
  const step=key=>page.waitForFunction(key=>document.querySelector('#guided-tutorial')?.dataset.step===key&&getComputedStyle(document.querySelector('#guided-tutorial')).opacity==='1',key);
  await page.goto(base);await page.locator('[data-action="story-skip"]').waitFor({timeout:60000});await click('story-skip');
  await click('freeplay');await page.locator('.level-map').waitFor();
  await page.goto(base+'/#battle/n02');await page.locator('.tutorial-help-button').waitFor();
  assert.equal(await page.locator('body.guided-lesson').count(),0);
  await click('tutorial-start');await step('n02-rw');await page.locator('[data-skill="rw"]').click();await step('n02-category');
  await page.locator('[data-kind="hypothesis"]').click();await step('n02-draw');await click('draw-focused');await step('n02-arm');
  const preparation=await page.locator('.ritual-face.front .ritual-formula').innerText();
  await page.mouse.click(385,100);await page.locator('.tutorial-exit-dialog').waitFor();await page.locator('[data-tutorial-exit="confirm"]').click();
  assert.equal(await page.locator('.preparation-modal').count(),1);assert.equal(await page.locator('.ritual-face.front .ritual-formula').innerText(),preparation);
  assert.equal(await page.locator('body.guided-lesson').count(),0);
  await click('arm-spell');let result=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));
  await page.locator('[data-action="pick-target"][data-target="goal"]').click();assert.equal((await(await result).json()).goals[0].target,'b = b');
  await page.locator('.tutorial-help-button').waitFor();await click('tutorial-start');await step('n02-rfl');
  assert.equal(await page.locator('.proof-history li').count(),1);assert.equal(await page.locator('.math-target').innerText(),'b = b');
  await page.keyboard.press('Escape');await page.locator('.tutorial-exit-dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('.tutorial-exit-dialog').count(),0);
  await page.keyboard.press('Escape');await page.locator('[data-tutorial-exit="confirm"]').click();
  result=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));await page.locator('[data-skill="rfl"]').click();assert.equal((await(await result).json()).complete,true);
  const save=await page.evaluate(async()=>await(await fetch('/api/save/export')).json());assert.deepEqual(save.guidedTutorials,[]);
  assert.deepEqual(errors,[]);
  const report={date:new Date().toISOString(),url:base,isolatedNewQaSave:true,freeplayHelpOptIn:true,exitPreservesPreparedCard:true,proofPreservedWhenStartingHelp:true,escapeCanAskAndCancel:true,freeRflCompleted:true,incompleteTutorialNotMarkedCompleted:true,errors};
  await writeFile('artifacts/browser-live-tutorial.json',JSON.stringify(report,null,2));console.log(report);
}finally{
  await context.clearCookies({name:'garden_profile',domain:'localhost'});if(previous.length)await context.addCookies(previous);
  await context.close();
}
