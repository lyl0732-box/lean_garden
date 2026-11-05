import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';

process.env.GARDEN_DATA_DIR=path.resolve('artifacts','quality-browser-'+Date.now());
const {createServer}=await import('../server/index.mjs');const server=await createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;let context;const errors=[],checks=[];
try{
  context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{headless:true,channel:'chrome',viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-CN'});
  await context.addInitScript(()=>Object.defineProperty(navigator,'connection',{configurable:true,value:{effectiveType:'3g',downlink:1,saveData:true}}));
  const page=await context.newPage();await page.bringToFront();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
  const click=action=>page.locator(`[data-action="${action}"]`).click();
  const idle=()=>page.waitForFunction(()=>!document.querySelector('.spell-stage,.verifying,#scene-transition'));
  const record=label=>{checks.push(label);console.log(label);};
  const network=await context.newCDPSession(page);await network.send('Network.enable');await network.send('Network.emulateNetworkConditions',{offline:false,latency:20,downloadThroughput:2*1024*1024,uploadThroughput:1024*1024});
  await page.goto(base);const select=page.locator('.resource-quality select');await select.waitFor();assert.equal(await select.isEnabled(),true);assert.equal(await select.inputValue(),'high');assert.deepEqual(await select.locator('option').evaluateAll(items=>items.map(item=>item.value)),['high','low']);
  await select.tap();await page.keyboard.press('Escape');await select.selectOption('high');await page.waitForTimeout(200);await select.selectOption('low');await page.waitForTimeout(200);await select.selectOption('high');
  await select.blur();await select.focus();
  await network.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await page.waitForFunction(()=>globalThis.__gardenAssets?.quality==='high');await page.waitForTimeout(650);
  assert.equal(await page.locator('.resource-boot').count(),1);assert.equal(await select.isEnabled(),true);assert.equal(await select.inputValue(),'high');
  await page.screenshot({path:'artifacts/quality-loading-mobile.png'});await page.locator('.resource-enter').click();await page.locator('[data-action="story-skip"]').waitFor();await click('story-skip');await page.locator('.home-title').waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('garden-asset-quality')),'high');
  record('Highest quality is the default even with slow/data-saving connections; the two manual choices stay enabled, cancel stale work and pause auto-entry while selected.');
  await click('freeplay');await page.locator('.level-map').waitFor();await page.goto(base+'/#battle/n02');await page.locator('.tutorial-help-button').waitFor();
  await page.locator('[data-skill="rw"]').click();await page.locator('[data-kind="hypothesis"]').click();await click('draw-focused');await click('arm-spell');
  const [result]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/level/step')),page.locator('[data-action="pick-target"][data-target="goal"]').click({force:true})]);assert.equal((await result.json()).goals[0].target,'b = b');await idle();
  const before=await page.evaluate(async()=>(await(await fetch('/api/bootstrap')).json()).progress);
  await click('settings');await page.locator('[data-setting-quality]').selectOption('low');await page.waitForTimeout(300);await page.screenshot({path:'artifacts/quality-settings-mobile.png'});await click('quality-apply');
  await page.locator('.tutorial-help-button').waitFor();assert.equal(await page.evaluate(()=>__gardenAssets.quality),'low');assert.equal(await page.locator('.math-target').innerText(),'b = b');assert.equal(await page.locator('.proof-history li').count(),1);
  const after=await page.evaluate(async()=>(await(await fetch('/api/bootstrap')).json()).progress);
  const stableProgress=p=>{const copy=structuredClone(p);delete copy.economy.serverTime;delete copy.economy.nextIn;return copy;};assert.deepEqual(stableProgress(after),stableProgress(before));
  record('In-game settings apply a saved low preference, reload the same battle and retain its actual Lean proof and all progress.');
  await click('settings');await page.locator('[data-setting-quality]').selectOption('high');await click('close-modal');
  for(const mode of ['home','adventure','mini','garden']){
    await page.goto(base+'/#'+mode);await page.locator(mode==='home'?'.home-title':'.room-shell').waitFor();await click('settings');assert.equal(await page.locator('[data-setting-quality]').inputValue(),'high');await click('close-modal');
  }
  record('Homepage, map, minigames and garden all expose the saved quality setting.');
  await page.goto(base+'/?garden-quality=low#home');await page.locator('.home-title').waitFor();assert.equal(await page.evaluate(()=>__gardenAssets.quality),'low');assert.equal(new URL(page.url()).searchParams.has('garden-quality'),false);
  await click('settings');await page.locator('[data-setting-quality]').selectOption('high');await click('quality-apply');await page.locator('.home-title').waitFor();assert.equal(await page.evaluate(()=>__gardenAssets.quality),'high');
  record('Native connection handoff is honored before preload and removed from the address, so it cannot overwrite later in-game changes.');
  await page.evaluate(async()=>{for(const key of await caches.keys())await caches.delete(key);});
  const lowRequests=[];page.on('request',r=>{if(r.url().includes('-low.'))lowRequests.push(r.url());});
  await page.route('**/assets/optimized/*-high.mp3*',route=>route.fulfill({status:503,body:'test-unavailable'}));
  await page.reload();await page.locator('.resource-retry').waitFor();assert.equal(await select.inputValue(),'high');assert.equal(await select.isEnabled(),true);assert.deepEqual(lowRequests,[]);
  await select.selectOption('low');await page.locator('.home-title').waitFor();assert.equal(await page.evaluate(()=>__gardenAssets.quality),'low');
  record('Explicit high never silently downgrades on download failure; the enabled retry screen lets the player choose low and recover.');
  assert.deepEqual(errors,[]);
  const report={date:new Date().toISOString(),touchMobileBrowserEmulated:true,physicalAndroidTested:false,checks,errors,dataDirectory:process.env.GARDEN_DATA_DIR};await writeFile('artifacts/browser-quality-report.json',JSON.stringify(report,null,2));
}catch(error){await context?.pages().at(-1)?.screenshot({path:'artifacts/quality-failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{await context?.close();await new Promise(r=>server.close(r));}
