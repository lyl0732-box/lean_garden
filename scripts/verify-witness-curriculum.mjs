import {levels} from '../server/content.mjs';import {witnessExpression} from '../server/witness.mjs';import {sourceFor,leanRoot} from '../server/lean.mjs';import {writeFile} from 'node:fs/promises';import {spawn} from 'node:child_process';import path from 'node:path';
let count=0;
const selected=levels.filter(l=>l.solution.some(c=>c.startsWith('use ')));
const parts=selected.map(l=>sourceFor(l,l.solution.map(code=>{
  if(!code.startsWith('use '))return code;count++;const expression=code.slice(4),names=[...new Set(expression.match(/[\p{L}_][\p{L}\p{N}_'₀-₉]*/gu)||[])];
  return 'use '+witnessExpression(expression,[{hypotheses:names.map(name=>({name,isProp:false}))}],new Set(['bezout','abs']));
}),false));
const source=parts[0]+parts.slice(1).map(s=>s.slice(s.indexOf('theorem garden_'))).join('\n'),file=path.resolve('artifacts/VerifiedWitnessesV06.lean');await writeFile(file,source);
const result=await new Promise((resolve,reject)=>{const p=spawn('lake',['env','lean','--json',file],{cwd:leanRoot,windowsHide:true});let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',code=>resolve({code,out,err}));});
const diagnostics=result.out.split(/\r?\n/).flatMap(x=>{try{return[JSON.parse(x)]}catch{return[]}}),errors=diagnostics.filter(d=>d.severity==='error'||/sorryAx|declaration uses 'sorry'/.test(d.data));
const report={date:new Date().toISOString(),levels:selected.length,witnessSteps:count,passed:result.code===0&&!errors.length,errors};await writeFile('artifacts/witness-verification-v06.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(result.err)console.error(result.err);if(!report.passed)process.exitCode=1;
