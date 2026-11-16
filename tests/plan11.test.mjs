import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {campaign,byId} from '../server/content.mjs';
import {repository} from '../server/rewrite.mjs';
import {selectedRewriteCode} from '../server/rewrite-code.mjs';
import {nextHint} from '../server/hints.mjs';
import {checkLean} from '../server/lean.mjs';

process.env.GARDEN_DATA_DIR=path.resolve('artifacts','plan11-api-'+Date.now());
const {createServer}=await import('../server/index.mjs');
const profileFor=l=>({completed:Object.fromEntries(campaign.slice(0,campaign.indexOf(l)).map(l=>[l.id,{proofVersion:4}]))});

test('level 7 accepts the screenshot reverse proof and restores it; rfl cannot calculate the initial goal',{timeout:120000},async()=>{
  let server,base,cookie='';
  async function start(){server=await createServer({allowGuestForTests:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
  async function req(route,body){const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
  await start();
  try{
    await req('bootstrap');await req('shop/claim-trial',{});await req('progress/freeplay',{enabled:true});
    let b=await req('level/start',{level:'n06a',practice:true});
    let r=await req('level/step',{level:'n06a',practice:true,revision:b.attempt.revision,action:'rfl'});
    assert.equal(r.rejected,true);assert.equal(r.attempt.steps.length,0);b.attempt=r.attempt;
    const reverse=[['Nat.add_zero','code','nth_rewrite 2 [← Nat.add_zero n]'],['Nat.add_succ','all'],['Garden.one_eq_succ_zero','all']];
    for(const [term,mode,code]of reverse){
      const entry=b.repository.entries.find(e=>e.term===term);assert.ok(entry,term);
      b=await req('level/step',{level:'n06a',practice:true,revision:b.attempt.revision,rewrite:{entry:entry.id,target:'goal',direction:'backward',mode,code}});
      assert.ok(!b.rejected,JSON.stringify(b));assert.equal(b.complete,false);
    }
    assert.equal(b.goals[0].target,'n + 1 = n + 1');
    assert.equal(nextHint(profileFor(byId.get('n06a')),byId.get('n06a'),b.proof,b.goals,2).suggestion.skill,'rfl');
    b=await req('level/step',{level:'n06a',practice:true,revision:b.attempt.revision,action:'rfl'});assert.equal(b.complete,true);
    await new Promise(r=>server.close(r));await start();
    b=await req('level/start',{level:'n06a',practice:true});assert.equal(b.complete,true);assert.equal(b.proof.length,4);
    const exported=await fetch(base+'/api/proof/export?level=n06a&practice=true',{headers:{Cookie:cookie}});
    assert.equal(exported.status,200);assert.ok((await exported.text()).includes('garden_strict_rfl'));
  }finally{await new Promise(r=>server.close(r));}
});

test('all campaign repositories have one card per commutativity theorem; level 28 and 30 precise proofs remain usable',{timeout:120000},async()=>{
  const all={completed:Object.fromEntries(campaign.map(l=>[l.id,{proofVersion:4}]))};
  for(const l of campaign)for(const skill of ['rw','apply']){
    const repo=repository(all,l,[{target:'x = x',hypotheses:[]}],skill);
    for(const id of ['add_comm','mul_comm'])assert.equal(repo.entries.filter(e=>e.cardId===id).length,1,`${l.id} ${skill} ${id}`);
  }
  for(const number of [28,30]){
    const l=campaign.find(l=>l.chapter==='n'&&l.number===number),p=profileFor(l),codes=[];
    for(const code of l.solution){
      if(code.includes('[Nat.mul_comm ')){
        const state=await checkLean(l,codes),repo=repository(p,l,state.goals),entry=repo.entries.find(e=>e.term==='Nat.mul_comm');
        assert.ok(entry);assert.equal(repo.entries.filter(e=>e.cardId==='mul_comm').length,1);
        const selected=selectedRewriteCode(repo,{entry:entry.id,target:'goal',code:code.replace('garden_strict_rw','rw')},state.goals,new Set());
        assert.ok(selected,code);assert.equal(selected.code,code);
      }
      codes.push(code);
    }
    assert.equal((await checkLean(l,codes)).complete,true,l.id);
  }
});
