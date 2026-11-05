import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const base='http://localhost:3210';
const context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{headless:true,channel:'chrome',viewport:{width:1024,height:768},locale:'zh-CN'});
const previous=(await context.cookies(base)).filter(c=>c.name==='garden_profile'),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  // Only a new QA save is exercised. Restore the browser's original profile cookie afterwards.
  const response=await fetch(base+'/api/bootstrap'),[name,value]=response.headers.get('set-cookie').split(';')[0].split('=');
  await context.addCookies([{name,value,url:base,httpOnly:true,sameSite:'Strict'}]);
  await page.goto(base);for(let i=0;i<2;i++)await page.locator('[data-action="story-next"]').click();
  const seen=page.waitForResponse(r=>r.url().endsWith('/api/onboarding/seen'));await page.locator('[data-action="story-finish"]').click();await page.locator('.home-title').waitFor();assert.equal((await seen).status(),200);
  const save=await page.evaluate(async()=>await(await fetch('/api/save/export')).json());assert.equal(save.version,7);assert.equal(save.prologueSeen,true);assert.ok(Array.isArray(save.guidedTutorials));
  await page.reload();await page.locator('.home-title').waitFor();await page.mouse.wheel(0,900);assert.equal(await page.evaluate(()=>scrollY),0);assert.equal(await page.locator('#fullscreen-toggle').count(),1);
  await page.screenshot({path:'artifacts/v07-live-home.png'});await page.locator('[data-action="settings"]').click();assert.match(await page.locator('.modal').innerText(),/0\.7/);
  assert.deepEqual(errors,[]);const report={date:new Date().toISOString(),url:base,exportVersion:save.version,prologueCompleted:true,reloadStayedHome:true,tabletHomeFixed:true,frontendVersion:'0.7',errors};await writeFile('artifacts/browser-live-v07.json',JSON.stringify(report,null,2));console.log(report);
}finally{await context.clearCookies({name:'garden_profile',domain:'localhost'});if(previous.length)await context.addCookies(previous);await context.close();}
