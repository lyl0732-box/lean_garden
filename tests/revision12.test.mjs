import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {readFile} from 'node:fs/promises';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','revision12-test-'+Date.now());
const {createServer}=await import('../server/index.mjs');const {seedAdmin,sessionAccount,accountProfile,sessionCookie}=await import('../server/accounts.mjs');const {useHint,useAnswer,refillEnergy,buyWithDiamonds,requireFreeplayTime}=await import('../server/economy.mjs');
test('remembered credentials are opaque, can resume after logout, and can be explicitly revoked',{timeout:20000},async()=>{
 const server=await createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,cookies=new Map();
 async function req(route,body){const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});for(const h of r.headers.getSetCookie()){const pair=h.split(';')[0],at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}return {status:r.status,data:await r.json()};}
 try{
  assert.equal(sessionCookie('sample',true,false).includes('Max-Age'),false);assert.ok(sessionCookie('sample',true,false).endsWith('; Secure'));assert.ok(sessionCookie('sample',true,true).includes('Max-Age=2592000'));
  await req('auth/register',{username:'remember-qa',password:'private-test-password',remember:true,role:'admin'});assert.match(cookies.get('garden_remember'),/^[a-f0-9]{64}$/);let boot=(await req('bootstrap')).data;assert.equal(boot.account.role,'player');assert.equal(boot.progress.economy.unlimited,false);
  await req('auth/logout',{});let status=(await req('auth/status')).data;assert.equal(status.authenticated,false);assert.equal(status.remembered,'remember-qa');assert.equal((await req('auth/remember',{})).status,200);assert.equal((await req('auth/status')).data.authenticated,true);
  const raw=await readFile(path.join(process.env.GARDEN_DATA_DIR,'accounts.json'),'utf8');assert.ok(!raw.includes('private-test-password'));assert.ok(!raw.includes(cookies.get('garden_remember')));
  await req('auth/logout',{forgetRemembered:true});assert.equal((await req('auth/remember',{})).status,401);
  await seedAdmin('admin12','qa-admin12');await req('auth/login',{username:'admin12',password:'qa-admin12'});boot=(await req('bootstrap')).data;assert.equal(boot.progress.economy.unlimited,true);
  const owner=accountProfile(sessionAccount('garden_session='+cookies.get('garden_session')));Object.assign(owner.economy,{hints:0,answers:0,adSkips:0,diamonds:0,freeplayMs:0,energy:0,energyAt:Date.now()});
  await req('economy');useHint(owner);assert.equal(owner.economy.hints,0);const attempt={hints:0};assert.equal(useAnswer(owner,attempt),true);assert.equal(attempt.answerUnlocked,true);assert.equal(owner.economy.answers,0);refillEnergy(owner);assert.equal(owner.economy.energy,50);assert.equal(owner.economy.adSkips,0);buyWithDiamonds(owner,{product:'hints10',key:'qa-admin-free-purchase'});assert.equal(owner.economy.diamonds,0);
  assert.equal((await req('progress/freeplay',{enabled:true})).status,200);requireFreeplayTime(owner);const e=(await req('economy')).data.economy;for(const k of ['hints','answers','diamonds','adSkips','freeplayRemainingMs'])assert.equal(e[k],Number.MAX_SAFE_INTEGER);
  assert.throws(()=>buyWithDiamonds(owner,{product:'adSkips10',key:'qa-admin-retired-item'}),e=>e.code==='PRODUCT_UNAVAILABLE');
  const exported=(await req('save/export')).data;assert.ok(!JSON.stringify(exported).includes('adminBenefits'));const player={economy:{hints:0,answers:0,adSkips:0}};assert.throws(()=>useHint(player));assert.throws(()=>useAnswer(player,{}));
 }finally{await new Promise(r=>server.close(r));}
});
