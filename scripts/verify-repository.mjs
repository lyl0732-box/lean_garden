import {levels,campaign} from '../server/content.mjs';
import {repository,selectedRewrite,selectedApply,selectedInduction} from '../server/rewrite.mjs';
import {theoremLibrary} from '../server/theorems.mjs';
import {nextHint} from '../server/hints.mjs';
import {selectedRewriteCode} from '../server/rewrite-code.mjs';
import {unlocked} from '../server/content.mjs';
import {sourceFor,leanRoot} from '../server/lean.mjs';
import {writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const checkpoints=new Map();
const sources=levels.map(level=>{
  const codes=level.solution.flatMap((code,index)=>{
    if(!/^(garden_strict_rw|garden_nat_apply|apply|induction) /.test(code))return[code];
    const key=`${level.id}:${index}`;checkpoints.set(key,{level,code,index});return[`garden_mark "${key}"`,code];
  });
  return sourceFor(level,codes,false);
});
const marking='\nopen Lean Elab Tactic\nelab "garden_mark" label:str : tactic => do\n  logInfo m!"CHECKPOINT:{label.getString}"\n  evalTactic (← `(tactic| garden_state))\n';
const source=sources[0].replace('open scoped',marking+'\nopen scoped')+sources.slice(1).map(s=>s.slice(s.indexOf('theorem garden_'))).join('\n')+'\n'+Object.values(theoremLibrary).flat().map(t=>'#check '+t).join('\n');
const file=path.resolve('artifacts/VerifiedRepository.lean');await writeFile(file,source);
const output=await new Promise((resolve,reject)=>{const p=spawn(process.env.LAKE_BIN||'lake',['env','lean','--json',file],{cwd:leanRoot,windowsHide:true});let text='';p.stdout.on('data',b=>text+=b);p.stderr.on('data',b=>process.stderr.write(b));p.on('error',reject);p.on('close',code=>resolve({code,text}));});
const messages=output.text.split(/\r?\n/).flatMap(s=>{try{return[JSON.parse(s)]}catch{return[]}});
const errors=messages.filter(m=>m.severity==='error');assert.deepEqual(errors,[]);assert.equal(output.code,0);
let key,checked=0;const counts={rewrite:0,apply:0,induction:0};
for(const message of messages){
  if(message.data?.startsWith('CHECKPOINT:'))key=message.data.slice(11);
  if(!message.data?.startsWith('GARDEN_STATE:'))continue;
  const {level,code,index:stepIndex}=checkpoints.get(key),goals=JSON.parse(message.data.slice(13));
  const index=campaign.indexOf(level),prefix=index<0?campaign:campaign.slice(0,index);
  const profile={visited:[...prefix.map(l=>l.id),level.id],completed:Object.fromEntries(prefix.map(l=>[l.id,{stars:3,proofVersion:4}]))};
  const skill=code.startsWith('garden_strict_rw')?'rewrite':code.startsWith('garden_nat_apply')?'apply':code.split(' ')[0],repo=repository(profile,level,goals,skill==='apply'?'apply':'rw');let step;
  if(skill==='rewrite'){
    const match=/^garden_strict_rw(?: \(occs := \[(\d+)\]\))? \[(← )?(.+)\](?: at (.+))?$/.exec(code);
    assert.ok(match,code);const exact=repo.entries.find(e=>e.term===match[3]),entry=exact||repo.entries.find(e=>e.term===match[3].split(/\s/)[0]);assert.ok(entry,`${key}: missing ${code}`);
    step=exact?selectedRewrite(repo,{entry:entry.id,direction:match[2]?'backward':'forward',target:match[4]||'goal',mode:match[1]?'nth':'once',occurrences:[Number(match[1]||1)]}):selectedRewriteCode(repo,{entry:entry.id,code:`${match[1]?'nth_rewrite '+match[1]:'rw'} [${match[2]||''}${match[3]}]${match[4]?' at '+match[4]:''}`},goals,unlocked(profile));
  }else if(skill==='apply'){
    const term=code.replace(/^garden_nat_apply /,'apply ').slice(6),entry=repo.entries.find(e=>e.term===term)||repo.entries.find(e=>e.term==='Nat.succ_ne_zero'&&term.startsWith('Nat.succ_ne_zero '));assert.ok(entry,`${key}: missing ${code}`);
    step=selectedApply(repo,{entry:entry.id,target:'goal'});
  }else step=selectedInduction(goals,{variable:code.split(' ')[1]});
  counts[skill]++;
  const comparable=code=>code?.replace(/Nat\.succ_ne_zero\s+n$/,'Nat.succ_ne_zero');
  assert.equal(comparable(step?.code),comparable(level.chapter==='n'?code.replace(/^apply /,'garden_nat_apply '):code),key);checked++;
  const hint=nextHint(profile,level,level.solution.slice(0,stepIndex),goals,2);
  assert.ok(hint.suggestion,`${key}: no usable hint`);
  const suggested=hint.suggestion.skill==='rw'?(hint.suggestion.mode==='code'?selectedRewriteCode(repo,hint.suggestion,goals,unlocked(profile)):selectedRewrite(repo,hint.suggestion)):hint.suggestion.skill==='apply'?selectedApply(repo,hint.suggestion):selectedInduction(goals,hint.suggestion);
  assert.equal(suggested?.code,step.code,`${key}: hint selects a different move`);
}
assert.equal(checked,checkpoints.size);
const report={date:new Date().toISOString(),levels:levels.length,checkedStates:checked,checkedHints:checked,counts,errors:[]};
await writeFile('artifacts/repository-verification.json',JSON.stringify(report,null,2));console.log(report);
