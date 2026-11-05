import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','migration-v3-'+Date.now());
const old=JSON.parse(await readFile(new URL('../server/legacy-v2.json',import.meta.url),'utf8'));
const id='a'.repeat(48),completed={n01:{stars:3,steps:['rfl']},n02:{stars:2,steps:[Object.keys(old.n02.actions).find(k=>old.n02.actions[k]==='rewrite [h]'),'rfl']}};
await mkdir(process.env.GARDEN_DATA_DIR,{recursive:true});
await writeFile(path.join(process.env.GARDEN_DATA_DIR,'progress.json'),JSON.stringify({version:1,profiles:{[id]:{id,rulesVersion:2,completed,attempts:{n02:{steps:completed.n02.steps,hints:0,mistakes:1,revision:7}},visited:['n01','n02','n03'],introduced:['rfl','rw','nat_zero','one_eq_succ_zero'],lastLevel:'n03'}}}));
const idV3='b'.repeat(48),fixtureFile=path.join(process.env.GARDEN_DATA_DIR,'progress.json'),fixture=JSON.parse(await readFile(fixtureFile,'utf8'));
fixture.profiles[idV3]={id:idV3,rulesVersion:3,completed:{n06a:{stars:3,steps:[{code:'rewrite [Garden.one_eq_succ_zero]'},{code:'rewrite [Nat.add_succ]'},{code:'rewrite [Nat.add_zero]'},'rfl']}},attempts:{},visited:['n06a'],introduced:['rfl','rw'],lastLevel:'n06a'};
await writeFile(fixtureFile,JSON.stringify(fixture));
const {createServer}=await import('../server/index.mjs');
test('v2 progress and completed proof survive migration; audio byte ranges work',{timeout:30000},async()=>{
  const server=await createServer({allowGuestForTests:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;const headers={Cookie:'garden_profile='+id};
  try{
    const b=await(await fetch(base+'/api/bootstrap',{headers})).json();assert.equal(b.progress.stars,5);assert.equal(Object.keys(b.progress.completed).length,2);assert.equal(b.progress.completed.n02.stars,2);assert.ok(b.progress.unlocked.includes('one_eq_succ_zero'));
    const source=await(await fetch(base+'/api/proof/export?level=n02',{headers})).text();assert.ok(source.includes('rewrite [h]\n  rfl'));assert.ok(!source.includes('sorry'));
    const bridge=await(await fetch(base+'/api/proof/export?level=n06a',{headers:{Cookie:'garden_profile='+idV3}})).text();assert.ok(bridge.includes('rewrite [Nat.add_zero]\n  rfl'),bridge);
    const exported=await(await fetch(base+'/api/save/export',{headers})).json();assert.equal(exported.version,9);assert.deepEqual(exported.attempts.n02.steps,[]);assert.equal(exported.legacyAttemptsV2.n02.revision,7);assert.equal(exported.legacyAttemptsV3.n02.revision,8);assert.equal(exported.attempts.n02.revision,9);
    const audio=base+'/assets/audio/carefree-kevin-macleod.mp3';const head=await fetch(audio,{method:'HEAD'});assert.equal(head.headers.get('content-type'),'audio/mpeg');assert.ok(Number(head.headers.get('content-length'))>6e6);
    const ranged=await fetch(audio,{headers:{Range:'bytes=0-99'}});assert.equal(ranged.status,206);assert.equal((await ranged.arrayBuffer()).byteLength,100);assert.match(ranged.headers.get('content-range'),/^bytes 0-99\//);
    assert.equal((await fetch(audio,{headers:{Range:'bytes=9000000-'}})).status,416);
    const bad=await fetch(base+'/api/level/start',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({level:'n01'})});assert.equal(bad.status,200);
    const started=await bad.json();
    const post=(route,body)=>fetch(base+'/api/'+route,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});
    for(const topic of started.pendingTopics)assert.equal((await post('topics/learn',{topic})).status,200);
    for(const card of started.introductions)assert.equal((await post('cards/learn',{card})).status,200);
    for(const action of ['exact','assumption'])assert.equal((await post('level/step',{level:'n01',revision:started.attempt.revision,action})).status,403);
  }finally{await new Promise(r=>server.close(r));}
});
