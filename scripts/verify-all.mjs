import { levels } from '../server/content.mjs';
import { sourceFor, leanRoot } from '../server/lean.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';
await mkdir('artifacts',{recursive:true});
const parts=levels.map(l=>sourceFor(l,l.solution,false));
const source=parts[0]+parts.slice(1).map(s=>s.slice(s.indexOf('theorem garden_'))).join('\n')+
  '\n#print axioms garden_n24\n#print axioms garden_l24\n#print axioms garden_a22\n#print axioms garden_t20\n';
const file=path.resolve('artifacts/VerifiedCurriculum.lean');
await writeFile(file,source);
const start=Date.now();
const outcome=await new Promise((resolve,reject)=>{
  const p=spawn(process.env.LAKE_BIN||'lake',['env','lean','--json',file],{cwd:leanRoot,windowsHide:true});let output='',error='';
  p.stdout.on('data',x=>output+=x);p.stderr.on('data',x=>error+=x);p.on('error',reject);p.on('close',code=>resolve({code,output,error}));
});
const diagnostics=outcome.output.split(/\r?\n/).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}});
const errors=diagnostics.filter(d=>d.severity==='error'||/sorryAx|declaration uses 'sorry'/.test(d.data));
const ok=outcome.code===0&&!errors.length;
const report={date:new Date().toISOString(),count:levels.length,verified:ok?levels.length:0,elapsed:Date.now()-start,sha256:createHash('sha256').update(source).digest('hex'),axioms:diagnostics.filter(d=>d.data?.includes('depends on axioms')).map(d=>d.data),errors};
await writeFile('artifacts/final-verification.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(outcome.error)console.error(outcome.error);process.exitCode=ok?0:1;
