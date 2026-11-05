import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {version}=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const uiVersion=version.split('.').slice(0,2).join('.');
const exportVersion=7,revision='v'+String(Number(version.split('.')[1])).padStart(2,'0');
const checks=await Promise.all(['http://localhost:3210','http://100.83.142.93:3210','http://desktop-n9bri0f-2.tail91dba6.ts.net:3210'].map(async url=>{
  const [page,health,script]=await Promise.all([fetch(url,{signal:AbortSignal.timeout(15000)}),fetch(url+'/api/health',{signal:AbortSignal.timeout(15000)}).then(r=>r.json()),fetch(url+'/app.js',{signal:AbortSignal.timeout(15000)}).then(r=>r.text())]);
  assert.equal(page.status,200);assert.equal(health.ready,true);assert.ok(script.includes('v'+uiVersion));
  return {url,status:page.status,leanReady:health.ready,version:health.version,uiVersion};
}));
const response=await fetch('http://localhost:3210/api/bootstrap'),cookie=response.headers.get('set-cookie').split(';')[0],boot=await response.json();
const onboarding=await fetch('http://localhost:3210/api/onboarding/seen',{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:'{}'});assert.equal(onboarding.status,200);
const save=await(await fetch('http://localhost:3210/api/save/export',{headers:{cookie}})).json();assert.equal(save.version,exportVersion);assert.equal(typeof boot.progress.prologueSeen,'boolean');assert.ok(Array.isArray(boot.progress.guidedTutorials));assert.equal(boot.levels.find(l=>l.id==='m02').title,'双生数列塔');
const report={date:new Date().toISOString(),testedFrom:'host computer',remoteLaptopBrowserTested:false,checks,backend:{levels:boot.levels.length,addOneLevel:boot.levels.find(l=>l.id==='n06a').number,inductionLevel:boot.levels.find(l=>l.id==='n07').number,exportVersion:save.version,prologueEndpointAvailable:true}};
await writeFile('artifacts/access-'+revision+'.json',JSON.stringify(report,null,2));console.log(report);
