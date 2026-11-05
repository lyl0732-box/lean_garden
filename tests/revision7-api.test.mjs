import test from 'node:test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','revision7-api-'+Date.now());const id='c'.repeat(48);
await mkdir(process.env.GARDEN_DATA_DIR,{recursive:true});
const old={id,rulesVersion:4,completed:{n01:{stars:3,proofVersion:4},m02:{stars:3,proofVersion:4,proof:['garden_strict_rw [Nat.zero_add]']}},attempts:{m02:{steps:[],revision:3}},visited:[],introduced:['rfl'],topicsLearned:[],lastLevel:'n01',practice:{id,rulesVersion:4,completed:{m02:{stars:2}},attempts:{m02:{steps:[],revision:2}},visited:[],introduced:['rfl'],topicsLearned:[],lastLevel:'m02'}};
await writeFile(path.join(process.env.GARDEN_DATA_DIR,'progress.json'),JSON.stringify({version:1,profiles:{[id]:old}}));
const {createServer}=await import('../server/index.mjs');const {byId}=await import('../server/content.mjs');
test('v7 tutorial state, old minigame migration, full replacement proof and restart persistence',{timeout:180000},async()=>{
  let server,base;const cookie='garden_profile='+id;
  async function start(){server=await createServer({allowGuestForTests:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
  async function req(route,body){const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json()};}
  await start();try{
    let save=(await req('save/export')).data;assert.equal(save.version,9);assert.equal(save.completed.n01.stars,3);assert.equal(save.completed.m02,undefined);assert.equal(save.legacyChallengesV6.m02.completed.stars,3);assert.equal(save.practice.legacyChallengesV6.m02.completed.stars,2);
    await req('tutorial/seen',{level:'n02'});assert.deepEqual((await req('bootstrap')).data.progress.guidedTutorials,[]);
    await req('tutorial/seen',{level:'n02',version:7});assert.deepEqual((await req('bootstrap')).data.progress.guidedTutorials,['n02']);
    (await req('shop/claim-trial',{}),await req('progress/freeplay',{enabled:true}));let b=(await req('level/start',{level:'m02'})).data;assert.equal(b.complete,false);
    assert.equal((await req('level/step',{level:'m02',revision:b.attempt.revision,action:'m02-0'})).status,403);
    for(const code of byId.get('m02').solution){
      let payload;const rw=/^garden_strict_rw \[(← )?(.+)\]$/.exec(code);
      if(rw){const entry=b.repository.entries.find(e=>e.term===rw[2]);assert.ok(entry,code);payload={rewrite:{entry:entry.id,target:'goal',direction:rw[1]?'backward':'forward',mode:'nth',occurrences:[1]}};}
      else if(code.startsWith('induction'))payload={induction:{variable:'n'}};
      else{const action=b.actions.find(a=>a.code===code);assert.ok(action,code);payload={action:action.id};}
      const response=await req('level/step',{level:'m02',revision:b.attempt.revision,practice:true,...payload});assert.equal(response.status,200,JSON.stringify(response));b=response.data;assert.ok(!b.rejected,code+' '+JSON.stringify(b));
    }
    assert.equal(b.complete,true);await new Promise(r=>server.close(r));await start();b=(await req('level/start',{level:'m02'})).data;assert.equal(b.complete,true);assert.ok(b.proof.length>=12);assert.deepEqual(b.progress.guidedTutorials,['n02']);
    const reset=(await req('progress/reset',{confirm:'RESET'})).data;assert.deepEqual(reset.progress.guidedTutorials,[]);assert.equal(reset.progress.prologueSeen,false);
  }finally{await new Promise(r=>server.close(r));}
});
