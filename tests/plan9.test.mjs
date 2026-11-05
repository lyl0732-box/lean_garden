import test from 'node:test';import assert from 'node:assert/strict';
import {migrateEconomy,changeFreeplay,expireFreeplay,economySummary,requireFreeplayTime} from '../server/economy.mjs';
import {claimCheckin,checkinSummary} from '../server/checkin.mjs';
import {repository} from '../server/rewrite.mjs';
import {selectedRewriteCode} from '../server/rewrite-code.mjs';
import {campaign,byId,cards} from '../server/content.mjs';
import {checkLean} from '../server/lean.mjs';
const make=now=>{const p={completed:{}};migrateEconomy(p,[],now);return p;};
const start=Date.parse('2026-11-01T00:00:00+08:00'),day=86400000;
test('seven China-calendar check-ins, same-day retries, missed days and next cycle',()=>{
  const p=make(start);
  for(let i=0;i<7;i++){const r=claimCheckin(p,start+i*day);assert.equal(r.reward.day,i+1);const before=structuredClone(p);assert.equal(claimCheckin(p,start+i*day+1000).duplicate,true);assert.deepEqual(p,before);}
  assert.equal(p.economy.diamonds,380);assert.equal(p.economy.hints,10);assert.equal(p.economy.answers,3);assert.equal(p.economy.adSkips,1);
  assert.equal(checkinSummary(p,start+7*day).day,1);claimCheckin(p,start+7*day);assert.equal(p.economy.diamonds,410);
  assert.equal(checkinSummary(p,start+9*day).day,1);assert.equal(checkinSummary(p,start+9*day).completed,0);claimCheckin(p,start+9*day);assert.equal(p.economy.diamonds,440);
  const edge=make(start);claimCheckin(edge,start+day-1);assert.equal(checkinSummary(edge,start+day).day,2);
});
test('expiry deactivates free selection, retains practice and exempts admins',()=>{
  const p=make(start);p.economy.freeplayMs=100;p.practice={attempts:{n13:{steps:['saved']}}};changeFreeplay(p,true,start);
  assert.equal(expireFreeplay(p,start+99),false);assert.throws(()=>requireFreeplayTime(p,true,start+100),e=>e.code==='FREEPLAY_EMPTY');
  assert.equal(expireFreeplay(p,start+100),true);assert.equal(p.freePlay,false);assert.equal(economySummary(p,start+100).freeplayActive,false);assert.deepEqual(p.practice.attempts.n13.steps,['saved']);
  p.adminBenefits=true;changeFreeplay(p,true,start+100);assert.equal(expireFreeplay(p,start+999999),false);
});
test('split power definitions, one commutativity entry, nth-2 proof and restricted Lean editor',{timeout:90000},async()=>{
  const l=byId.get('n13'),p={completed:Object.fromEntries(campaign.map(l=>[l.id,{proofVersion:4}]))},initial=await checkLean(l,[]);
  const repo=repository(p,l,initial.goals),entry=repo.entries.find(e=>e.term==='Nat.add_comm');assert.equal(repo.entries.filter(e=>e.cardId==='add_comm').length,1);
  assert.ok(!l.solution.some(s=>s.includes('Nat.add_comm b c')));assert.equal((await checkLean(l,l.solution)).complete,true);
  for(const id of ['pow','pow_succ'])assert.equal((cards.find(c=>c.id===id).formula.match(/=/g)||[]).length,1);
  for(const id of ['abs_value','abs_nonpos','intervals','interval_open','remainder'])assert.equal((cards.find(c=>c.id===id).formula.match(/=/g)||[]).length,1);
  const after=await checkLean(l,[l.solution[0]]),nextRepo=repository(p,l,after.goals),chosen=nextRepo.entries.find(e=>e.term==='Nat.add_comm');
  for(const code of ['nth_rewrite 2 [Nat.add_comm]','rw [Nat.add_comm b c]']){
    const s=selectedRewriteCode(nextRepo,{entry:chosen.id,code},after.goals,new Set());assert.ok(s,code);const result=await checkLean(l,[l.solution[0],s.code,'garden_strict_rfl']);assert.equal(result.complete,true,JSON.stringify(result));
  }
  for(const code of ['rw [Nat.add_comm]; sorry','rw [Nat.mul_comm]','rw [Nat.add_comm (by sorry)]','rw [Nat.add_comm] at missing','nth_rewrite 65 [Nat.add_comm]','rw [Nat.add_comm] at *','rw [Nat.add_comm]\nrun_tac IO.println "oops"'])assert.equal(selectedRewriteCode(repo,{entry:entry.id,code},initial.goals,new Set()),null,code);
});
