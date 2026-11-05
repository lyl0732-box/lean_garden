import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','freeplay-api-'+Date.now());
const {createServer}=await import('../server/index.mjs');
test('free selection, persistence, no own theorem, rejected nth and main progress isolation',{timeout:180000},async()=>{
  let server,base,cookie='';async function start(){server=await createServer({allowGuestForTests:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}await start();
  async function req(route,body){const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return{status:r.status,data:await r.json()};}
  try{
    assert.equal((await req('level/start',{level:'t20'})).status,403);
    const free=(await req('shop/claim-trial',{}),await req('progress/freeplay',{enabled:true}));assert.ok(free.data.progress.freePlay);assert.equal(free.data.levels.filter(l=>l.open).length,113);
    let b=(await req('level/start',{level:'n12',practice:true})).data;assert.ok(!b.applyRepository.entries.some(e=>e.term==='Nat.add_comm'));assert.ok(b.repository.entries.some(e=>e.term==='Nat.succ_add'));assert.deepEqual(b.introductions,[]);
    b=(await req('level/start',{level:'n03'})).data;const initial=structuredClone(b.goals),entry=b.repository.entries.find(e=>e.term==='Garden.one_eq_succ_zero');
    const bad=(await req('level/step',{level:'n03',revision:b.attempt.revision,rewrite:{entry:entry.id,target:'goal',direction:'forward',mode:'nth',occurrences:[1,10]}})).data;assert.ok(bad.rejected);assert.equal(bad.attempt.steps.length,0);assert.match(bad.explanation.help,/超过实际出现次数/);
    b=(await req('level/start',{level:'n03'})).data;assert.deepEqual(b.goals,initial);
    b=(await req('level/step',{level:'n03',revision:b.attempt.revision,rewrite:{entry:entry.id,target:'goal',direction:'forward',mode:'once'}})).data;assert.equal(b.complete,false);
    b=(await req('level/step',{level:'n03',revision:b.attempt.revision,action:'rfl'})).data;assert.equal(b.complete,true);
    await new Promise(r=>server.close(r));await start();assert.ok((await req('bootstrap')).data.progress.completed.n03);
    const normal=(await req('progress/freeplay',{enabled:false})).data;assert.deepEqual(normal.progress.completed,{});assert.deepEqual(normal.progress.unlocked,['rfl']);assert.equal((await req('level/start',{level:'n03'})).status,403);
    assert.equal((await req('level/start',{level:'n01',practice:true})).status,409);
    const exportSave=(await req('save/export')).data;assert.equal(exportSave.version,9);assert.ok(exportSave.practice.completed.n03);assert.deepEqual(exportSave.completed,{});
    const again=((await req('shop/claim-trial',{}),await req('progress/freeplay',{enabled:true}))).data;assert.ok(again.progress.completed.n03);const reset=(await req('progress/reset',{confirm:'RESET'})).data;assert.equal(reset.progress.freePlay,false);assert.deepEqual(reset.progress.completed,{});
  }finally{await new Promise(r=>server.close(r));}
});
