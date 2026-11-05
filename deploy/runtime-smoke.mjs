import {engineHealth,checkLean} from '../server/lean.mjs';import {byId} from '../server/content.mjs';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {spawn} from 'node:child_process';import path from 'node:path';
const env=JSON.parse(await readFile(process.env.GARDEN_LEAN_ENV,'utf8'));
await new Promise((resolve,reject)=>{const p=spawn(path.join(env.LEAN_SYSROOT,'bin/lean'),['--json',path.resolve('deploy/VerifiedCurriculum.lean')],{cwd:'lean',env:{...process.env,...env},stdio:'inherit'});p.on('error',reject);p.on('close',c=>c===0?resolve():reject(new Error('Full curriculum failed in reduced runtime')));});
assert.equal((await engineHealth()).ready,true);
for(const id of ['n06','n09','a22','t20']){const l=byId.get(id),result=await checkLean(l,l.solution);assert.equal(result.complete,true,id+': '+JSON.stringify(result));}
const regression=await checkLean(byId.get('n09'),['replace h := (Nat.succ.inj) h','garden_repeat_rewrite [← h]','garden_strict_rfl']);assert.equal(regression.complete,true,JSON.stringify(regression));
console.log('Pruned Lean runtime and representative proofs passed.');
