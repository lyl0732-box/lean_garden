import test from 'node:test';
import assert from 'node:assert/strict';
import {levels,campaign,byId,cards,unlocked,actionsFor} from '../server/content.mjs';
import {repository} from '../server/rewrite.mjs';
import {explainLeanError} from '../server/error-guide.mjs';
test('all old levels remain; add-one precedes the first boss; succ_add exists',()=>{
  assert.equal(levels.length,113);assert.equal(byId.get('n06a').number,7);assert.equal(byId.get('n05one').number,8);assert.equal(byId.get('n07').number,11);
  assert.equal(byId.get('n11succ').number,16);assert.ok(byId.get('n11succ').reward.includes('succ_add'));assert.ok(byId.get('n05one').miniBoss);
});
test('free selection loans the prerequisites of every lesson, never its own unproved theorem',()=>{
  for(const level of levels){
    const p={isPractice:true,lastLevel:level.id,completed:{},visited:[]};const known=unlocked(p),allowed=actionsFor(p,level);
    for(const code of level.solution)assert.ok(allowed.some(a=>a.code===code),`${level.id}: unavailable loan ${code}`);
    for(const c of cards.filter(c=>c.kind==='theorem'&&c.proofLevel===level.id))assert.ok(!known.has(c.id),`${level.id}: own theorem ${c.id} loaned`);
  }
});
test('warehouse and collection have one discovery order across levels',()=>{
  const p={completed:Object.fromEntries(campaign.map(l=>[l.id,{proofVersion:4}]))},goals=[{target:'a = b',hypotheses:[]}];
  for(const id of ['n03','n05','n12','a16','t20']){
    const entries=repository(p,byId.get(id),goals).entries.filter(e=>e.kind!=='hypothesis');
    const ranks=entries.map(e=>cards.find(c=>c.id===e.cardId).order);assert.deepEqual(ranks,[...ranks].sort((a,b)=>a-b),id);
  }
  assert.ok(cards.find(c=>c.id==='add_zero').order<cards.find(c=>c.id==='add_succ').order);
});
test('common errors provide plain-language cause and recovery',()=>{
  assert.match(explainLeanError('所选位置没有形状完全相同的内容').help,/超过实际出现次数/);
  assert.match(explainLeanError('Tactic `apply` failed: failed to unify').title,/接不上/);
  assert.match(explainLeanError('两边还没有完全相同').help,/rfl/);
});
