import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','api-data-'+Date.now());
const {createServer}=await import('../server/index.mjs');
const {campaign}=await import('../server/content.mjs');
test('real Lean: introductions, strict proofs through induction, at, undo, persistence, reset',{timeout:360000},async()=>{
  let server,base,cookie='';
  async function start(){server=await createServer({allowGuestForTests:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;}
  await start();
  const req=async(route,body)=>{
    const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
    return{status:r.status,data:await r.json()};
  };
  const learn=async b=>{for(const topic of b.pendingTopics||[])assert.equal((await req('topics/learn',{topic})).status,200);for(const card of b.introductions){const r=await req('level/learn',{level:b.level.id,revision:b.attempt.revision,card});assert.equal(r.status,200);}return b;};
  const step=async(b,action)=>req('level/step',{level:b.level.id,revision:b.attempt.revision,...(typeof action==='string'?{action}:{rewrite:action})});
  const rewrite=async(b,term,direction='forward',target='goal')=>{
    const entry=b.repository.entries.find(e=>e.term===term);assert.ok(entry,`missing ${term}`);
    const r=await step(b,{entry:entry.id,direction,target});assert.equal(r.status,200,JSON.stringify(r));assert.ok(!r.data.rejected,JSON.stringify(r));return r.data;
  };
  try {
    const boot=await req('bootstrap');assert.deepEqual(boot.data.progress.unlocked,['rfl']);
    assert.equal((await req('shop/claim-beta',{})).status,200);
    assert.equal((await req('level/start',{level:'n02'})).status,403);
    assert.equal((await req('level/start',{level:'t20'})).status,403);
    assert.equal((await req('level/start',{level:'m01'})).status,403);
    let b=(await req('level/start',{level:'n01'})).data;
    assert.deepEqual(b.introductions,[]);
    await learn(b);assert.equal((await step(b,'ring')).status,403);
    b=(await step(b,'rfl')).data;assert.equal(b.complete,true);assert.equal(b.progress.completed.n01.stars,3);
    assert.deepEqual(b.introductions,['rw']);assert.ok(b.progress.unlocked.includes('rw'));
    assert.equal((await req('level/step',{level:'n01',revision:0,action:'rfl'})).status,409);
    b=(await req('level/start',{level:'n02'})).data;assert.deepEqual(b.introductions,['rw']);await learn(b);
    const initial=b.goals;
    const bad=(await step(b,'rfl')).data;assert.equal(bad.rejected,true);assert.equal(bad.attempt.steps.length,0);
    b=(await req('level/start',{level:'n02'})).data;assert.deepEqual(b.goals,initial);
    assert.equal((await step(b,{entry:'entry-0',target:'a',direction:'forward'})).status,403);
    assert.equal((await step(b,{entry:'entry-0',target:'h; sorry',direction:'forward'})).status,403);
    assert.equal((await step(b,{entry:'Nat.add_comm',target:'goal',direction:'forward'})).status,403);
    b=await rewrite(b,'h','forward','h');assert.equal(b.complete,false);assert.equal(b.goals[0].hypotheses.find(h=>h.name==='h').type,'b = b');assert.equal(b.goals[0].target,'a = b');
    b=(await req('level/undo',{level:'n02',revision:b.attempt.revision})).data;assert.deepEqual(b.goals,initial);
    b=await rewrite(b,'h','backward');assert.equal(b.complete,false);assert.equal(b.goals[0].target,'a = a');
    await new Promise(r=>server.close(r));await start();
    b=(await req('level/start',{level:'n02'})).data;assert.equal(b.goals[0].target,'a = a');assert.deepEqual(b.introductions,[]);
    b=(await step(b,'rfl')).data;assert.equal(b.complete,true);assert.equal(b.progress.completed.n02.stars,2);
    const exported=await fetch(base+'/api/proof/export?level=n02',{headers:{Cookie:cookie}});
    assert.equal(exported.status,200);const proof=await exported.text();assert.ok(proof.includes('garden_strict_rw [← h]\n  garden_strict_rfl'));assert.ok(!proof.includes('sorry'));
    for(const level of campaign.filter(l=>l.chapter==='n'&&l.number>=3&&l.number<=11)){
      if((await req('economy')).data.economy.energy<5)assert.equal((await req('energy/refill',{})).status,200);
      const {id}=level;b=(await req('level/start',{level:id})).data;await learn(b);
      if(['n03','n04','n05'].includes(id))assert.equal((await step(b,'rfl')).status,409,`${id}: rfl cannot skip definition`);
      for(const code of level.solution){
        if(code.startsWith('garden_strict_rw')){const m=/^garden_strict_rw \[(← )?(.+)\]$/.exec(code);b=await rewrite(b,m[2],m[1]?'backward':'forward');assert.equal(b.complete,false);}
        else if(code.startsWith('induction')){const r=await req('level/step',{level:id,revision:b.attempt.revision,induction:{variable:code.split(' ')[1]}});assert.equal(r.status,200);b=r.data;assert.equal(b.goals.length,2);const bad=(await step(b,'rfl')).data;assert.equal(bad.rejected,true);b.attempt=bad.attempt;}
        else {const a=b.actions.find(a=>a.code===code);assert.ok(a,`${id}: ${code}`);const r=await step(b,a.id);assert.equal(r.status,200);assert.ok(!r.data.rejected,JSON.stringify(r.data));b=r.data;}
      }
      assert.equal(b.complete,true,id);assert.equal(b.progress.completed[id].proofVersion,4);
    }
    const cross=await fetch(base+'/api/level/start',{method:'POST',headers:{Origin:'http://unrelated.invalid','Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({level:'n03'})});assert.equal(cross.status,403);
    assert.equal((await req('progress/reset',{confirm:'NO'})).status,400);
    const reset=(await req('progress/reset',{confirm:'RESET'})).data;
    assert.deepEqual(reset.progress.completed,{});assert.deepEqual(reset.progress.unlocked,['rfl']);assert.deepEqual(reset.progress.introduced,['rfl']);
    await new Promise(r=>server.close(r));await start();
    const restored=(await req('bootstrap')).data;assert.deepEqual(restored.progress.completed,{});assert.equal(restored.levels.find(l=>l.id==='n02').open,false);
    assert.deepEqual((await req('level/start',{level:'n01'})).data.introductions,[]);
  }finally{await new Promise(r=>server.close(r));}
});
