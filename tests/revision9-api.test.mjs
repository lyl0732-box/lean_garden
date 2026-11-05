import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','revision9-api-'+Date.now());
const {createServer}=await import('../server/index.mjs');
test('actual alternate level 13 proof closes with rfl; level 9 requires the successor bridge',{timeout:120000},async()=>{
  const server=await createServer({allowGuestForTests:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let cookie;
  async function req(route,body){const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));assert.ok(!data.rejected,JSON.stringify(data));return data;}
  try{
    await req('bootstrap');(await req('shop/claim-trial',{}),await req('progress/freeplay',{enabled:true}));
    let b=await req('level/start',{level:'n09'});const axiom=b.applyRepository.entries.find(e=>e.term==='Nat.succ.inj');b=await req('level/step',{level:'n09',revision:b.attempt.revision,practice:true,apply:{entry:axiom.id,target:'h'}});assert.equal(b.goals[0].hypotheses.find(h=>h.name==='h').type,'a = b');
    const h=b.repository.entries.find(e=>e.term==='h');b=await req('level/step',{level:'n09',revision:b.attempt.revision,practice:true,rewrite:{entry:h.id,target:'goal',direction:'backward',mode:'all'}});assert.equal(b.goals[0].target,'a = a');
    b=await req('level/step',{level:'n09',revision:b.attempt.revision,practice:true,action:b.actions.find(a=>a.skill==='rfl').id});assert.equal(b.complete,true);
    b=await req('level/start',{level:'n06'});assert.equal(b.goals[0].target,'a + 0 = succ b');
    for(const term of ['h','Nat.add_zero','Garden.add_one_eq_succ']){const e=b.repository.entries.find(e=>e.term===term);assert.ok(e,term);b=await req('level/step',{level:'n06',revision:b.attempt.revision,practice:true,rewrite:{entry:e.id,target:'goal',direction:'forward',mode:'nth',occurrences:[1]}});assert.equal(b.complete,false);}
    assert.equal(b.goals[0].target,'succ b = succ b');b=await req('level/step',{level:'n06',revision:b.attempt.revision,practice:true,action:b.actions.find(a=>a.skill==='rfl').id});assert.equal(b.complete,true);
  }finally{await new Promise(r=>server.close(r));}
});
