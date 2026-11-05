import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const dir=path.resolve('artifacts');await mkdir(dir,{recursive:true});
process.env.GARDEN_DATA_DIR=path.join(dir,'browser-v3-'+Date.now());
const {createServer}=await import('../server/index.mjs');
const {getProfile,save}=await import('../server/store.mjs');
const {campaign,unlocked}=await import('../server/content.mjs');
const server=await createServer();await new Promise(r=>server.listen(3211,'127.0.0.1',r));
const context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{headless:true,channel:'chrome',viewport:{width:1440,height:1050},locale:'zh-CN',reducedMotion:'no-preference'});
const page=await context.newPage(),errors=[],report=[];page.on('pageerror',e=>errors.push(e.message));
const record=text=>{report.push(text);console.log(text);};
const shot=name=>page.screenshot({path:path.join(dir,'v3-'+name+'.png'),fullPage:true});
const waitIdle=()=>page.waitForFunction(()=>!document.querySelector('.verifying'));
async function stepClick(locator){const response=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));await locator.click();const r=await response,b=await r.json();assert.equal(r.status(),200,JSON.stringify(b));assert.ok(!b.rejected,JSON.stringify(b));await waitIdle();return b;}
async function rewards({animated=false}={}){
  await page.locator('.unlock-modal,.victory-modal').waitFor({timeout:20000});let i=0;
  while(await page.locator('.reward-seed').count()){
    if(animated&&i===0){await page.waitForTimeout(850);await shot('reward-small');assert.equal(await page.locator('.unlock-modal').evaluate(e=>e.getBoundingClientRect().height),844);}await page.locator('.reward-seed').click();
    if(animated&&i===0){await page.locator('.revealing').waitFor();await page.waitForTimeout(650);await shot('reward-radiating');}
    await page.locator('.reward-guide').waitFor();if(animated&&i===0)await shot('reward-rule');
    const r=page.waitForResponse(r=>r.url().endsWith('/api/cards/learn'));await page.locator('[data-action="learn-card"]').click();await r;await page.locator('.unlock-modal,.victory-modal').waitFor();i++;
  }
  assert.equal(await page.locator('.victory-modal').count(),1);
}
async function next(id){await page.locator(`.victory-modal [data-level="${id}"]`).click();await page.locator('.battle-header h2').waitFor();await waitIdle();await page.waitForFunction(()=>!document.querySelector('#overlay').innerHTML);}
async function rewrite(term,{target='goal',direction='forward',mode='once',occurrence=1}={}){
  await page.locator('[data-skill="rw"]').click();await page.locator('[data-control="target"]').selectOption(target);await page.locator('[data-control="direction"]').selectOption(direction);await page.locator('[data-control="mode"]').selectOption(mode);
  if(mode==='nth')await page.locator('[data-control="occurrence"]').selectOption(String(occurrence));
  await page.locator('[data-action="open-evidence"]').click();assert.equal(await page.locator('.evidence-modal select').count(),0);
  const kind=/^(h|ih)$/.test(term)?'hypothesis':'theorem';await page.locator(`[data-kind="${kind}"]`).click();
  return stepClick(page.locator('.evidence-entry').filter({has:page.locator('code').filter({hasText:new RegExp('^'+term.replaceAll('.','\\.')+'$')})}));
}
async function apply(term,target='goal',kind='hypothesis'){
  await page.locator('[data-skill="apply"]').click();await page.locator('[data-control="target"]').selectOption(target);await page.locator('[data-action="open-evidence"]').click();await page.locator(`[data-kind="${kind}"]`).click();
  return stepClick(page.locator('.evidence-entry').filter({has:page.locator('code').filter({hasText:new RegExp('^'+term.replaceAll('.','\\.')+'$')})}));
}
async function fixture(id){const cookies=await context.cookies('http://127.0.0.1:3211');const {profile}=getProfile(cookies.map(c=>c.name+'='+c.value).join('; '));const index=campaign.findIndex(l=>l.id===id);for(const l of campaign.slice(0,index))profile.completed[l.id]||={stars:3,steps:[]};profile.introduced=[...unlocked(profile)];await save();await page.goto('http://127.0.0.1:3211/?fixture='+id+'-'+Date.now()+'#adventure');await page.locator('.level-map').waitFor();const level=campaign[index];await page.locator(`.chapter-tabs [data-chapter="${level.chapter}"]`).click();await page.locator(`[data-action="level"][data-level="${id}"]`).click();await page.locator('.battle-layout').waitFor();await waitIdle();}
try{
  if(!process.env.QA_CONTINUE){
  await page.goto('http://127.0.0.1:3211');await page.locator('.hero-cta').waitFor();await shot('home-desktop');
  if(await page.locator('[data-action="music"]').getAttribute('aria-pressed')==='false')await page.locator('[data-action="music"]').click();
  await page.setViewportSize({width:390,height:844});await shot('home-mobile');await page.locator('.hero-cta').click();await page.locator('.battle-layout').waitFor();assert.equal(await page.locator('#overlay>*').count(),0);assert.equal(await page.locator('.rail-card').count(),1);
  const bounds=await page.evaluate(()=>({rail:document.querySelector('.skill-rail').getBoundingClientRect().right,main:document.querySelector('.battle-main').getBoundingClientRect().left,hyp:document.querySelector('.hypotheses').getBoundingClientRect().bottom,goal:document.querySelector('.target-area').getBoundingClientRect().top}));assert.ok(bounds.rail<bounds.main);assert.ok(bounds.hyp<bounds.goal);
  await shot('battle-first');await stepClick(page.locator('[data-skill="rfl"]'));await rewards({animated:true});record('First level: left rail, conditions above goal, no entry popup; earned rw card blossoms full screen after click');
  await page.emulateMedia({reducedMotion:'reduce'});await next('n02');let b=await rewrite('h',{target:'h'});assert.equal(b.goals[0].target,'a = b');assert.equal(b.goals[0].hypotheses.find(h=>h.name==='h').type,'b = b');
  const undo=page.waitForResponse(r=>r.url().endsWith('/api/level/undo'));await page.locator('.battle-tools [data-action="undo"]').click();await undo;await waitIdle();
  b=await rewrite('h',{direction:'backward',mode:'nth'});assert.equal(b.complete,false);assert.equal(b.goals[0].target,'a = a');await shot('battle-rw');await stepClick(page.locator('[data-skill="rfl"]'));await rewards();record('rw target, reverse direction, nth occurrence on main page; evidence popup has sources only; no automatic rfl');
  for(const [id,terms] of [['n03',['Garden.one_eq_succ_zero']],['n04',['Nat.add_zero']],['n05',['Nat.add_succ']],['n06',['h','Nat.add_zero']],['n06a',['Garden.one_eq_succ_zero','Nat.add_succ','Nat.add_zero']]]){
    await next(id);if(['n03','n04','n05','n06a'].includes(id)){const response=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));await page.locator('[data-skill="rfl"]').click();assert.equal((await response).status(),409);await waitIdle();}
    for(const term of terms){b=await rewrite(term);assert.equal(b.complete,false);}assert.equal(await page.locator('body').innerText().then(s=>s.includes('Nat.succ')),false);
    await stepClick(page.locator('[data-skill="rfl"]'));await rewards();record(id+': theorem sequence completed with explicit rfl');
  }
  await next('n07');await page.locator('[data-skill="induction"]').click();assert.equal(await page.locator('[data-control="variable"]').inputValue(),'n');await shot('induction-mobile');
  b=await stepClick(page.locator('[data-action="confirm-induction"]'));assert.equal(b.goals.length,2);await stepClick(page.locator('[data-skill="rfl"]'));await rewrite('Nat.add_succ');await rewrite('ih');await stepClick(page.locator('[data-skill="rfl"]'));await rewards();
  await next('n08');await apply('succ_ne_zero n','goal','theorem');await rewards();record('Bridge precedes induction; variable selector produces both cases; apply selects theorem in separate warehouse');
  }else{await page.goto('http://127.0.0.1:3211');await page.locator('.hero-cta').waitFor();await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});}
  await fixture('l08');await page.locator('[data-skill="intro"]').click();assert.equal(await page.locator('[data-control="action"] option').count(),1);await stepClick(page.locator('[data-action="confirm-action"]'));
  const applied=await apply('hn','hp');assert.equal(applied.goals[0].hypotheses.find(h=>h.name==='hp').type,'False');await shot('apply-at-mobile');await apply('hp');await rewards();record('intro has a selection box; apply to hp replaces it with False; apply hp closes goal');
  await fixture('l04');await page.locator('[data-skill="rcases"]').click();assert.equal(await page.locator('[data-control="action"]').count(),1);await stepClick(page.locator('[data-action="confirm-action"]'));await shot('rcases-mobile');
  await fixture('l10');await page.locator('[data-skill="use"]').click();assert.equal(await page.locator('[data-control="action"] option').count(),2);await shot('use-mobile');record('rcases and use present explicit object/usage selectors');
  await page.setViewportSize({width:320,height:740});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await shot('battle-320');await page.setViewportSize({width:1440,height:1050});await shot('battle-desktop');
  await page.locator('[data-action="leave"]').click();await page.locator('nav [data-page="garden"]').click();await page.locator('.collection-grid').waitFor();await shot('garden-desktop');assert.equal(await page.locator('.collection-card[data-card="rfl"],.collection-card[data-card="rw"],.collection-card[data-card="exact"],.collection-card[data-card="assumption"]').count(),0);assert.ok(await page.locator('.collection-card>.card-art').count()>25);
  await page.evaluate(async()=>{window.musicUnderTest=(await import('/music.js')).music;await musicUnderTest.start();});await page.waitForFunction(()=>musicUnderTest.audio?.readyState>=2&&!musicUnderTest.audio.paused);const duration=await page.evaluate(()=>musicUnderTest.audio.duration);assert.ok(duration>200);
  await page.evaluate(()=>{musicUnderTest.audio.currentTime=musicUnderTest.audio.duration-.4;});await page.waitForFunction(()=>musicUnderTest.loops>=1&&musicUnderTest.audio.currentTime<3,null,{timeout:10000});
  await page.locator('.top-tools [data-action="music"]').click();await page.reload();await page.locator('.collection-grid').waitFor();assert.equal(await page.locator('[data-action="music"]').getAttribute('aria-pressed'),'false');record('Theorem illustrations present; 205-second instrumental decodes, loops across actual end and persists mute');
  await page.locator('nav [data-page="home"]').click();await page.locator('.hero').waitFor();await page.locator('[data-action="reset-confirm"]').click();await page.locator('[data-action="reset-all"]').click();await page.locator('.hero-cta').waitFor();await page.reload();await page.locator('.hero-cta').click();await page.locator('.battle-layout').waitFor();assert.equal(await page.locator('#overlay>*').count(),0);assert.equal(await page.locator('.rail-card').count(),1);assert.equal(await page.locator('input,textarea,[contenteditable="true"]').count(),0);
  assert.deepEqual(errors,[]);record('320/390/1440px layouts, reset persistence, button-only interaction and no browser errors');
  await writeFile(path.join(dir,'browser-report-v3.json'),JSON.stringify({date:new Date().toISOString(),continued:!!process.env.QA_CONTINUE,report,errors,musicDuration:duration},null,2));
}catch(error){await writeFile(path.join(dir,'browser-report-v3-partial.json'),JSON.stringify({date:new Date().toISOString(),report,errors,failure:error.message},null,2));await shot('browser-failure');throw error;}finally{await context.close();await new Promise(r=>server.close(r));}
