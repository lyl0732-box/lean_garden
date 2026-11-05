import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','appwin-browser-'+Date.now());
const {createServer}=await import('../server/index.mjs');
const {openAppwin}=await import('../server/appwin.mjs');
const ads=await openAppwin({directory:process.env.GARDEN_DATA_DIR,securityKey:'isolated-browser-test-key'});
const server=await createServer({allowGuestForTests:true,rewardAds:ads});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port,results=[];
try{
  for(const native of [false,true]){
    const context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{channel:'chrome',headless:true,viewport:{width:430,height:900},...(native?{userAgent:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/134.0.0.0 Mobile Safari/537.36 LeanGarden/0.12.3 LeanGardenAndroid/1'}:{})});
    try{
      const page=context.pages()[0]||await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await context.request.get(base+'/api/bootstrap');await context.request.post(base+'/api/onboarding/seen',{data:{}});
      await page.goto(base+'/#shop',{waitUntil:'networkidle'});
      const enter=page.getByRole('button',{name:'进入花园',exact:true});
      if(await enter.count()){await enter.waitFor();await enter.click({timeout:20000});}
      const button=page.locator('[data-action="watch-diamond-ad"]');
      try{await button.waitFor({timeout:12000});}catch(error){console.log(JSON.stringify({url:page.url(),errors,text:(await page.locator('body').innerText()).slice(-2500)}));await page.screenshot({path:'artifacts/appwin-browser-failure.png',fullPage:true});throw error;}
      assert.equal(await button.isEnabled(),native);
      results.push({mode:native?'Android capable UA':'web browser',enabled:await button.isEnabled(),label:await button.innerText()});
      if(native){
        ads.ready=false;await page.reload({waitUntil:'networkidle'});if(await enter.count())await enter.click({timeout:20000});await button.waitFor();
        assert.equal(await button.isEnabled(),false);assert.match(await button.innerText(),/配置中/);
        results.push({mode:'Android without server verification key',enabled:false,label:await button.innerText()});
      }
      assert.deepEqual(errors,[]);
      await page.screenshot({path:`artifacts/appwin-shop-${native?'android':'web'}.png`,fullPage:true});
    }finally{await context.close();}
  }
  const report={results,browserErrors:[],realAdPlaybackTested:false,scope:'UI capability/configuration gating on isolated test data'};
  await writeFile('artifacts/appwin-browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await new Promise(resolve=>server.close(resolve));}
