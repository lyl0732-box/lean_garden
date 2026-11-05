import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import path from 'node:path';import {writeFile} from 'node:fs/promises';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','plan9-browser-'+Date.now());
const {createServer}=await import('../server/index.mjs'),{save}=await import('../server/store.mjs'),{sessionAccount,accountProfile}=await import('../server/accounts.mjs');
const server=await createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,checks=[],errors=[];let context,page,owner;
try{
  context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{channel:'chrome',headless:true,locale:'zh-CN',viewport:{width:390,height:844}});
  page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
  const r=await context.request.post(base+'/api/auth/register',{data:{username:'plan9-browser',password:'isolated-test-password',remember:false}}),cookie=r.headers()['set-cookie'];owner=accountProfile(sessionAccount(cookie));owner.prologueSeen=true;await save();
  await page.addInitScript(()=>{localStorage.setItem('garden-motion','off');localStorage.setItem('garden-sound','off');localStorage.setItem('garden-music','off');});
  async function visit(hash){await page.goto(base+'/?qa='+Date.now()+'#'+hash);await page.waitForFunction(()=>!!document.querySelector('.storybook-home,.battle-shell,.room-navigation'),null,{timeout:60000});}
  await visit('home');await page.locator('.storybook-home').waitFor();
  for(const [width,height] of [[320,740],[390,844],[800,1280],[1280,800],[844,390]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(180);
    const layout=await page.evaluate(()=>({height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('.home-toolbar button')].filter(e=>e.offsetWidth).map(e=>({name:e.dataset.action,...e.getBoundingClientRect().toJSON()}))}));
    assert.ok(layout.width<=width&&layout.height<=height,JSON.stringify(layout));
    for(const b of layout.controls)assert.ok(b.x>=-1&&b.right<=width+1&&b.y>=0&&b.bottom<=height,JSON.stringify(b));
    for(let i=0;i<layout.controls.length;i++)for(let j=i+1;j<layout.controls.length;j++){const a=layout.controls[i],b=layout.controls[j];assert.ok(Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1,JSON.stringify({width,a,b}));}
  }
  await page.setViewportSize({width:390,height:844});await page.locator('[data-action=checkin].home-tool').click();await page.locator('.checkin-day').first().waitFor();assert.equal(await page.locator('.checkin-day').count(),7);
  await page.locator('[data-action=checkin-claim]').click();await page.waitForFunction(()=>document.querySelector('[data-action=checkin-claim]')?.disabled);assert.equal(owner.economy.diamonds,30);await page.screenshot({path:'artifacts/plan9-checkin-mobile.png'});await page.locator('.modal-close').click();checks.push('Home fixed at 5 screen sizes; seven check-in rewards and one successful claim.');
  await page.locator('[data-action=settings]').click();assert.equal(await page.locator('.author-links a').count(),2);await page.locator('[data-action=check-update]').click();await page.getByText('已经是最新版本',{exact:false}).waitFor();await page.locator('.modal-close').click();
  await page.locator('[data-page=adventure]').click();await page.locator('.author-links').waitFor();assert.match(await page.locator('.author-links').innerText(),/15760362553/);checks.push('Author/tutorial links in settings and map; web update reports current version.');
  const trial=await context.request.post(base+'/api/shop/claim-trial',{data:{}});assert.equal(trial.status(),200,await trial.text());const free=await context.request.post(base+'/api/progress/freeplay',{data:{enabled:true}});assert.equal(free.status(),200,await free.text());assert.equal((await free.json()).progress.freePlay,true);console.log('Freeplay activated',owner.economy.freeplayMs,owner.economy.freeplayStartedAt);
  await visit('battle/n13');await page.locator('[data-testid=goal]').waitFor({timeout:60000});assert.equal(await page.locator('.battle-shell').evaluate(e=>e.getBoundingClientRect().top),0);
  await page.locator('[data-skill=rw]').click();await page.locator('[data-action=evidence-category][data-kind=theorem]').click();
  for(let n=0;n<12&&(await page.locator('.wheel-card.is-centered code').innerText())!=='Nat.add_comm';n++)await page.locator('[data-action=wheel-step][data-delta="1"]').click();
  assert.equal(await page.locator('.wheel-card.is-centered code').innerText(),'Nat.add_comm');await page.locator('[data-action=draw-focused]').click();await page.locator('[data-action=rewrite-mode]').waitFor();
  await page.locator('[data-action=rewrite-mode]').click();await page.locator('.occurrence-list').waitFor();await page.locator('[data-action=rewrite-mode]').click();await page.locator('[data-rewrite-code]').fill('rw [Nat.add_comm b c]');
  assert.match(await page.locator('[data-action=rewrite-mode]').innerText(),/精细代码修改/);await page.screenshot({path:'artifacts/plan9-rewrite-code-mobile.png'});await page.locator('[data-action=rewrite-mode]').click();assert.match(await page.locator('[data-action=rewrite-mode]').innerText(),/全部代换/);checks.push('Rewrite cycles all → positions → code → all; editable Lean field works.');
  await page.locator('[data-action=rewrite-mode]').click();await page.locator('[data-action=rewrite-mode]').click();await page.locator('[data-rewrite-code]').fill('nth_rewrite 1 [Nat.add_comm]');
  await page.locator('[data-action=flip-card][data-direction=backward]').click();assert.match(await page.locator('[data-rewrite-code]').inputValue(),/← Nat.add_comm/);await page.locator('[data-action=flip-card][data-direction=forward]').click();assert.ok(!(await page.locator('[data-rewrite-code]').inputValue()).includes('←'));
  const before=await page.locator('[data-testid=goal]').innerText();await page.locator('[data-action=arm-spell]').click();await page.locator('.target-pick').click();await page.waitForFunction(()=>document.querySelector('.battle-steps')?.textContent.includes('1 步'),null,{timeout:45000});assert.notEqual(await page.locator('[data-testid=goal]').innerText(),before);checks.push('Edited nth_rewrite executes through the UI and real Lean; flip buttons update code direction.');
  owner.economy.freeplayMs=1200;owner.economy.freeplayStartedAt=Date.now();await save();
  // Refresh the wallet so the visible countdown uses this shortened test grant.
  await visit('battle/n13');await page.locator('.room-navigation').waitFor({timeout:15000});assert.equal(owner.freePlay,false);assert.equal(await page.locator('.battle-shell').count(),0);assert.ok(owner.practice.attempts.n13);checks.push('Expired freeplay leaves battle automatically; practice remains saved.');
  await context.addInitScript(()=>Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/134.0.0.0 Mobile Safari/537.36 LeanGarden/0.13.0 LeanGardenAndroid/1'}));
  await visit('battle/n01');await page.locator('[data-testid=goal]').waitFor({timeout:60000});await page.evaluate(()=>document.documentElement.style.setProperty('--native-safe-top','28px'));assert.equal(await page.locator('.battle-shell').evaluate(e=>e.getBoundingClientRect().top),0);assert.equal(await page.locator('#fullscreen-toggle').count(),0);await page.screenshot({path:'artifacts/plan9-battle-android.png'});checks.push('Android viewport and cutout simulation: battle starts at y=0; no fullscreen button.');
  assert.deepEqual(errors,[]);await writeFile('artifacts/plan9-browser-report.json',JSON.stringify({date:new Date().toISOString(),checks,errors,realAdPlaybackTested:false,apkInstallTested:false},null,2));console.log(checks);
}catch(e){await page?.screenshot({path:'artifacts/plan9-browser-failure.png',fullPage:true}).catch(()=>{});throw e;}finally{await context?.close();await new Promise(r=>server.close(r));}
