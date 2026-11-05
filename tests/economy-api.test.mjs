import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','economy-api-'+Date.now());
const {createServer}=await import('../server/index.mjs');const {configureCommerce}=await import('../server/commerce.mjs');
test('real Lean: single-charge resume, finite hints, answer entitlement, XP idempotency, energy exhaustion, safe store and persistence',{timeout:120000},async()=>{
  let server,base,cookie='';const start=async()=>{server=await createServer({allowGuestForTests:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;};await start();
  async function req(route,body){const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};}
  try{
    let boot=(await req('bootstrap')).data;assert.equal(boot.shop.mode,'diamonds');assert.equal(boot.progress.economy.energy,50);assert.equal(boot.progress.economy.hints,5);assert.equal(boot.progress.economy.answers,0);
    assert.equal((await req('shop/purchase',{product:'hints10',key:'buy-request-000001'})).status,409);
    assert.equal((await req('energy/ad/complete',{receipt:'forged'})).status,501);
    const starts=await Promise.all([req('level/start',{level:'n01'}),req('level/start',{level:'n01'})]);assert.ok(starts.every(r=>r.status===200));assert.equal(starts[1].data.progress.economy.energy,45);assert.equal(starts[0].data.attempt.run,starts[1].data.attempt.run);
    let b=starts[1].data;const hint=await Promise.all([req('level/hint',{level:'n01',revision:b.attempt.revision}),req('level/hint',{level:'n01',revision:b.attempt.revision})]);assert.deepEqual(hint.map(r=>r.status).sort(),[200,409]);b.attempt=hint.find(r=>r.status===200).data.attempt;
    for(let i=0;i<4;i++){const r=await req('level/hint',{level:'n01',revision:b.attempt.revision});assert.equal(r.status,200);b.attempt=r.data.attempt;}
    assert.equal((await req('level/hint',{level:'n01',revision:b.attempt.revision})).data.code,'HINTS_EMPTY');
    assert.equal((await req('level/answer',{level:'n01',revision:b.attempt.revision})).data.code,'ANSWERS_EMPTY');
    const {getProfile,save}=await import('../server/store.mjs');const {creditDiamonds}=await import('../server/economy.mjs');creditDiamonds(getProfile(cookie).profile,600,'qa-earned-answers');await save();assert.equal((await req('shop/purchase',{product:'first6',key:'answer-request-00001'})).status,200);
    let answer=(await req('level/answer',{level:'n01',revision:b.attempt.revision})).data;assert.deepEqual(answer.solution,['garden_strict_rfl']);assert.equal(answer.economy.answers,9);b.attempt=answer.attempt;
    answer=(await req('level/answer',{level:'n01',revision:b.attempt.revision})).data;assert.equal(answer.economy.answers,9);
    b=(await req('level/reset',{level:'n01',revision:b.attempt.revision})).data;assert.equal(b.progress.economy.energy,45);assert.equal(b.attempt.answerUnlocked,true);assert.ok(b.attempt.hints>0);
    b=(await req('level/step',{level:'n01',revision:b.attempt.revision,action:'rfl'})).data;assert.equal(b.complete,true);assert.equal(b.progress.completed.n01.stars,1);assert.equal(b.experience.xp,100);assert.equal(b.progress.economy.growth.level,2);
    for(const card of b.introductions)await req('cards/learn',{card});
    b=(await req('level/undo',{level:'n01',revision:b.attempt.revision})).data;b=(await req('level/step',{level:'n01',revision:b.attempt.revision,action:'rfl'})).data;assert.equal(b.experience,null);assert.equal(b.progress.economy.growth.xp,100);
    for(let i=0;i<9;i++){b=(await req('level/reset',{level:'n01',revision:b.attempt.revision})).data;assert.equal(b.progress.economy.energy,40-i*5);assert.equal(b.attempt.answerUnlocked,undefined);assert.equal(b.attempt.hints,0);b=(await req('level/step',{level:'n01',revision:b.attempt.revision,action:'rfl'})).data;assert.equal(b.experience.xp,100);assert.equal(b.progress.completed.n01.stars,3);}
    assert.equal((await req('level/reset',{level:'n01',revision:b.attempt.revision})).data.code,'ENERGY_EMPTY');
    assert.equal((await req('level/start',{level:'n02'})).data.code,'ENERGY_EMPTY');
    assert.equal((await req('energy/refill',{})).data.code,'ADS_UNAVAILABLE');
    const gifts=await Promise.all([req('shop/claim-beta',{}),req('shop/claim-beta',{})]);assert.deepEqual(gifts.map(r=>r.status).sort(),[200,409]);assert.equal((await req('economy')).data.economy.adSkips,3);
    assert.equal((await req('energy/refill',{})).data.economy.adSkips,2);b=(await req('level/start',{level:'n02'})).data;assert.equal(b.progress.economy.energy,45);
    await new Promise(r=>server.close(r));await start();b=(await req('level/start',{level:'n02'})).data;assert.equal(b.progress.economy.energy,45);assert.equal(b.progress.economy.growth.xp,1000);
    (await req('shop/claim-trial',{}),await req('progress/freeplay',{enabled:true}));b=(await req('level/start',{level:'n08',practice:true})).data;
    const axioms=b.applyRepository.entries.filter(e=>e.kind==='axiom');assert.equal(axioms.filter(e=>e.cardId==='succ_ne').length,1);assert.equal(axioms.filter(e=>e.cardId==='succ_inj').length,0);
    const axiom=axioms.find(e=>e.cardId==='succ_ne');b=(await req('level/step',{level:'n08',practice:true,revision:b.attempt.revision,apply:{entry:axiom.id,target:'goal'}})).data;assert.equal(b.complete,true);
    const before=(await req('economy')).data.economy;const reset=(await req('progress/reset',{confirm:'RESET'})).data;assert.equal(reset.progress.economy.betaClaimed,true);assert.equal(reset.progress.economy.adSkips,2);assert.equal(reset.progress.economy.growth.xp,before.growth.xp);assert.equal((await req('shop/claim-beta',{})).status,409);
    const exported=(await req('save/export')).data;assert.equal(exported.version,9);assert.equal(exported.economy.orders.length,1);
  }finally{configureCommerce();await new Promise(r=>server.close(r));}
});
test('a completed pre-economy proof is readable for free, but its first replay charges energy and grants fresh XP',{timeout:30000},async()=>{
  const file=path.join(process.env.GARDEN_DATA_DIR,'progress.json'),data=JSON.parse(await readFile(file,'utf8')),id='a'.repeat(48);
  data.profiles[id]={id,completed:{n01:{stars:3,proofVersion:4,steps:['rfl'],proof:['garden_strict_rfl']}},attempts:{n01:{steps:['rfl'],hints:0,mistakes:0,revision:1}},visited:['n01'],introduced:['rfl','rw'],topicsLearned:[],rulesVersion:4,challengeVersion:7,curriculumVersion:9};await writeFile(file,JSON.stringify(data));
  const server=await createServer({allowGuestForTests:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const req=async(route,body)=>{const r=await fetch(base+'/api/'+route,{method:'POST',headers:{Cookie:'garden_profile='+id,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200);return r.json();};
  try{let b=await req('level/start',{level:'n01'});assert.equal(b.complete,true);assert.equal(b.progress.economy.energy,50);assert.equal(b.progress.economy.growth.xp,100);b=await req('level/reset',{level:'n01',revision:b.attempt.revision});assert.equal(b.progress.economy.energy,45);assert.ok(b.attempt.run);b=await req('level/step',{level:'n01',revision:b.attempt.revision,action:'rfl'});assert.equal(b.experience.xp,100);assert.equal(b.progress.economy.growth.xp,200);}finally{await new Promise(r=>server.close(r));}
});
