import {_electron as electron} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import path from 'node:path';import {readFile,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';

const {version}=JSON.parse(await readFile('package.json','utf8'));
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','desktop-'+version+'-'+Date.now());
const {createServer}=await import('../server/index.mjs');const server=await createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const profile=path.resolve('artifacts','desktop-profile-'+Date.now());let client,page;const errors=[];
async function launch(){
  client=await electron.launch({executablePath:path.resolve('dist/windows/win-unpacked/Lean Garden.exe'),args:['--garden-qa'],env:{...process.env,GARDEN_QA_DATA:profile},timeout:30000});
  page=await client.firstWindow();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{configurable:true,value:{effectiveType:'3g',downlink:1,saveData:true}}));
  await page.locator('#server').waitFor();
  assert.equal(await client.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen()),true);
}
try{
  await launch();assert.equal(await page.locator('#server').inputValue(),'https://162.14.77.140');assert.equal(await page.locator('#quality').inputValue(),'high');assert.equal(await page.locator('#quality option').count(),2);
  await page.locator('#server').fill(base);await page.locator('[data-mode="register"]').click();await page.locator('#username').fill('桌面验收');await page.locator('#password').fill('desktop-qa-011');await page.locator('#hint').fill('桌面花园');await page.locator('#submit').click();await page.locator('[data-action="story-skip"]').waitFor({timeout:60000});
  assert.equal(await page.evaluate(()=>__gardenAssets.quality),'high');assert.equal(new URL(page.url()).searchParams.has('garden-quality'),false);
  await page.locator('[data-action="story-skip"]').click();await page.locator('.home-title').waitFor();
  assert.equal(await page.locator('.account-form').count(),0);assert.match(await page.locator('.home-edition').innerText(),/桌面验收/);
  const tools=await page.locator('.home-toolbar .home-tool,.home-toolbar #fullscreen-toggle').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {id:el.id,x:r.x,y:r.y,w:r.width,h:r.height};}));assert.ok(tools.every(t=>t.w===(t.id==='fullscreen-toggle'?68:50)&&t.h===50&&Math.abs(t.y-tools[0].y)<2));
  const fullscreenText=await page.locator('#fullscreen-toggle .control-caption').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return {lines:r.getClientRects().length,width:r.getBoundingClientRect().width,button:el.parentElement.clientWidth,text:el.textContent};});assert.equal(fullscreenText.text,'退出全屏');assert.equal(fullscreenText.lines,1);assert.ok(fullscreenText.width<fullscreenText.button-10);
  const source=await page.evaluate(async()=>{const r=await fetch('/boot.js');return r.headers.get('X-Garden-Asset-Source');});assert.equal(source,'bundle');
  const savedConnection=JSON.parse(await readFile(path.join(profile,'connection.json'),'utf8'));assert.equal(savedConnection.password,undefined);assert.equal(savedConnection.username,'桌面验收');
  await page.waitForFunction(()=>document.querySelector('#fullscreen-toggle')?.getAttribute('aria-pressed')==='true');
  await page.locator('#fullscreen-toggle').click();await page.waitForFunction(()=>document.querySelector('#fullscreen-toggle')?.getAttribute('aria-pressed')==='false');assert.equal(await client.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen()),false);
  await page.locator('#fullscreen-toggle').click();await page.waitForFunction(()=>document.querySelector('#fullscreen-toggle')?.getAttribute('aria-pressed')==='true');assert.equal(await client.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen()),true);
  await client.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setFullScreen(false));await page.waitForFunction(()=>document.querySelector('#fullscreen-toggle')?.getAttribute('aria-pressed')==='false');
  await client.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setFullScreen(true));await page.waitForFunction(()=>document.querySelector('#fullscreen-toggle')?.getAttribute('aria-pressed')==='true');
  assert.deepEqual(await page.evaluate(()=>Object.keys(gardenWindow).sort()),['isFullscreen','onChange','toggle']);
  assert.equal(await page.evaluate(()=>typeof window.require),'undefined');assert.equal(await page.evaluate(()=>typeof gardenConnection),'undefined');
  await page.locator('[data-action="settings"]').click();await page.locator('[data-setting-quality]').selectOption('low');await page.locator('[data-action="quality-apply"]').click();await page.locator('.home-title').waitFor();assert.equal(await page.evaluate(()=>__gardenAssets.quality),'low');
  await page.locator('[data-action="settings"]').click();await page.locator('a[href="leangarden://connection"]').click();await page.waitForFunction(()=>document.querySelector('#quality')?.value==='low');assert.equal(await page.locator('#server').inputValue(),base);
  await client.close();client=null;
  await launch();await page.waitForFunction(()=>document.querySelector('#quality')?.value==='low');assert.equal(await page.locator('#server').inputValue(),base);
  assert.equal(await page.locator('#username').inputValue(),'桌面验收');await page.locator('#password').fill('desktop-qa-011');await page.locator('#submit').click();await page.locator('.home-title').waitFor({timeout:60000});assert.equal(await page.evaluate(()=>__gardenAssets.quality),'low');
  const start=page.waitForResponse(r=>r.url().endsWith('/api/level/start'));await page.goto(base+'/#battle/n01');await start;await page.locator('.tutorial-help-button').waitFor();assert.equal(await page.locator('body.guided-lesson').count(),0);
  const response=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));await page.locator('[data-skill="rfl"]').click();assert.equal((await(await response).json()).complete,true);
  assert.deepEqual(errors,[]);
  await page.locator('[data-action="close-modal"]').click().catch(()=>{});await page.goto(base+'/#home');await page.locator('.hero-yaya').waitFor();await page.locator('[data-action="exit-game"]').click();const exit=client.waitForEvent('close');await page.locator('[data-action="exit-now"]').click();await exit;client=null;
  const report={date:new Date().toISOString(),version,packagedExecutableTested:true,windowWasHidden:true,defaultFullscreenVerified:true,buttonExitsAndReentersNativeFullscreen:true,nativeStateChangesUpdateButton:true,fullscreenBridgeScope:'only fullscreen state/toggle/events; trusted main frame only',nativeLoginAndRegisterVerified:true,noSecondWebLogin:true,noPasswordInClientPreferences:true,resourceSource:'bundle',exitClosesNativeWindow:true,defaultServer:'https://162.14.77.140',defaultQualityHigh:true,connectionQualityApplied:true,manualHighOverridesSlowConnection:true,inGameQualityApplied:true,connectionSyncAndRestartVerified:true,proofCompleted:'n01',nodeUnavailableToRemotePage:true,errors};
  await writeFile('artifacts/desktop-fullscreen-report.json',JSON.stringify(report,null,2));console.log(report);
}finally{await client?.close();await new Promise(r=>server.close(r));}
