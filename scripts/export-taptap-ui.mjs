import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {icon} from '../public/ui.js';
import {scenery,ultimateEmblem} from '../public/scenery.js';
import {wandArt} from '../public/wands.js';

process.env.GARDEN_DATA_DIR=path.resolve('artifacts/taptap-art-export-data-'+Date.now());
const {createServer}=await import('../server/index.mjs');
const {sessionAccount,accountProfile}=await import('../server/accounts.mjs');
const {save}=await import('../server/store.mjs');
const preparation=JSON.parse(await readFile('dist/taptap/android-preparation.json','utf8'));
const server=await createServer({publicRoot:preparation.web});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,out=path.resolve('clients/taptap-minigame/art');await mkdir(out,{recursive:true});
const atlas={source:'APK original DOM/CSS and SVG assets',home:{},icons:{},darkIcons:{},scenes:{},wands:[]};let context;
try{
  context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{channel:'chrome',headless:true,locale:'zh-CN',viewport:{width:420,height:940},deviceScaleFactor:2});
  await context.addInitScript(()=>{localStorage.setItem('garden-sound','off');localStorage.setItem('garden-music','off');localStorage.setItem('garden-motion','off');});
  const auth=await context.request.post(origin+'/api/auth/register',{data:{username:'art-export',password:'isolated-art-export-password'}});if(auth.status()!==200)throw Error('Could not create isolated export account');
  accountProfile(sessionAccount(auth.headers()['set-cookie'])).prologueSeen=true;await save();
  const page=await context.newPage();await page.goto(origin+'/#home');await page.locator('.storybook-home').waitFor({timeout:90000});await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:`body{background:transparent!important}body *{visibility:hidden!important;animation:none!important;transition:none!important}.ui-export,.ui-export *{visibility:visible!important}.ui-export.hide-children *{visibility:hidden!important}`});
  async function capture(selector,file,{hideChildren=false}={}){
    await page.evaluate(()=>document.querySelectorAll('.ui-export').forEach(e=>e.classList.remove('ui-export','hide-children')));
    const element=page.locator(selector).first();await element.evaluate((e,hide)=>e.classList.add('ui-export',...(hide?['hide-children']:[])),hideChildren);
    await element.screenshot({path:path.join(out,file),omitBackground:true,animations:'disabled'});return file;
  }
  atlas.home.title=await capture('.home-title','home-title.png');
  for(const [key,selector]of [['adventure','.adventure-door'],['mini','.mini-door'],['garden','.zen-door']]){
    atlas.home[key]={label:await capture(selector+' strong','door-'+key+'-label.png'),emblem:await capture(selector+' .door-emblem','door-'+key+'-emblem.png'),background:await capture(selector,'door-'+key+'-background.png',{hideChildren:true})};
  }
  for(const name of ['map','game','flower','seed','tree','water','temple','star','lock','check','arrow','back','settings','refresh','light','book','sound','music','musicOff','power','diamond','shop','trophy','leaf','flag','help']){
    const file='icon-'+name+'.png';const svg=icon(name).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" ').replaceAll('currentColor','#f6edba');await sharp(Buffer.from(svg)).png().toFile(path.join(out,file));atlas.icons[name]=file;
    const darkFile='icon-'+name+'-dark.png';await sharp(Buffer.from(svg.replaceAll('#f6edba',name==='diamond'?'#5899b2':'#536d47'))).png().toFile(path.join(out,darkFile));atlas.darkIcons[name]=darkFile;
  }
  for(const ch of ['n','l','a','t']){const file='scene-'+ch+'.png';await sharp(Buffer.from(scenery(ch).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="360" '))).png().toFile(path.join(out,file));atlas.scenes[ch]=file;}
  atlas.boss='boss-emblem.png';await sharp(Buffer.from(ultimateEmblem().replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" '))).png().toFile(path.join(out,atlas.boss));
  for(const [i,level]of [1,3,5,8,11,14,18,22].entries()){const file='wand-'+(i+1)+'.png';await sharp(Buffer.from(wandArt(level))).resize(120,280).png().toFile(path.join(out,file));atlas.wands.push(file);}
  await writeFile(path.join(out,'atlas.json'),JSON.stringify(atlas,null,2));console.log('Exported original APK artwork to '+out);
}finally{if(context)await context.close();await new Promise(r=>server.close(r));}
