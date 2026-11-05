import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {openAppwin} from '../server/appwin.mjs';
process.env.GARDEN_DATA_DIR=path.resolve('artifacts','appwin-api-'+Date.now());
const {createServer}=await import('../server/index.mjs');
const {configureCommerce}=await import('../server/commerce.mjs');
const key='local-test-key-never-a-real-provider-key';
function proof(session,transaction){return new URLSearchParams({user_id:session.id,trans_id:transaction,extra:session.id,sign:createHash('sha256').update(key+':'+transaction).digest('hex')});}

test('AppWin HTTP rewards require provider proof; callbacks grant once, resist replay and survive restart',{timeout:30000},async()=>{
  let server,base;let cookie='',otherCookie='';
  async function start(){const adapter=await openAppwin({directory:process.env.GARDEN_DATA_DIR,securityKey:key});server=await createServer({allowGuestForTests:true,rewardAds:adapter});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
  async function request(route,body,other=false){
    const response=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{Cookie:other?otherCookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    const set=response.headers.get('set-cookie');if(set){if(other)otherCookie=set.split(';')[0];else cookie=set.split(';')[0];}
    return {status:response.status,data:await response.json()};
  }
  const callback=async params=>{const response=await fetch(base+'/api/ads/appwin/reward?'+params);return response.json();};
  await start();
  try{
    const bootstrap=(await request('bootstrap')).data;assert.equal(bootstrap.shop.adsAvailable,true);assert.ok(!JSON.stringify(bootstrap).includes(key));
    await request('bootstrap',undefined,true);
    const session=(await request('ads/start',{})).data;assert.equal(session.slotId,'100015016');
    assert.equal((await request('ads/complete',{receipt:{sessionId:session.id,valid:true,signed:true}})).data.code,'AD_REWARD_PENDING');
    const forged=proof(session,'first');forged.set('sign','0'.repeat(64));assert.deepEqual(await callback(forged),{isValid:false});
    assert.equal((await request('economy')).data.economy.diamonds,0);
    const signed=proof(session,'first');
    const [reward,concurrentStart]=await Promise.all([callback(signed),request('ads/start',{})]);assert.equal(reward.isValid,true);assert.equal(concurrentStart.status,200);
    assert.ok((await Promise.all(Array.from({length:6},()=>callback(signed)))).every(r=>r.isValid));
    let economy=(await request('economy')).data.economy;assert.equal(economy.diamonds,50);assert.equal(economy.dailyAds.used,1);
    assert.equal((await request('ads/complete',{receipt:{sessionId:session.id}},true)).status,403);
    const otherSession=(await request('ads/start',{},true)).data;
    assert.deepEqual(await callback(proof(otherSession,'first')),{isValid:false});
    assert.equal((await request('economy',undefined,true)).data.economy.diamonds,0);
    await new Promise(r=>server.close(r));await start();
    assert.equal((await callback(signed)).isValid,true);assert.equal((await request('economy')).data.economy.diamonds,50);
    const finish=await request('ads/complete',{receipt:{sessionId:session.id}});assert.equal(finish.data.duplicate,true);
    for(let i=1;i<10;i++){
      if(i===1){const {getProfile,save}=await import('../server/store.mjs');getProfile(cookie).profile.economy.energy=0;await save();}
      const ad=(await request(i===1?'energy/ad/start':'ads/start',{})).data;assert.equal((await callback(proof(ad,'transaction-'+i))).isValid,true);
      if(i===1)assert.equal((await request('economy')).data.economy.energy,50);
    }
    economy=(await request('economy')).data.economy;assert.equal(economy.diamonds,500);assert.equal(economy.dailyAds.remaining,0);
    assert.equal((await request('ads/start',{})).data.code,'AD_DAILY_LIMIT');
    assert.equal((await request('shop/topup',{package:'diamonds100',key:'test-payment-000001'})).status,501);
  }finally{configureCommerce();await new Promise(r=>server.close(r));}
});

test('AppWin rejects expired, duplicate-parameter and changed-extra callbacks without granting',{timeout:10000},async()=>{
  let time=Date.now(),grants=0;
  const adapter=await openAppwin({directory:path.join(process.env.GARDEN_DATA_DIR,'expiry'),securityKey:key,now:()=>time});
  const session=await adapter.createSession({ownerId:'owner',purpose:'energy'});
  const duplicate=proof(session,'duplicate');duplicate.append('user_id',session.id);
  assert.equal(await adapter.acceptCallback(duplicate,()=>grants++),false);
  const changed=proof(session,'extra');changed.set('extra','another-session');assert.equal(await adapter.acceptCallback(changed,()=>grants++),false);
  time+=600001;assert.equal(await adapter.acceptCallback(proof(session,'expired'),()=>grants++),false);assert.equal(grants,0);
  const disabled=await openAppwin({directory:path.join(process.env.GARDEN_DATA_DIR,'disabled')});assert.equal(disabled.ready,false);
  await assert.rejects(disabled.createSession({ownerId:'owner',purpose:'diamonds'}),e=>e.code==='ADS_UNAVAILABLE');
});
