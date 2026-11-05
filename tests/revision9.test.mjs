import test from 'node:test';import assert from 'node:assert/strict';
import {byId,levels} from '../server/content.mjs';import {migrateRevision9,previousN06Statement} from '../server/revision9.mjs';import {chooseQuality} from '../public/asset-cache.js';
test('level nine keeps its condition and now connects addition to successor',()=>{
  const l=byId.get('n06');assert.equal(l.number,9);assert.equal(l.statement,'(a b : Nat) (h : a = b + 1) : a + 0 = succ b');assert.ok(l.solution.includes('garden_strict_rw [Garden.add_one_eq_succ]'));assert.equal(levels.length,113);
});
test('changed level archives only its old attempt and retains earned results in both modes',()=>{
  const owner={completed:{n06:{stars:3,proof:['old']},n09:{stars:2}},attempts:{n06:{steps:['old'],revision:4},n09:{steps:['untouched'],revision:3}},practice:{completed:{},attempts:{n06:{steps:[],revision:2}}}};
  assert.equal(migrateRevision9(owner),true);assert.deepEqual(owner.attempts.n06.steps,[]);assert.equal(owner.attempts.n06.revision,5);assert.deepEqual(owner.attempts.n09.steps,['untouched']);assert.equal(owner.completed.n06.stars,3);assert.equal(owner.completed.n06.statement,previousN06Statement);assert.deepEqual(owner.legacyLevelsV8.n06.attempt.steps,['old']);assert.equal(owner.practice.curriculumVersion,9);
  owner.attempts.n06.steps=['new'];assert.equal(migrateRevision9(owner),false);assert.deepEqual(owner.attempts.n06.steps,['new']);assert.ok(!owner.legacyLevelsV8.n06.completed.statement);
});
test('resource quality defaults to highest even on slow connections and changes only by manual selection',()=>{
  assert.equal(chooseQuality({effectiveType:'3g',downlink:1.2}),'high');assert.equal(chooseQuality({effectiveType:'4g',downlink:10,saveData:true}),'high');assert.equal(chooseQuality({effectiveType:'4g',downlink:.6}),'high');assert.equal(chooseQuality({effectiveType:'4g',downlink:10}),'high');assert.equal(chooseQuality(undefined),'high');assert.equal(chooseQuality({saveData:true},'auto'),'high');assert.equal(chooseQuality(undefined,'low'),'low');
});
