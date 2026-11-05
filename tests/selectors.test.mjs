import test from 'node:test';
import assert from 'node:assert/strict';
import {checkLean} from '../server/lean.mjs';
import {selectedRewrite,selectedApply,selectedInduction,repository} from '../server/rewrite.mjs';
import {campaign,byId,unlocked,cards} from '../server/content.mjs';
import {cardArtIds} from '../public/card-art.js';
const all={completed:Object.fromEntries(campaign.map(l=>[l.id,{stars:3,proofVersion:4}])),visited:[]};
const inspect=(id,statement,codes=[])=>checkLean({id,statement},codes);
test('rewrite occurrence and bounded repeat preserve explicit closing; invalid/cyclic rewrites reject',{timeout:90000},async()=>{
  const statement='(a b : Nat) (h : a = b) : a + a = b + b';
  const initial=await inspect('nth',statement);const repo=repository(all,byId.get('m01'),initial.goals);const entry=repo.entries.find(e=>e.term==='h');
  const selection={entry:entry.id,target:'goal',direction:'forward',mode:'nth',occurrence:2};
  const action=selectedRewrite(repo,selection);const result=await inspect('nth',statement,[action.code]);
  assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.complete,false);assert.equal(result.goals[0].target,'a + b = b + b');
  for(const occurrence of [0,65,1.5,'2'])assert.equal(selectedRewrite(repo,{...selection,occurrence}),null);
  assert.equal(selectedRewrite(repo,{...selection,target:'h; sorry'}),null);
  const repeated=await inspect('repeat','(n : Nat) : 0 + (0 + n) = n',['garden_repeat_rewrite [Nat.zero_add]']);assert.equal(repeated.ok,true,JSON.stringify(repeated));assert.equal(repeated.complete,false);assert.equal(repeated.goals[0].target,'n = n');
  assert.equal((await inspect('repeat','(n : Nat) : 0 + (0 + n) = n',['garden_repeat_rewrite [Nat.zero_add]','rfl'])).complete,true);
  const at=await inspect('repeatAt','(n : Nat) (h : 0 + (0 + n) = n) : n = n',['garden_repeat_rewrite [Nat.zero_add] at h']);assert.equal(at.ok,true);assert.equal(at.goals[0].hypotheses.find(h=>h.name==='h').type,'n = n');
  const cycle=await inspect('cycle','(a b : Nat) : a + b = b + a',['garden_repeat_rewrite [Nat.add_comm]']);assert.equal(cycle.ok,false);assert.ok(cycle.errors.join().includes('循环改写'));
  const absent=await inspect('absent','(n : Nat) : n = n',['garden_repeat_rewrite [Nat.zero_add]']);assert.equal(absent.ok,false);assert.ok(absent.errors.join().includes('没有可改写'));
});
test('apply transforms an explicitly chosen proposition; induction selects either Nat variable',{timeout:60000},async()=>{
  const statement='(P Q : Prop) (hp : P) (f : P → Q) : Q',initial=await inspect('applyAt',statement);
  const repo=repository(all,byId.get('l08'),initial.goals,'apply');const entry=repo.entries.find(e=>e.term==='f');
  const move=selectedApply(repo,{entry:entry.id,target:'hp'}),r=await inspect('applyAt',statement,[move.code]);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.goals[0].hypotheses.find(h=>h.name==='hp').type,'Q');assert.equal((await inspect('applyAt',statement,[move.code,'apply hp'])).complete,true);
  assert.equal(selectedApply(repo,{entry:entry.id,target:'P'}),null);
  const natural='(a b : Nat) (h : a = b) : a + b = b + a',n=await inspect('inductionVars',natural);
  for(const variable of ['a','b']){const action=selectedInduction(n.goals,{variable});assert.ok(action);const r=await inspect('inductionVars',natural,[action.code]);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.goals.length,2);assert.ok(!JSON.stringify(r.goals).includes('Nat.succ'));}
  for(const variable of ['h','unknown','a; sorry'])assert.equal(selectedInduction(n.goals,{variable}),null);
});
test('bridge, completion unlocks, removed skills, and card artwork remain coherent',()=>{
  assert.equal(byId.get('n07').number,11);assert.ok(byId.get('n06a').number<byId.get('n07').number);
  const profile={visited:['n01'],completed:{n01:{stars:3}}};assert.ok(unlocked(profile).has('rw'));assert.ok(!unlocked(profile).has('induction'));
  for(const card of cards){assert.ok(!['exact','assumption'].includes(card.id));assert.ok(cardArtIds.includes(card.id),`missing image ${card.id}`);}
  for(const l of campaign)assert.ok(!l.solution.some(code=>/^(exact|assumption)\b/.test(code)));
});
test('strict surface rules block calculation shortcuts and rewrite exactly selected matches',{timeout:120000},async()=>{
  assert.equal((await inspect('strictRfl',': (0 : Nat)+0=0',['garden_strict_rfl'])).ok,false);
  assert.equal((await inspect('strictRfl',': (0 : Nat)+0=0',['garden_strict_rw [Nat.add_zero]','garden_strict_rfl'])).complete,true);
  assert.equal((await inspect('strictSucc','(n : Nat) : n+1=Nat.succ n',['garden_strict_rw [Nat.add_succ]'])).ok,false);
  assert.equal((await inspect('applySkip',': (0 : Nat)*0=0',['garden_nat_apply Nat.add_zero'])).ok,false);
  assert.equal((await inspect('applyDefinition','(n : Nat) : n+0=n',['garden_nat_apply Nat.add_zero'])).complete,true);
  const s='(a b : Nat) (h : a=b) : a+a=b+b';
  const one=await inspect('strictFirst',s,['garden_strict_rw [h]']);assert.equal(one.goals[0].target,'b + a = b + b');assert.equal(one.complete,false);
  const preview=await inspect('strictPreview',s,['garden_rewrite_matches [h]']);assert.deepEqual(preview.matches.map(m=>m.index),[1,2]);
  const repo=repository(all,byId.get('m01'),preview.goals),entry=repo.entries.find(e=>e.term==='h');
  const move=selectedRewrite(repo,{entry:entry.id,target:'goal',direction:'forward',mode:'nth',occurrences:[1,2]});
  const both=await inspect('strictBoth',s,[move.code]);assert.equal(both.goals[0].target,'b + b = b + b');assert.equal(both.complete,false);
  const digits=await inspect('numericMatches',': (1 : Nat)+1=2',['garden_rewrite_matches [Garden.one_eq_succ_zero]']);assert.deepEqual(digits.matches.map(m=>m.context),['selected + 1 = 2','1 + selected = 2']);
  const digitTwo=await inspect('numericNth',': (1 : Nat)+1=2',['garden_strict_rw (occs := [2]) [Garden.one_eq_succ_zero]']);assert.equal(digitTwo.goals[0].target,'1 + succ 0 = 2');
  for(const occurrences of [[],[0],[65],[1,1],['2'],[1.5]])assert.equal(selectedRewrite(repo,{entry:entry.id,target:'goal',direction:'forward',mode:'nth',occurrences}),null);
});
test('theorems require their own completed proof, with all original levels retained',async()=>{
  const {readFile}=await import('node:fs/promises');const old=JSON.parse(await readFile(new URL('../server/legacy-v3.json',import.meta.url),'utf8'));
  for(const [id,l] of Object.entries(old)){
    assert.ok(byId.has(id));
    const current=byId.get(id).statement.replaceAll('Nat.succ','succ'),previous=l.statement.replaceAll('Nat.succ','succ');
    // Only the duplicate second minigame was explicitly replaced in v0.7.
    if(['m02','n06'].includes(id))assert.notEqual(current,previous,id);else assert.equal(current,previous,id);
  }
  const p={completed:{},attempts:{}};
  for(const l of campaign){const before=unlocked(p);for(const c of cards.filter(c=>c.kind==='theorem'&&c.proofLevel===l.id))assert.equal(before.has(c.id),false,`${c.id} granted before proof`);p.completed[l.id]={proofVersion:4};for(const c of cards.filter(c=>c.kind==='theorem'&&c.proofLevel===l.id))assert.ok(unlocked(p).has(c.id));}
  assert.equal(cards.filter(c=>c.kind==='axiom').length,2);
  for(const id of ['one_eq_succ_zero','add_zero','add_succ'])assert.equal(cards.find(c=>c.id===id).kind,'definition');
});
