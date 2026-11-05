import test from 'node:test';
import assert from 'node:assert/strict';
import {byId,campaign,levels} from '../server/content.mjs';
import {nextHint} from '../server/hints.mjs';
import {parseRoute,routeFor} from '../public/routes.js';
import {branchTitle,branchNote,symbolGuide} from '../public/learning.js';
const profileFor=id=>({visited:[id],completed:Object.fromEntries(campaign.slice(0,campaign.findIndex(l=>l.id===id)).map(l=>[l.id,{proofVersion:4,stars:3}]))});
const goal=(target,hypotheses=[],name='')=>[{target,hypotheses,name}];
test('hints name actual unlocked controls, never change proof or suggest unearned evidence',()=>{
  const l=byId.get('n03'),p=profileFor(l.id),g=goal('succ 0 = 1'),codes=[];
  assert.equal(nextHint(p,l,codes,g,1).suggestion,null);
  const h=nextHint(p,l,codes,g,2);assert.equal(h.suggestion.skill,'rw');assert.equal(h.suggestion.category,'definition');assert.equal(h.suggestion.direction,'forward');assert.ok(h.steps.some(s=>s.includes('「定义」卡组')));assert.deepEqual(codes,[]);
  const locked=nextHint({visited:[],completed:{}},l,[],g,2);assert.equal(locked.suggestion,null);
  const one=byId.get('n05one');const equivalent=[one.solution[0].replace('garden_strict_rw','garden_strict_rw (occs := [1])')];assert.equal(nextHint(profileFor(one.id),one,equivalent,goal('succ 0 + 1 = 2'),2).suggestion.skill,'rw');
});
test('induction, apply and alternate-path hints respect actual goals',()=>{
  const l=byId.get('n07'),p=profileFor(l.id),g=goal('0 + n = n',[{name:'n',type:'Nat',isNat:true,isProp:false}]);assert.equal(nextHint(p,l,[],g,2).suggestion.variable,'n');
  const base=nextHint(p,l,[l.solution[0]],goal('0 + 0 = 0',[],'zero'),2);assert.equal(base.suggestion.skill,'rw');
  const a=byId.get('n09'),ap=profileFor(a.id);assert.equal(nextHint(ap,a,[],goal('a = b'),2).suggestion.category,'axiom');
  const two=byId.get('n02'),tp=profileFor(two.id),reverse=['garden_strict_rw [← h]'];const finish=nextHint(tp,two,reverse,goal('a = a'),2);assert.equal(finish.suggestion.skill,'rfl');
  assert.equal(nextHint(tp,two,reverse,goal('a = b'),2).suggestion,null);
  assert.equal(nextHint(p,l,[],[],2).suggestion,null);
});
test('routes retain exact level or chapter and reject malformed hashes',()=>{
  assert.deepEqual(parseRoute('#battle/n03numbers'),{page:'battle',level:'n03numbers'});
  assert.deepEqual(parseRoute('#adventure/t'),{page:'adventure',chapter:'t'});
  assert.equal(routeFor('battle','n','n07'),'#battle/n07');
  assert.equal(parseRoute('#battle/<script>').page,'home');
});
test('branch help explains induction and advanced selectors have readable labels',()=>{
  assert.match(branchTitle({name:'zero'}),/起点/);assert.match(branchNote({name:'succ'}),/ih/);
  assert.match(symbolGuide(goal('∀ n : Nat, ∃ m, n = m')),/任意一个/);
  for(const l of levels)for(const a of l.actions)assert.notEqual(a.label,a.code,`${l.id}: raw command label`);
});
