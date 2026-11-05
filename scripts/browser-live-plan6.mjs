import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const bases=['http://localhost:3210','http://100.83.142.93:3210'];
const context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{headless:true,channel:'chrome',viewport:{width:1024,height:768},locale:'zh-CN'});
const previous=(await context.cookies(bases)).filter(c=>c.name==='garden_profile');const checks=[],errors=[];
try{
  for(const base of bases){
    const bootstrap=await fetch(base+'/api/bootstrap'),[name,value]=bootstrap.headers.get('set-cookie').split(';')[0].split('=');
    await context.addCookies([{name,value,url:base,httpOnly:true,sameSite:'Strict'}]);
    const page=await context.newPage();await page.bringToFront();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);await page.locator('[data-action="story-skip"]').waitFor();await page.locator('[data-action="story-skip"]').click();await page.locator('.home-title').waitFor();
    assert.equal(await page.locator('[data-energy-value]').innerText(),'50');assert.match(await page.locator('.home-growth').innerText(),/Lv.1/);assert.equal(await page.locator('.mini-door strong').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);return r.getClientRects().length;}),1);
    await page.locator('.home-shop').click();await page.locator('.shop-modal').waitFor();assert.equal(await page.locator('[data-action="buy-product"]:disabled').count(),3);await page.locator('.modal-close').click();
    await page.goto(base+'/#battle/n01');await page.locator('.tutorial-help-button').waitFor();const response=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));await page.locator('[data-skill="rfl"]').click();const result=await(await response).json();assert.equal(result.complete,true);assert.equal(result.experience.xp,100);assert.equal(result.progress.economy.energy,45);
    const save=await page.evaluate(async()=>(await(await fetch('/api/save/export')).json()));assert.equal(save.version,8);assert.equal(save.economy.xp,100);
    checks.push({url:base,frontend:'0.10.0',resources:await page.evaluate(()=>__gardenAssets.files),storePurchasesDisabled:true,proofCompleted:'n01',energyAfter:45,xpAfter:100,exportVersion:8});await page.close();
  }
  assert.deepEqual(errors,[]);await writeFile('artifacts/browser-live-plan6-report.json',JSON.stringify({date:new Date().toISOString(),hostComputerTested:true,remotePhysicalDeviceTested:false,checks,errors},null,2));console.log({checks,errors});
}finally{for(const base of bases)await context.clearCookies({name:'garden_profile',domain:new URL(base).hostname});if(previous.length)await context.addCookies(previous);await context.close();}
