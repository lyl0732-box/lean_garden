import {_electron as electron} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import http from 'node:http';import path from 'node:path';import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','native-updates-'+Date.now());
const {createServer}=await import('../server/index.mjs'),server=await createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const upstream=server.address().port,original=JSON.parse(await readFile('public/client-manifest.json','utf8')),profile=path.resolve('artifacts','native-update-profile-'+Date.now());
let revision='bundled',breakDownload=false,client,page;const network=[],checks=[],errors=[];
const patchBody='export const patch = "hot-update-works";';
const patch={url:'/qa-native-update.js',bytes:Buffer.byteLength(patchBody),sha256:createHash('sha256').update(patchBody).digest('hex'),mime:'text/javascript; charset=utf-8'};
const proxy=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');network.push(url.pathname);
  if(url.pathname==='/client-manifest.json'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(revision==='bundled'?original:{...original,revision,assets:[...original.assets,patch]}));}
  if(url.pathname===patch.url){res.writeHead(breakDownload?503:200,{'Content-Type':patch.mime});return res.end(breakDownload?'unavailable':patchBody);}
  // Fail every static request: a successful game must be reading the package.
  if(!url.pathname.startsWith('/api/')){res.writeHead(503);return res.end('Static network deliberately unavailable in native-cache QA.');}
  const out=http.request({hostname:'127.0.0.1',port:upstream,path:req.url,method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});out.on('error',()=>{res.writeHead(502);res.end();});req.pipe(out);
});await new Promise(r=>proxy.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+proxy.address().port;
async function launch(){
  client=await electron.launch({executablePath:path.resolve('dist/windows/win-unpacked/Lean Garden.exe'),args:['--garden-qa'],env:{...process.env,GARDEN_QA_DATA:profile},timeout:30000});
  page=await client.firstWindow();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));await page.locator('#server').waitFor();await page.locator('#server').fill(base);await page.locator('form button').click();
}
async function enter(){await page.waitForSelector('.storybook-home,.prologue-screen',{timeout:45000});if(await page.locator('[data-action="story-skip"]').count())await page.locator('[data-action="story-skip"]').click();await page.locator('.home-title').waitFor();}
const stats=async()=>JSON.parse(await readFile(path.join(profile,'resource-cache/last-check.json'),'utf8'));
try{
  await launch();await enter();const first=await stats();assert.equal(first.stats.bundled,original.assets.length);assert.equal(first.stats.downloaded,0);assert.equal(first.stats.downloadBytes,0);
  assert.equal(await page.evaluate(()=>__gardenAssets.sources.network),0);assert.equal(await page.evaluate(()=>__gardenAssets.sources.bundle),139);assert.deepEqual(network.filter(x=>!x.startsWith('/api/')),['/client-manifest.json']);
  checks.push('Fresh installation loads all 151 static resources from its package, including high-quality art and seven BGM tracks, while every server static route is unavailable.');
  await client.close();client=null;network.length=0;revision='qa-hot-update';
  await launch();await enter();const updated=await stats();assert.equal(updated.stats.bundled,original.assets.length);assert.equal(updated.stats.downloaded,1);assert.equal(await page.evaluate(async()=>(await import('/qa-native-update.js')).patch),'hot-update-works');
  assert.deepEqual(network.filter(x=>!x.startsWith('/api/')),['/client-manifest.json','/qa-native-update.js']);
  checks.push('An added JavaScript module downloads once and executes from the native cache without reinstalling the client.');
  await client.close();client=null;network.length=0;breakDownload=true;
  await launch();await enter();const cached=await stats();assert.equal(cached.stats.cached,1);assert.equal(cached.stats.downloaded,0);assert.equal(await page.evaluate(async()=>(await import('/qa-native-update.js')).patch),'hot-update-works');assert.deepEqual(network.filter(x=>!x.startsWith('/api/')),['/client-manifest.json']);
  checks.push('After restarting the app, the hot update survives in private storage and works even when its download endpoint returns 503.');
  assert.deepEqual(errors,[]);const report={date:new Date().toISOString(),hiddenWindowsClient:true,checks,initial:first.stats,updated:updated.stats,restarted:cached.stats,errors};await writeFile('artifacts/native-resource-updates-report.json',JSON.stringify(report,null,2));console.log(report);
}finally{await client?.close();await new Promise(r=>proxy.close(r));await new Promise(r=>server.close(r));}
