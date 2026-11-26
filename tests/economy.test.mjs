import test from 'node:test';import assert from 'node:assert/strict';
import {migrateEconomy,economySummary,beginRun,awardRun,useHint,useAnswer,claimBeta,refillEnergy,grantPurchase,growth,threshold} from '../server/economy.mjs';
import {evolvedMascot,evolution} from '../public/yaya-forms.js';

const make=(now=1000000)=>{const p={id:'test',completed:{}};migrateEconomy(p,[],now);return p;};
test('energy restores whole five-minute ticks, caps at 50, preserves a partial tick and never trusts a backwards clock',()=>{
  const now=1000000,p=make(now),a={};beginRun(p,a,now);assert.equal(economySummary(p,now).energy,45);
  assert.equal(beginRun(p,a,now+1),false);assert.equal(economySummary(p,now+299999).energy,45);
  assert.equal(economySummary(p,now+300000).energy,46);assert.equal(economySummary(p,now+300000).nextIn,300000);
  beginRun(p,{},now+360000);assert.equal(economySummary(p,now+360000).energy,41);assert.equal(economySummary(p,now+360000).nextIn,240000);
  assert.equal(economySummary(p,now-2000).energy,41);assert.equal(economySummary(p,now+100*300000).energy,50);
  p.economy.energy=0;p.economy.energyAt=now;const empty={};assert.throws(()=>beginRun(p,empty,now),e=>e.code==='ENERGY_EMPTY');assert.deepEqual(empty,{});
});
test('one-time beta gift, atomic voucher refill and packet inventories survive adventure resets',()=>{
  const p=make();assert.equal(p.economy.hints,5);assert.equal(p.economy.answers,0);assert.equal(p.economy.adSkips,0);
  claimBeta(p);assert.equal(p.economy.adSkips,3);assert.throws(()=>claimBeta(p),e=>e.code==='BETA_CLAIMED');
  assert.throws(()=>refillEnergy(p,1000000),e=>e.code==='ENERGY_FULL');assert.equal(p.economy.adSkips,3);
  beginRun(p,{},1000000);refillEnergy(p,1000000);assert.equal(p.economy.energy,50);assert.equal(p.economy.adSkips,2);
  for(let i=0;i<5;i++)useHint(p);assert.throws(()=>useHint(p),e=>e.code==='HINTS_EMPTY');
  const a={hints:0};assert.throws(()=>useAnswer(p,a),e=>e.code==='ANSWERS_EMPTY');grantPurchase(p,'first6','order1');assert.equal(p.economy.answers,10);
  assert.equal(useAnswer(p,a),true);assert.equal(useAnswer(p,a),false);assert.equal(p.economy.answers,9);assert.equal(a.hints,1);
  assert.equal(grantPurchase(p,'first6','order1'),false);assert.throws(()=>grantPurchase(p,'first6','order2'));
  p.completed={};assert.equal(migrateEconomy(p),false);assert.equal(p.economy.betaClaimed,true);assert.equal(p.economy.adSkips,2);
});
test('each paid run rewards XP once; migration preserves proofs and all eight mascot forms differ',()=>{
  const p=make(),a={};beginRun(p,a,1000000);assert.deepEqual(awardRun(p,a,{}),{xp:100,before:1,after:2});assert.equal(awardRun(p,a,{}),null);
  assert.equal(growth(threshold(8)).level,8);assert.equal(evolution(22).stage,7);assert.equal(evolution(3).stage,1);
  const levels=[1,3,5,8,11,14,18,22];assert.equal(new Set(levels.map(evolvedMascot)).size,8);
  const old={completed:{n01:{stars:3,proof:['rfl']},n07:{stars:2}},attempts:{n02:{steps:[]}}},before=structuredClone(old);
  migrateEconomy(old,[{id:'n01'},{id:'n07',miniBoss:true}],1000000);assert.equal(old.economy.xp,300);assert.deepEqual(old.completed,before.completed);assert.deepEqual(old.attempts,before.attempts);
});
