import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','final-ui-'+Date.now());
const {createServer}=await import('../server/index.mjs'),{getProfile,save}=await import('../server/store.mjs'),{campaign,unlocked}=await import('../server/content.mjs');
const server=await createServer();await new Promise(r=>server.listen(3211,'127.0.0.1',r));
const context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{headless:true,channel:'chrome',viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const idle=()=>page.waitForFunction(()=>!document.querySelector('#scene-transition')&&!document.querySelector('.verifying'));
async function fixture(id){const cookies=await context.cookies('http://127.0.0.1:3211'),{profile}=getProfile(cookies.map(c=>c.name+'='+c.value).join('; '));profile.completed=Object.fromEntries(campaign.slice(0,campaign.findIndex(l=>l.id===id)).map(l=>[l.id,{proofVersion:4,stars:3,steps:[]}]));profile.introduced=[...unlocked(profile)];profile.topicsLearned=['successor','addition'];profile.attempts={};await save();await page.goto('http://127.0.0.1:3211/?final='+id+'#adventure');await page.locator(`[data-level="${id}"]`).click();await page.locator('.battle-layout').waitFor();await idle();}
async function pick(term,warehouse=false){await page.locator('[data-action="open-evidence"]').click();await page.locator(`[data-action="evidence-tab"][data-kind="${warehouse?'warehouse':'hypothesis'}"]`).click();if(warehouse&&term==='Nat.succ.inj')await page.locator('[data-action="evidence-category"][data-kind="axiom"]').click();await page.locator('.evidence-entry').filter({has:page.locator('code').filter({hasText:new RegExp('^'+term.replaceAll('Nat.succ','succ').replaceAll('.','\\.')+'$')})}).click();}
async function step(click){const r=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));await click();const res=await r,b=await res.json();assert.equal(res.status(),200);assert.ok(!b.rejected,JSON.stringify(b));await idle();return b;}
try{
  await page.goto('http://127.0.0.1:3211');await page.locator('.home-title').waitFor();await fixture('n05one');await page.locator('[data-skill="rw"]').click();await page.locator('[data-control="mode"][value="nth"]').check();await pick('Garden.one_eq_succ_zero',true);await page.locator('[data-occurrence="2"]').waitFor();assert.equal(await page.locator('[data-occurrence]').count(),2);await page.locator('[data-occurrence="1"]').uncheck();await page.locator('[data-occurrence="2"]').check();const rewritten=await step(()=>page.locator('[data-action="confirm-rewrite"]').click());assert.equal(rewritten.goals[0].target,'1 + succ 0 = 2');
  await fixture('n09');await page.locator('[data-skill="apply"]').click();const applied=await step(()=>pick('Nat.succ.inj',true));assert.ok(applied.proof[0].startsWith('garden_nat_apply'));await page.locator('[data-skill="apply"]').click();const complete=await step(()=>pick('h'));assert.equal(complete.complete,true);assert.deepEqual(errors,[]);
  const report={date:new Date().toISOString(),numericOccurrences:2,numericNth:true,naturalApply:true,errors};await writeFile('artifacts/final-ui-v4.json',JSON.stringify(report,null,2));console.log(report);
}finally{await context.close();await new Promise(r=>server.close(r));}
