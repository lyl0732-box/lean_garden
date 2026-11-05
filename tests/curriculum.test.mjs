import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, cards, chapters, campaign, challenges, commonActions, canEnter, actionsFor, unlocked } from '../server/content.mjs';
const fresh=()=>({visited:[],completed:{},attempts:{}});
test('fresh players have exactly rfl and the first level',()=>{
  const p=fresh();assert.deepEqual([...unlocked(p)],['rfl']);
  assert.deepEqual(campaign.filter(l=>canEnter(p,l)).map(l=>l.id),['n01']);
  assert.equal(challenges.filter(l=>canEnter(p,l)).length,0);
  p.visited.push('n01');assert.deepEqual(actionsFor(p,levels[0]).map(a=>a.id),['rfl']);
});
test('every campaign proof uses only cards earned up to that point',()=>{
  for(const branch of ['a','t']) {
    const p=fresh();
    for(const level of campaign.filter(l=>['n','l',branch].includes(l.chapter))) {
      assert.ok(canEnter(p,level),`${level.id} should be reachable`);
      p.visited.push(level.id);
      const allowed=actionsFor(p,level);
      for(const code of level.solution)assert.ok(allowed.some(a=>a.code===code),`${level.id}: unavailable action ${code}`);
      for(const action of allowed)assert.ok(!/\bsorry\b|\badmit\b|\baxiom\b|native_decide|run_tac|run_cmd/.test(action.code),`${level.id} contains unchecked code`);
      p.completed[level.id]={stars:3,proofVersion:4};
    }
  }
});
test('analysis and number theory open independently after logic',()=>{
  const p=fresh();campaign.filter(l=>['n','l'].includes(l.chapter)).forEach(l=>{p.visited.push(l.id);p.completed[l.id]={stars:3};});
  assert.ok(canEnter(p,levels.find(l=>l.id==='a01')));assert.ok(canEnter(p,levels.find(l=>l.id==='t01')));
  assert.ok(!canEnter(p,levels.find(l=>l.id==='a02')));
});
test('content references are unique and every challenge is playable with its requirements',()=>{
  assert.equal(new Set(levels.map(l=>l.id)).size,levels.length);
  assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);
  const p=fresh();campaign.forEach(l=>{p.visited.push(l.id);p.completed[l.id]={stars:3,proofVersion:4};});
  for(const l of levels)for(const id of [...l.skills,...l.reward,...(l.required||[])])assert.ok(cards.some(c=>c.id===id),`${l.id}: unknown card ${id}`);
  for(const level of challenges) {
    assert.ok(canEnter(p,level));
    for(const code of level.solution)assert.ok(actionsFor(p,level).some(a=>a.code===code),`${level.id}: missing action`);
    for(const action of level.actions)for(const id of [action.skill,...action.uses])assert.ok(level.required.includes(id),`${level.id}: prerequisite ${id} missing`);
  }
});
