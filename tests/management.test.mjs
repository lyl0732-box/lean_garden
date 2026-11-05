import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import path from 'node:path';import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','management-test-'+Date.now());
const {createServer}=await import('../server/index.mjs'),{createManagement,SystemMetrics}=await import('../server/management.mjs'),{Presence,ONLINE_MS}=await import('../server/presence.mjs'),{sessionAccount,accountProfile,managedAccounts}=await import('../server/accounts.mjs'),{beginRun,useHint,useAnswer,requireFreeplayTime}=await import('../server/economy.mjs'),{createConsole}=await import('../scripts/admin-console.mjs');
const start=async server=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port;};
const stop=server=>new Promise(r=>server.close(r));
test('live management: private access, presence, persisted edits, admin benefits and password revocation',{timeout:30000},async t=>{
  const presence=new Presence(),game=await createServer({presence}),base=await start(game),manager=http.createServer(createManagement({presence})),admin=await start(manager),cookies=new Map();
  const request=async(route,body)=>{const r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});for(const c of r.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');cookies.set(k,v);}return {status:r.status,data:await r.json()};};
  const manage=async(route='/snapshot',body)=>{const r=await fetch(admin+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
  let consoleServer;
  try{
    await t.test('account list never exposes secrets or proof data',async()=>{
      assert.equal((await request('presence',{clientId:'client-primary-12345',state:'online'})).status,401);
      assert.equal((await request('auth/register',{username:'manager-test',password:'initial-password',remember:true})).status,200);
      const snapshot=(await manage()).data;assert.equal(snapshot.totalUsers,1);assert.equal(snapshot.onlineUsers,0);const user=snapshot.users[0];assert.ok(user.profileId);assert.equal(user.hasProfile,true);
      for(const word of ['salt','passwordHash','garden_session','recoveryHint','attempts'])assert.ok(!JSON.stringify(snapshot).includes('"'+word+'"'));
      assert.ok(snapshot.server.memory.percent>=0&&snapshot.server.memory.percent<=100);assert.ok(snapshot.server.gameProcess.rssBytes>0);
    });
    const id=managedAccounts()[0].id;
    await t.test('online users deduplicate tabs, expire, and disappear on logout',async()=>{
      for(const clientId of ['client-primary-12345','client-secondary-12345'])assert.equal((await request('presence',{clientId,state:'online'})).status,200);
      let s=(await manage()).data;assert.equal(s.onlineUsers,1);assert.equal(s.users[0].devices,2);
      await request('presence',{clientId:'client-primary-12345',state:'offline'});assert.equal((await manage()).data.users[0].devices,1);
      assert.equal(presence.online(Date.now()+ONLINE_MS+1).size,0);assert.equal((await request('presence',{clientId:'bad',state:'online'})).status,400);
      await request('presence',{clientId:'client-secondary-12345',state:'online'});await request('auth/logout',{});assert.equal((await manage()).data.onlineUsers,0);
      await request('auth/remember',{});
    });
    await t.test('wallet input validation, stale-write conflict and disk persistence',async()=>{
      let u=(await manage()).data.users[0];const values={diamonds:321,adSkips:17,hints:12,answers:8,energy:0,xp:600,freeplayMs:3600000,betaClaimed:true};
      assert.equal((await manage('/users/'+id+'/wallet',{values,expectedTag:u.walletTag})).status,200);
      assert.equal((await manage('/users/'+id+'/wallet',{values:{diamonds:1},expectedTag:u.walletTag})).status,409);
      u=(await manage()).data.users[0];for(const [k,v]of Object.entries(values))assert.equal(u.wallet[k],v);
      for(const values of [{diamonds:-1},{diamonds:1.5},{xp:1e12},{adSkips:'100'},{energy:51},{role:'admin'},{toString:0},{constructor:0},JSON.parse('{"__proto__":0}'),{betaClaimed:1},{__proto__:null,freeplayMs:Infinity}])assert.equal((await manage('/users/'+id+'/wallet',{values,expectedTag:u.walletTag})).status,400);
      const updates=await Promise.all([1,2].map(diamonds=>manage('/users/'+id+'/wallet',{values:{diamonds},expectedTag:u.walletTag})));assert.deepEqual(updates.map(r=>r.status).sort(),[200,409]);
      const db=JSON.parse(await readFile(path.join(process.env.GARDEN_DATA_DIR,'progress.json'),'utf8'));assert.equal(db.profiles[u.profileId].economy.adSkips,17);
    });
    await t.test('promotion grants all unlimited resources and energy without replacing saved balances',async()=>{
      assert.equal((await manage('/users/'+id+'/role',{role:'root'})).status,400);assert.equal((await manage('/users/'+id+'/role',{role:'admin'})).status,200);
      const e=(await request('economy')).data.economy;assert.equal(e.unlimited,true);for(const k of ['diamonds','adSkips','hints','answers','freeplayRemainingMs'])assert.equal(e[k],Number.MAX_SAFE_INTEGER);assert.equal(e.energy,50);
      const owner=accountProfile(sessionAccount('garden_session='+cookies.get('garden_session'))),before=structuredClone(owner.economy);beginRun(owner,{});useHint(owner);useAnswer(owner,{hints:0});owner.freePlay=true;requireFreeplayTime(owner);owner.freePlay=false;assert.deepEqual(owner.economy,before);
      assert.equal((await request('presence',{clientId:'client-primary-12345',state:'online'})).data.account.role,'admin');
      await manage('/users/'+id+'/role',{role:'player'});assert.equal((await request('economy')).data.economy.unlimited,false);
    });
    await t.test('local console requires capability and correct origin; public game has no management route',async()=>{
      consoleServer=createConsole({key:'test-capability',bridge:{request:async(method,route,body)=>manage(route,body)}});const local=await start(consoleServer);
      assert.equal((await fetch(local+'/api/snapshot')).status,401);
      assert.equal((await fetch(local+'/api/snapshot',{headers:{'X-Admin-Key':'test-capability',Origin:'https://evil.invalid'}})).status,403);
      const r=await fetch(local+'/api/snapshot',{headers:{'X-Admin-Key':'test-capability'}});assert.equal(r.status,200);assert.equal((await r.json()).totalUsers,1);
      assert.equal((await fetch(local+'/api/unknown',{headers:{'X-Admin-Key':'test-capability'}})).status,404);
      assert.equal((await request('admin/snapshot')).status,404);
    });
    await t.test('password reset validates, hashes, revokes every credential and records no password',async()=>{
      assert.equal((await manage('/users/'+id+'/password',{password:'123'})).status,400);
      const r=await manage('/users/'+id+'/password',{password:'replacement-password'});assert.equal(r.status,200);assert.ok(r.data.revokedSessions>=2);
      assert.equal((await request('auth/status')).data.authenticated,false);assert.equal((await request('auth/remember',{})).status,401);assert.equal((await manage()).data.onlineUsers,0);
      assert.equal((await request('auth/login',{username:'manager-test',password:'initial-password'})).status,401);assert.equal((await request('auth/login',{username:'manager-test',password:'replacement-password'})).status,200);
      const raw=await readFile(path.join(process.env.GARDEN_DATA_DIR,'accounts.json'),'utf8'),audit=await readFile(path.join(process.env.GARDEN_DATA_DIR,'admin-audit.jsonl'),'utf8');for(const s of ['initial-password','replacement-password']){assert.ok(!raw.includes(s));assert.ok(!audit.includes(s));}assert.ok(audit.includes('password-reset'));
    });
    await t.test('metrics have a sampled CPU delta',async()=>{const m=new SystemMetrics();await m.snapshot();await new Promise(r=>setTimeout(r,25));const s=await m.snapshot();assert.equal(typeof s.cpu.percent,'number');assert.ok(s.cpu.percent>=0&&s.cpu.percent<=100);});
    await t.test('SSH RPC executable communicates through a private IPC socket',async()=>{
      const socketPath=process.platform==='win32'?'\\\\.\\pipe\\garden-management-test-'+process.pid:path.join(process.env.GARDEN_DATA_DIR,'rpc.sock'),ipc=http.createServer(createManagement({presence}));await new Promise((r,j)=>{ipc.once('error',j);ipc.listen(socketPath,r);});
      try{const result=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['server/admin-rpc.mjs'],{windowsHide:true,env:{...process.env,GARDEN_ADMIN_SOCKET:socketPath}});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('error',reject);child.on('close',code=>code===0?resolve(stdout):reject(Error(stderr)));child.stdin.end(JSON.stringify({id:1,method:'GET',path:'/snapshot'})+'\n'+JSON.stringify({id:2,method:'POST',path:'/arbitrary-exec'})+'\n');});
        const replies=result.trim().split('\n').map(s=>JSON.parse(s));assert.equal(replies[0].id,1);assert.equal(replies[0].status,200);assert.equal(replies[0].data.totalUsers,1);assert.equal(replies[1].status,503);
      }finally{await stop(ipc);}
    });
  }finally{if(consoleServer)await stop(consoleServer);await stop(manager);await stop(game);}
});
