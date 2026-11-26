import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {readFile} from 'node:fs/promises';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','accounts-api-'+Date.now());
const {createServer}=await import('../server/index.mjs');const {getProfile,save}=await import('../server/store.mjs');const {seedAdmin}=await import('../server/accounts.mjs');
test('account authentication, server-side sessions, password hashes, roles, old-save adoption and restart persistence',{timeout:60000},async()=>{
  let server,base,cookie='';const start=async()=>{server=await createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;};await start();
  const req=async(route,body)=>{const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});for(const item of r.headers.getSetCookie()){const match=/^garden_session=([a-f0-9]{64});/.exec(item);if(match)cookie='garden_session='+match[1];}return {status:r.status,data:await r.json()};};
  try{
    assert.equal((await req('auth/status')).data.authenticated,false);assert.equal((await req('bootstrap')).status,401);assert.equal((await req('save/export')).status,401);
    const legacy=getProfile('').profile;legacy.completed.n01={stars:3,proofVersion:4,proof:['garden_strict_rfl'],steps:['rfl']};await save();cookie='garden_profile='+legacy.id;assert.equal((await req('auth/status')).data.legacy.completed,1);
    const registered=await req('auth/register',{username:'测试玩家',password:'qa-password',recoveryHint:'测试用的回忆线索',role:'admin',adoptLegacy:true});assert.equal(registered.status,200);assert.equal(registered.data.account.role,'player');
    let boot=(await req('bootstrap')).data;assert.equal(boot.progress.completed.n01.stars,3);assert.equal(boot.account.username,'测试玩家');assert.equal(boot.shop.products.find(p=>p.id==='hints10').priceDiamonds,100);
    const savedCookie=cookie;await new Promise(r=>server.close(r));await start();assert.equal((await req('auth/status')).data.authenticated,true);assert.equal((await req('bootstrap')).data.progress.completed.n01.stars,3);
    const exported=(await req('save/export')).data;assert.equal(exported.version,9);assert.equal(JSON.stringify(exported).includes('passwordHash'),false);assert.equal(JSON.stringify(exported).includes('qa-password'),false);
    const accounts=JSON.parse(await readFile(path.join(process.env.GARDEN_DATA_DIR,'accounts.json'),'utf8')),entry=Object.values(accounts.accounts)[0];assert.equal(entry.passwordHash.length,128);assert.equal(entry.passwordAlgorithm,'scrypt-N131072-r8-p1');assert.equal(JSON.stringify(accounts).includes('qa-password'),false);assert.equal(JSON.stringify(accounts).includes(savedCookie.split('=')[1]),false);
    assert.equal((await req('auth/logout',{})).status,200);cookie=savedCookie;assert.equal((await req('bootstrap')).status,401);
    assert.equal((await req('auth/hint',{username:'测试玩家'})).data.hint,'测试用的回忆线索');assert.equal((await req('auth/login',{username:'测试玩家',password:'wrong-pass'})).status,401);
    assert.equal((await req('auth/login',{username:'测试玩家',password:'qa-password'})).status,200);assert.equal((await req('auth/register',{username:'测试玩家',password:'another-pass'})).status,409);
    await seedAdmin('admin-qa','admin-secret');assert.equal((await req('auth/login',{username:'admin-qa',password:'admin-secret',adoptLegacy:false})).data.account.role,'admin');assert.deepEqual((await req('bootstrap')).data.progress.completed,{});
    const cross=await fetch(base+'/api/auth/register',{method:'POST',headers:{Origin:'http://unrelated.invalid','Content-Type':'application/json'},body:JSON.stringify({username:'cross-origin',password:'qa-password'})});assert.equal(cross.status,403);
  }finally{await new Promise(r=>server.close(r));}
});
