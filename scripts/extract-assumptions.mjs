// Regenerate migration data from the frozen v2 curriculum, never the converted v3 one.
import {sourceFor,leanRoot} from '../server/lean.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
const levels=JSON.parse(await readFile(new URL('../artifacts/curriculum-v2.json',import.meta.url),'utf8'));
if(!levels.some(l=>l.solution.includes('assumption')))throw new Error('Expected the frozen v2 curriculum with assumption steps');
const marking='\nopen Lean Meta Elab Tactic\nelab "garden_mark" label:str : tactic => do\n  let goal ← getMainGoal\n  goal.withContext do\n    for d in (← getLCtx) do\n      if !d.isImplementationDetail then\n        if ← isDefEq d.type (← goal.getType) then\n          logInfo m!"ASSUME:{label.getString}:{d.userName}"\n';
const parts=levels.map(l=>sourceFor(l,l.solution.flatMap((c,i)=>c==='assumption'?[`garden_mark "${l.id}:${i}"`,c]:[c]),false));
const file=path.resolve('artifacts/Assumptions.lean');await writeFile(file,parts[0].replace('open scoped',marking+'\nopen scoped')+parts.slice(1).map(s=>s.slice(s.indexOf('theorem garden_'))).join('\n'));
const output=await new Promise((resolve,reject)=>{const p=spawn('lake',['env','lean','--json',file],{cwd:leanRoot,windowsHide:true});let s='';p.stdout.on('data',d=>s+=d);p.on('error',reject);p.on('close',code=>{if(code)reject(new Error(s));else resolve(s);});});
let key;const mapping={};
for(const line of output.split(/\r?\n/)){let d;try{d=JSON.parse(line).data}catch{continue}if(d?.startsWith('ASSUME:')){const[,id,index,name]=d.split(':');mapping[`${id}:${index}`]||='apply '+name;}}
for(const l of levels)l.solution.forEach((c,i)=>{if(c==='assumption'&&!mapping[`${l.id}:${i}`])throw new Error(`${l.id}:${i} missing`);});
await writeFile('server/assumption-replacements.json',JSON.stringify(mapping,null,2));console.log(mapping);
