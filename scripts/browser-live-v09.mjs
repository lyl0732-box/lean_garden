import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const bases=['http://localhost:3210','http://100.83.142.93:3210'];
const context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{headless:true,channel:'chrome',viewport:{width:1024,height:768},locale:'zh-CN'});
const previous=(await context.cookies(bases)).filter(c=>c.name==='garden_profile');
const checks=[],errors=[];
try{
  for(const base of bases){
    // Exercise a new QA save only, then restore the original browser cookies.
    const response=await fetch(base+'/api/bootstrap');
    const [name,value]=response.headers.get('set-cookie').split(';')[0].split('=');
    await context.addCookies([{name,value,url:base,httpOnly:true,sameSite:'Strict'}]);
    const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);
    await page.waitForFunction(()=>globalThis.__gardenAssets?.files>0);
    for(let i=0;i<2;i++)await page.locator('[data-action="story-next"]').click();
    const seen=page.waitForResponse(r=>r.url().endsWith('/api/onboarding/seen'));
    await page.locator('[data-action="story-finish"]').click();
    await page.locator('.home-title').waitFor();assert.equal((await seen).status(),200);
    const save=await page.evaluate(async()=>await(await fetch('/api/save/export')).json());
    assert.equal(save.version,7);assert.equal(save.prologueSeen,true);assert.ok(Array.isArray(save.guidedTutorials));
    const resources=await page.evaluate(()=>({quality:__gardenAssets.quality,bytes:__gardenAssets.total,files:__gardenAssets.files,mediaBlobs:[...__gardenAssets.urls.values()].every(url=>url.startsWith('blob:')),secureContext:isSecureContext,cacheStorage:typeof caches}));
    assert.ok(resources.files>=134);assert.equal(resources.mediaBlobs,true);
    if(base.includes('100.83')){assert.equal(resources.secureContext,false);assert.equal(resources.cacheStorage,'undefined');}
    await page.reload();await page.locator('.home-title').waitFor();
    await page.mouse.wheel(0,900);assert.equal(await page.evaluate(()=>scrollY),0);
    assert.equal(await page.locator('#fullscreen-toggle').count(),1);
    await page.screenshot({path:'artifacts/v09-live-'+(base.includes('localhost')?'local':'tailscale')+'-home.png'});
    await page.locator('[data-action="settings"]').click();assert.match(await page.locator('.modal').innerText(),/0\.9/);
    checks.push({url:base,exportVersion:save.version,prologueCompleted:true,reloadStayedHome:true,tabletHomeFixed:true,frontendVersion:'0.9',resources});
    await page.close();
  }
  assert.deepEqual(errors,[]);
  const report={date:new Date().toISOString(),testedFrom:'host computer',remoteLaptopBrowserTested:false,checks,errors};
  await writeFile('artifacts/browser-live-v09.json',JSON.stringify(report,null,2));console.log(report);
}finally{
  for(const base of bases)await context.clearCookies({name:'garden_profile',domain:new URL(base).hostname});
  if(previous.length)await context.addCookies(previous);
  await context.close();
}
