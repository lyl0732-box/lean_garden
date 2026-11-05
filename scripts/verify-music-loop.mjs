import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{headless:true,channel:'chrome'}),page=await context.newPage();
try{
  await page.goto('http://127.0.0.1:3210');await page.locator('.home-title').waitFor();
  await page.evaluate(async()=>{window.loopMusic=(await import('/music.js')).music;if(!loopMusic.enabled)loopMusic.toggle();});
  await page.locator('.home-title').click();await page.waitForFunction(()=>loopMusic.audio?.readyState===4&&!loopMusic.audio.paused);
  await page.evaluate(()=>loopMusic.audio.currentTime=loopMusic.audio.duration-.6);await page.waitForTimeout(1500);
  assert.equal(await page.evaluate(()=>loopMusic.audio.currentTime<3&&!loopMusic.audio.paused),true);
  const loops=await page.evaluate(()=>loopMusic.loops);assert.ok(loops>=1);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.evaluate(()=>[...loopMusic.players.values()].every(p=>p.audio.paused)),true);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>!loopMusic.audio.paused);
  const report={date:new Date().toISOString(),actualEndOfTrackLoop:true,loops,visibilityPauseResume:true};await writeFile('artifacts/music-loop-v4.json',JSON.stringify(report,null,2));console.log(report);
}finally{await context.close();}
