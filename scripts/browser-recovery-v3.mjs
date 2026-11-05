import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','recovery-v3-'+Date.now());
const {createServer}=await import('../server/index.mjs');
const {getProfile,save}=await import('../server/store.mjs');
const {campaign,unlocked}=await import('../server/content.mjs');
const server=await createServer();await new Promise(r=>server.listen(3212,'127.0.0.1',r));
const context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{headless:true,channel:'chrome',viewport:{width:390,height:844},reducedMotion:'reduce'});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const base='http://127.0.0.1:3212';
async function step(selector){const response=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));await page.locator(selector).click();const r=await response,b=await r.json();assert.equal(r.status(),200);assert.ok(!b.rejected,JSON.stringify(b));await page.waitForFunction(()=>!document.querySelector('.verifying'));return b;}
try{
  await page.goto(base);await page.locator('.hero-cta').click();await page.locator('.battle-layout').waitFor();await step('[data-skill="rfl"]');await page.locator('.reward-seed').waitFor();
  await page.reload();await page.locator('.hero').waitFor();assert.equal(await page.locator('.pending-banner').count(),1);assert.equal(await page.locator('#overlay>*').count(),0);
  await page.locator('.hero-cta').click();await page.locator('.battle-layout').waitFor();assert.equal(await page.locator('#overlay>*').count(),0);assert.equal(await page.locator('.pending-banner').count(),1);
  await page.locator('[data-action="claim-cards"]').click();await page.locator('.reward-seed').click();await page.locator('[data-action="learn-card"]').click();await page.waitForFunction(()=>!document.querySelector('#overlay').innerHTML);assert.equal(await page.locator('.pending-banner').count(),0);
  const cookies=await context.cookies(base),{profile}=getProfile(cookies.map(c=>c.name+'='+c.value).join('; '));for(const l of campaign.filter(l=>l.chapter==='n'&&l.number<=8))profile.completed[l.id]||={stars:3,steps:[]};profile.introduced=[...unlocked(profile)];await save();
  await page.goto(base+'/?repeat#mini');await page.locator('[data-level="m02"]').click();await page.locator('.battle-layout').waitFor();await page.locator('[data-skill="rw"]').click();await page.locator('[data-control="mode"]').selectOption('all');await page.screenshot({path:'artifacts/v3-repeat-all.png',fullPage:true});
  await page.locator('[data-action="open-evidence"]').click();await page.locator('[data-kind="theorem"]').click();assert.equal(await page.locator('.evidence-modal select').count(),0);await page.screenshot({path:'artifacts/v3-theorem-warehouse.png',fullPage:true});
  const response=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));await page.locator('.evidence-entry').filter({has:page.locator('code',{hasText:/^Nat\.zero_add$/})}).click();const b=await(await response).json();assert.equal(b.complete,false);assert.equal(b.goals[0].target,'n = n');await page.waitForFunction(()=>!document.querySelector('.verifying'));await step('[data-skill="rfl"]');await page.locator('.victory-modal').waitFor();
  await page.locator('.modal-close').click();await page.locator('[data-action="settings"]').click();assert.ok((await page.locator('.music-credit').innerText()).includes('Kevin MacLeod'));assert.deepEqual(errors,[]);
  const report={date:new Date().toISOString(),checks:['Pending reward survives reload','Entering next level never auto-opens reward','Manual claim resumes from battle','Repeat-all chosen on main page and closes only after rfl','Theorem warehouse has evidence only','Music attribution visible'],errors};await writeFile('artifacts/browser-recovery-report-v3.json',JSON.stringify(report,null,2));console.log(report);
}finally{await context.close();await new Promise(r=>server.close(r));}
