import test from 'node:test';
import assert from 'node:assert/strict';
import {offersTutorial,tutorialStep} from '../public/guided-tutorial.js';
import {newSelection} from '../public/battle.js';

for(const id of ['n01','n02','n03'])test(`${id} offers help but never starts the lesson without opting in`,()=>{
  const state={page:'battle',story:null,data:{progress:{}},battle:{level:{id},proof:[]}};
  assert.equal(offersTutorial(state),true);assert.equal(tutorialStep(state,newSelection()),null);
  state.tutorialActive=true;assert.ok(tutorialStep(state,newSelection()));
  state.tutorialActive=false;assert.equal(tutorialStep(state,newSelection()),null);
  assert.deepEqual(state.battle.proof,[]);
  state.data.progress={freePlay:true,guidedTutorials:[id]};
  assert.equal(offersTutorial(state),true);assert.equal(tutorialStep(state,newSelection()),null);
  state.tutorialActive=true;assert.ok(tutorialStep(state,newSelection()));
});

test('tutorial help is only available during an unfinished opening level',()=>{
  const state={page:'battle',story:null,tutorialActive:true,battle:{level:{id:'n01'},proof:[]}};
  for(const changes of [{page:'home'},{story:0},{battle:{level:{id:'n01'},complete:true}},{battle:{level:{id:'n04'}}},{battle:null}]){
    const inactive={...state,...changes};assert.equal(offersTutorial(inactive),false);assert.equal(tutorialStep(inactive,newSelection()),null);
  }
});
