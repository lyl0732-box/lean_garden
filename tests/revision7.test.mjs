import test from 'node:test';import assert from 'node:assert/strict';
import {wheelSlots,wheelIndex,evidenceKinds} from '../public/card-wheel.js';
import {tutorialStep} from '../public/guided-tutorial.js';
import {migrateChallengeV7} from '../server/revision7.mjs';
import {byId,levels} from '../server/content.mjs';

test('the evidence cylinder keeps only five neighbours and handles short or empty decks',()=>{
  const entries=Array.from({length:20},(_,i)=>({id:'e'+i}));
  assert.deepEqual(wheelSlots(entries,8).map(x=>x.offset),[-2,-1,0,1,2]);
  assert.deepEqual(wheelSlots(entries,8).map(x=>x.entry.id),['e6','e7','e8','e9','e10']);
  assert.equal(wheelSlots(entries.slice(0,2),0).length,2);assert.deepEqual(wheelSlots([],0),[]);
  assert.equal(wheelIndex(entries,{category:'theorem',drawIndices:{theorem:99}}),19);
  assert.deepEqual(evidenceKinds.map(x=>x[0]),['theorem','axiom','definition','hypothesis']);
});
test('guided lessons expose one legal next control, including pending rewards and actual proof phases',()=>{
  const state={page:'battle',tutorialActive:true,data:{progress:{tutorials:['n02']}},battle:{level:{id:'n02'},proof:[],repository:{entries:[{id:'rw-0',term:'h',kind:'hypothesis'}]}}};
  let s={skill:null,category:'hypothesis',drawIndices:{},phase:'draw',direction:'forward',mode:'all'};
  assert.equal(tutorialStep(state,s).selector,'[data-skill="rw"]');
  s.skill='rw';assert.equal(tutorialStep(state,s,'evidence-modal').selector,'[data-action="evidence-category"][data-kind="hypothesis"]');
  s.categoryChosen=true;assert.equal(tutorialStep(state,s,'evidence-modal').selector,'[data-action="draw-focused"]');
  s.entry='rw-0';s.phase='prepare';assert.equal(tutorialStep(state,s,'preparation-modal').selector,'[data-action="arm-spell"]');
  s.phase='target';assert.match(tutorialStep(state,s).selector,/data-target="goal"/);
  state.battle.proof=['rewrite'];assert.equal(tutorialStep(state,s).selector,'[data-skill="rfl"]');
  state.busy=true;assert.equal(tutorialStep(state,s).selector,null);state.busy=false;
  state.data.progress.guidedTutorials=['n02'];assert.ok(tutorialStep(state,s));
  state.tutorialActive=false;assert.equal(tutorialStep(state,s),null);
  state.tutorialActive=true;assert.ok(tutorialStep(state,s));state.battle.complete=true;assert.equal(tutorialStep(state,s),null);
});
test('replacing the duplicated challenge archives both saves once without clearing adventure progress',()=>{
  const owner={completed:{n01:{stars:3},m02:{stars:3,proof:['old']}},attempts:{n01:{steps:['rfl']},m02:{steps:['old']}},practice:{completed:{m02:{stars:2}},attempts:{m02:{steps:['old-practice']}}}};
  assert.equal(migrateChallengeV7(owner),true);assert.equal(owner.completed.n01.stars,3);assert.equal(owner.completed.m02,undefined);
  assert.equal(owner.legacyChallengesV6.m02.completed.stars,3);assert.deepEqual(owner.practice.legacyChallengesV6.m02.attempt.steps,['old-practice']);
  owner.completed.m02={stars:1};assert.equal(migrateChallengeV7(owner),false);assert.equal(owner.completed.m02.stars,1);
  const partial={completed:{m02:{stars:2}}};assert.equal(migrateChallengeV7(partial),true);assert.equal(partial.legacyChallengesV6.m02.completed.stars,2);
});
test('the second challenge is a new two-sequence induction puzzle and retains all other levels',()=>{
  const level=byId.get('m02');assert.equal(levels.length,113);assert.ok(level.solution.length>=12);
  assert.match(level.statement,/f g : Nat → Nat/);assert.match(level.statement,/∧ g n = n\*n/);
  assert.ok(level.required.includes('induction'));assert.ok(level.required.includes('rcases'));
  assert.equal(levels.some(l=>l.id!=='m02'&&l.statement===level.statement),false);
});
