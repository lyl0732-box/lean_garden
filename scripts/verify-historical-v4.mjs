import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sourceFor,leanRoot} from '../server/lean.mjs';
import legacy from '../server/legacy-v3.json' with {type:'json'};
const db=JSON.parse(await readFile('data/progress.json','utf8')),proofs=[],seen=new Set();
for(const p of Object.values(db.profiles))for(const [id,r]of Object.entries(p.completed)){
  if(r.proofVersion===4)continue;
  const codes=r.proof||r.steps.map(s=>typeof s==='object'?s.code:legacy[id]?.actions[s]);
  if(!codes.length)continue;
  const key=JSON.stringify([r.statement||legacy[id]?.statement,codes]);if(seen.has(key))continue;seen.add(key);
  assert.ok(codes.every(Boolean),id);proofs.push(sourceFor({id:'historical_'+proofs.length,statement:r.statement||legacy[id].statement},codes,false));
}
const file=path.resolve('artifacts/HistoricalProofsV4.lean');await writeFile(file,proofs[0]+proofs.slice(1).map(s=>s.slice(s.indexOf('theorem garden_'))).join('\n'));
const result=await new Promise(resolve=>{const p=spawn('lake',['env','lean','--json',file],{cwd:leanRoot,windowsHide:true});let output='';p.stdout.on('data',d=>output+=d);p.stderr.on('data',d=>output+=d);p.on('close',code=>resolve({code,output}));});
const messages=result.output.split('\n').flatMap(s=>{try{return[JSON.parse(s)]}catch{return[]}}),errors=messages.filter(d=>d.severity==='error'||/sorryAx|declaration uses 'sorry'/.test(d.data));
const report={count:proofs.length,errors,date:new Date().toISOString()};await writeFile('artifacts/historical-v4-report.json',JSON.stringify(report,null,2));console.log(report);assert.equal(result.code,0);assert.deepEqual(errors,[]);
