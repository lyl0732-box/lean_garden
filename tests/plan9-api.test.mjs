import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','plan9-api-'+Date.now());
const {createServer}=await import('../server/index.mjs');const {profileById,save}=await import('../server/store.mjs');
test('check-in account isolation/persistence and expired practice cannot keep stepping',{timeout:90000},async()=>{
  let server,base,cookie='';async function start(){server=await createServer({allowGuestForTests:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
  await start();
  async function req(route,body){const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return{status:r.status,data:await r.json()};}
  try{
    await req('bootstrap');const firstCookie=cookie;
    const claims=await Promise.all(Array.from({length:8},()=>req('checkin/claim',{})));assert.equal(claims.filter(c=>!c.data.duplicate).length,1);assert.equal((await req('economy')).data.economy.diamonds,30);
    cookie='';assert.equal((await req('bootstrap')).data.progress.economy.diamonds,0);assert.equal((await req('checkin/claim',{})).data.economy.diamonds,30);cookie=firstCookie;
    await req('shop/claim-trial',{});await req('progress/freeplay',{enabled:true});let b=(await req('level/start',{level:'n13',practice:true})).data;
    const entry=b.repository.entries.find(e=>e.term==='Nat.add_assoc');b=(await req('level/step',{level:'n13',practice:true,revision:b.attempt.revision,rewrite:{entry:entry.id,mode:'code',code:'rw [Nat.add_assoc]',target:'goal'}})).data;assert.equal(b.rejected,undefined);assert.equal(b.attempt.steps.length,1);
    const owner=profileById(cookie.split('=')[1]);
    owner.practice.attempts.n13.steps=['n13-0','n13-1'];await save();
    b=(await req('level/start',{level:'n13',practice:true})).data;assert.equal(b.attempt.steps.length,2);assert.ok(b.proof[1].includes('Nat.add_comm b c'));assert.equal(b.repository.entries.filter(e=>e.cardId==='add_comm').length,1);assert.ok(!b.actions.some(a=>a.id==='n13-1'));
    owner.economy.freeplayMs=1;owner.economy.freeplayStartedAt=Date.now()-2000;await save();
    const expired=await req('level/step',{level:'n13',practice:true,revision:b.attempt.revision,action:'rfl'});assert.notEqual(expired.status,200);assert.equal(owner.freePlay,false);assert.equal(owner.practice.attempts.n13.steps.length,2);assert.deepEqual(owner.completed,{});
    const boot=(await req('bootstrap')).data;assert.equal(boot.progress.freePlay,false);assert.equal(boot.levels.find(l=>l.id==='n13').open,false);
    await req('progress/reset',{confirm:'RESET'});assert.equal((await req('checkin/claim',{})).data.duplicate,true);assert.equal((await req('economy')).data.economy.diamonds,30);
    await new Promise(r=>server.close(r));await start();assert.equal((await req('checkin/claim',{})).data.duplicate,true);assert.equal((await req('economy')).data.economy.diamonds,30);
  }finally{await new Promise(r=>server.close(r));}
});
