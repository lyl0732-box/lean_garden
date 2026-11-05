import test from 'node:test';import assert from 'node:assert/strict';
import {witnessExpression,actionTarget} from '../server/witness.mjs';
import {cards,levels} from '../server/content.mjs';import {reversedFormula} from '../public/spell-flow.js';
const goals=[{hypotheses:['a','b','m','n','u','v','y','ε','f'].map(name=>({name,isProp:false})).concat({name:'h',isProp:true})}];
test('manual witnesses preserve arithmetic structure and function application',()=>{
  assert.equal(witnessExpression('(a-b)*u',goals),'((a - b) * u)');
  assert.equal(witnessExpression('a-b*u',goals),'(a - (b * u))');
  assert.equal(witnessExpression('ε / 2',goals),'(ε / 2)');
  assert.equal(witnessExpression('Int.gcdA m n',goals,new Set(['bezout'])),'((Int.gcdA m) n)');
  assert.equal(witnessExpression('f (y-1)',goals),'(f (y - 1))');
  assert.equal(witnessExpression('2^3^2',goals),'(2 ^ (3 ^ 2))');
});
test('witnesses cannot inject tactics, declarations, holes, or unknown constants',()=>{
  for(const value of ['by omega','sorry','_','0; exact h','0\nset_option maxRecDepth 0','(by native_decide)','Nat.rec','Int.gcdA m n','h','1 -- comment','0 := 1','(1+2','a.b','"x"','0\n#eval 1'])assert.throws(()=>witnessExpression(value,goals),value);
  assert.throws(()=>witnessExpression('('.repeat(30)+'1'+')'.repeat(30),goals));
});
test('only two Peano axiom cards remain and all 113 lessons are retained',()=>{
  assert.equal(levels.length,113);assert.deepEqual(cards.filter(c=>c.kind==='axiom').map(c=>c.id),['succ_ne','succ_inj']);
  for(const l of levels)assert.ok(![...l.skills,...l.reward].some(id=>id.startsWith('peano_')));
});
test('effect targets follow rcases, specialize, and explicit at locations',()=>{
  const g=[{hypotheses:[{name:'h'},{name:'hx'}]}];
  for(const code of ['rcases h with ⟨a,b⟩','rcases abs_lt.mp h with ⟨a,b⟩','specialize h 0','change P at h','simp only [sub_zero] at h'])assert.equal(actionTarget({code},g),'h');
  assert.equal(actionTarget({code:'constructor'},g),'goal');
});
test('flipping the card reverses the equality while retaining quantifiers',()=>{
  assert.equal(reversedFormula('1 = succ 0'),'succ 0 = 1');
  assert.equal(reversedFormula('∀ n, n + 0 = n'),'∀ n, n = n + 0');
  assert.equal(reversedFormula('(a + b) = c'),'c = (a + b)');
  assert.equal(reversedFormula('P ↔ Q'),'Q ↔ P');
});
