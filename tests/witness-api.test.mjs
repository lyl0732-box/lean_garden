import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','witness-api-'+Date.now());
const {createServer}=await import('../server/index.mjs');
test('manual witnesses, onboarding, tutorial progress, reset and persisted proof',{timeout:120000},async()=>{
  let server,base,cookie='';async function start(){server=await createServer({allowGuestForTests:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}await start();
  async function req(route,body){const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return{status:r.status,data:await r.json()};}
  try{
    assert.equal((await req('bootstrap')).data.progress.prologueSeen,false);
    await req('onboarding/seen',{});await req('tutorial/seen',{level:'n01'});
    (await req('shop/claim-trial',{}),await req('progress/freeplay',{enabled:true}));let b=(await req('level/start',{level:'l10'})).data;
    assert.equal(b.actions.filter(a=>a.skill==='use').length,1);assert.equal(b.actions.find(a=>a.skill==='use').code,undefined);
    const post=witness=>req('level/step',{level:'l10',revision:b.attempt.revision,witness:{expression:witness},practice:true});
    for(const text of ['by omega','0; sorry','unknown'])assert.equal((await post(text)).status,400);
    assert.equal((await req('level/step',{level:'l10',revision:b.attempt.revision,action:'l10-0'})).status,400);
    b=(await post('3')).data;assert.equal(b.complete,true,JSON.stringify(b));assert.ok(b.proof[0].startsWith('use 3'));
    await new Promise(r=>server.close(r));await start();b=(await req('level/start',{level:'l10'})).data;assert.equal(b.complete,true);assert.equal(b.progress.prologueSeen,true);assert.ok(b.progress.tutorials.includes('n01'));
    b=(await req('level/undo',{level:'l10',revision:b.attempt.revision})).data;assert.equal(b.complete,false);
    b=(await req('level/start',{level:'l19'})).data;
    for(const skill of ['change','intro']){const action=b.actions.find(a=>a.skill===skill);const r=await req('level/step',{level:'l19',revision:b.attempt.revision,action:action.id});assert.equal(r.status,200);b=r.data;assert.ok(!b.rejected,JSON.stringify(b));}
    b=(await req('level/step',{level:'l19',revision:b.attempt.revision,witness:{expression:'y - 1'}})).data;assert.ok(!b.rejected,JSON.stringify(b));assert.match(b.goals[0].target,/y - 1/);
    b=(await req('level/step',{level:'l19',revision:b.attempt.revision,action:b.actions.find(a=>a.skill==='ring').id})).data;assert.equal(b.complete,true,JSON.stringify(b));
    const reset=(await req('progress/reset',{confirm:'RESET'})).data;assert.equal(reset.progress.prologueSeen,false);assert.deepEqual(reset.progress.tutorials,[]);assert.equal(reset.progress.freePlay,false);
  }finally{await new Promise(r=>server.close(r));}
});
