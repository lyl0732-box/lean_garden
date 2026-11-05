import test from 'node:test';
import assert from 'node:assert/strict';
import {newSelection} from '../public/battle.js';
import {tutorialStep} from '../public/guided-tutorial.js';
import {repositoryView} from '../public/card-wheel.js';

test('opening a repository shows the theorem wheel directly, even if only another category has cards',()=>{
  const selection={...newSelection(),skill:'rw'};
  assert.equal(selection.category,'theorem');assert.equal(selection.source,'warehouse');
  const hypothesis={id:'h-entry',kind:'hypothesis',term:'h',name:'h',formula:'a = b'};
  const theorem={id:'theorem-entry',kind:'theorem',term:'example',name:'Example theorem',formula:'a = a'};
  for(const entries of [[hypothesis],[hypothesis,theorem]]){
    const html=repositoryView({entries},selection,(action,label,cls,extra)=>`<button data-action="${action}" class="${cls}" ${extra}>${label}</button>`);
    assert.equal((html.match(/data-action="evidence-category"/g)||[]).length,4);
    assert.equal((html.match(/aria-selected="false"/g)||[]).length,3);
    assert.equal((html.match(/aria-selected="true"/g)||[]).length,1);
    assert.ok(html.includes('data-kind="theorem" role="tab" aria-selected="true"'));
    assert.ok(html.includes('wheel-window'));assert.ok(html.includes('draw-focused'));
    assert.ok(!html.includes('category-intro'));assert.ok(!html.includes('data-entry="h-entry"'));
    assert.equal(html.includes('data-entry="theorem-entry"'),entries.length===2);
  }
});

test('lesson 3 teaches flipping to backward before arming and explains the resulting equality',()=>{
  const entry={id:'one-entry',term:'one_eq_succ_zero',cardId:'one_eq_succ_zero',kind:'definition'};
  const state={page:'battle',tutorialActive:true,data:{progress:{}},battle:{level:{id:'n03'},proof:[],repository:{entries:[entry]}}};
  const selection={...newSelection(),skill:'rw',entry:entry.id,phase:'prepare'};
  const flip=tutorialStep(state,selection,'preparation-modal');
  assert.equal(flip.key,'n03-backward');
  assert.equal(flip.selector,'[data-action="flip-card"][data-direction="backward"]');
  selection.direction='backward';
  assert.equal(tutorialStep(state,selection,'preparation-modal').key,'n03-arm');
  selection.phase='target';assert.match(tutorialStep(state,selection).text,/1 = 1/);
});

for(const [id,kind,entry] of [
  ['n02','hypothesis',{id:'h-entry',term:'h',kind:'hypothesis',name:'h'}],
  ['n03','definition',{id:'one-entry',term:'one_eq_succ_zero',cardId:'one_eq_succ_zero',kind:'definition',name:'数字 1 的定义'}]
])test(`${id} requires a deliberate category click before drawing, even when that category is selected`,()=>{
  const state={page:'battle',tutorialActive:true,data:{progress:{}},battle:{level:{id},proof:[],repository:{entries:[entry]}}};
  const initial=tutorialStep(state,{...newSelection(),skill:'rw'},'evidence-modal');
  assert.equal(initial.selector,`[data-action="evidence-category"][data-kind="${kind}"]`);
  const selection={...newSelection(),skill:'rw',category:kind};
  let plan=tutorialStep(state,selection,'evidence-modal');
  assert.equal(plan.key,id+'-category');
  assert.equal(plan.selector,`[data-action="evidence-category"][data-kind="${kind}"]`);
  for(const label of ['定理','公理','定义','已知命题'])assert.ok(plan.text.includes(label));
  selection.categoryChosen=true;
  assert.equal(tutorialStep(state,selection,'evidence-modal').key,id+'-draw');
  selection.category=kind==='hypothesis'?'theorem':'axiom';
  assert.equal(tutorialStep(state,selection,'evidence-modal').key,id+'-category');
  assert.equal(newSelection().categoryChosen,false);
});
