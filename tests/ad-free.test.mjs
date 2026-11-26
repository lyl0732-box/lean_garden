import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

process.env.GARDEN_DATA_DIR=path.resolve('artifacts','ad-free-api-'+Date.now());
process.env.GARDEN_PAYMENT_MODE='test';

const {createServer}=await import('../server/index.mjs');
const {getProfile,save}=await import('../server/store.mjs');
const {accountProfile,sessionAccount}=await import('../server/accounts.mjs');

test('retired ad and cash requests grant nothing, while legacy saves and diamond exchanges work',async()=>{
  const server=await createServer({allowGuestForTests:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    const {profile}=getProfile('');
    const oldOrder={id:'legacy-cash-order',product:'adSkips10',currency:'cash',priceFen:200};
    Object.assign(profile.economy,{
      diamonds:300,energy:30,adSkips:4,betaClaimed:true,orders:[oldOrder],
      adClaims:['legacy-claim'],adSessions:[{id:'legacy-session',expires:Date.now()+600000}]
    });
    await save();
    const before=structuredClone(profile.economy);
    const request=async(route,body)=>{
      const response=await fetch(base+'/api/'+route,{
        method:body?'POST':'GET',headers:{Cookie:'garden_profile='+profile.id,'Content-Type':'application/json'},
        body:body?JSON.stringify(body):undefined
      });
      return {status:response.status,data:await response.json()};
    };
    const {data:boot}=await request('bootstrap');
    assert.equal(boot.shop.products.length,5);
    assert.ok(boot.shop.products.every(product=>Number.isSafeInteger(product.priceDiamonds)&&!('priceFen' in product)));
    assert.equal(boot.progress.economy.adSkips,4);
    assert.equal(boot.progress.economy.dailyAds.remaining,0);
    assert.equal((await fetch(base+'/reward-ads.js')).status,404);
    assert.equal((await request('ads/appwin/reward')).status,404);
    for(const route of ['ads/start','ads/complete','energy/ad/start','energy/ad/complete','shop/topup']){
      const result=await request(route,{receipt:{sessionId:'legacy-session'},package:'diamonds100',key:'retired-payment-route'});
      assert.equal(result.status,404,route);
    }
    for(const route of ['shop/redeem','shop/purchase']){
      const result=await request(route,{product:'adSkips10',key:'retired-cash-product'});
      assert.equal(result.status,400);
      assert.equal(result.data.code,'PRODUCT_UNAVAILABLE');
    }
    assert.deepEqual(profile.economy,before);

    const exchange={product:'hints10',key:'diamond-exchange-01'};
    const first=await request('shop/redeem',exchange);
    assert.equal(first.status,200);
    assert.equal(first.data.economy.diamonds,200);
    assert.equal(first.data.economy.hints,15);
    const replay=await request('shop/purchase',exchange);
    assert.equal(replay.data.duplicate,true);
    assert.equal(replay.data.economy.hints,15);
    const tapTap=await request('shop/purchase',{product:'answer1',key:'taptap-diamond-exchange'});
    assert.equal(tapTap.status,200);
    assert.equal(tapTap.data.economy.answers,1);
    const refill=await request('energy/refill',{});
    assert.equal(refill.data.economy.energy,50);
    assert.equal(refill.data.economy.adSkips,3);
    assert.deepEqual(profile.economy.orders[0],oldOrder);
    assert.equal((await request('shop/claim-beta',{})).data.code,'BETA_CLAIMED');
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('ad-free players have unlimited supplies and practice on the same save as finite clients',{timeout:120000},async()=>{
  const server=await createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  let cookie='';
  async function request(route,body,adFree=true){
    const headers={Cookie:cookie};
    if(adFree)headers['X-Garden-Edition']='ad-free';
    if(body!==undefined)headers['Content-Type']='application/json';
    const response=await fetch(base+'/api/'+route,{
      method:body===undefined?'GET':'POST',headers,body:JSON.stringify(body)
    });
    const session=response.headers.getSetCookie().find(line=>line.startsWith('garden_session='));
    if(session)cookie=session.split(';')[0];
    return {status:response.status,data:await response.json()};
  }
  async function ok(route,body){
    const result=await request(route,body);
    assert.equal(result.status,200,`${route}: ${result.data.error||''}`);
    return result.data;
  }
  try{
    assert.equal((await request('bootstrap')).status,401);
    await ok('auth/register',{username:'unlimited-player',password:'unlimited-test-password'});
    const account=sessionAccount(cookie),owner=accountProfile(account);
    Object.assign(owner.economy,{energy:0,energyAt:Date.now(),diamonds:0,hints:0,answers:0,adSkips:0,freeplayMs:0});
    await save();
    const before=structuredClone(owner.economy);
    const [boot,tapTap]=await Promise.all([ok('bootstrap'),request('bootstrap',undefined,false)]);
    assert.equal(boot.account.role,'player');
    assert.equal(boot.shop.mode,'unlimited');
    assert.deepEqual(boot.shop.products,[]);
    assert.equal(boot.progress.economy.unlimited,true);
    assert.equal(boot.progress.economy.energyCost,0);
    for(const key of ['diamonds','hints','answers','adSkips','freeplayRemainingMs']){
      assert.equal(boot.progress.economy[key],Number.MAX_SAFE_INTEGER);
      assert.equal(tapTap.data.progress.economy[key],0);
    }
    assert.equal(tapTap.data.progress.economy.unlimited,false);
    assert.equal(tapTap.data.shop.products.length,5);
    assert.equal((await request('level/start',{level:'n01'},false)).data.code,'ENERGY_EMPTY');
    let battle=await ok('level/start',{level:'n01'});
    assert.equal(battle.progress.economy.unlimited,true);
    assert.ok(battle.attempt.run);
    for(let i=0;i<6;i++){
      const hint=await ok('level/hint',{level:'n01',revision:battle.attempt.revision});
      assert.equal(hint.economy.hints,Number.MAX_SAFE_INTEGER);
      battle.attempt=hint.attempt;
    }
    assert.equal((await request('level/answer',{level:'n01',revision:battle.attempt.revision},false)).data.code,'ANSWERS_EMPTY');
    const answer=await ok('level/answer',{level:'n01',revision:battle.attempt.revision});
    assert.deepEqual(answer.solution,['garden_strict_rfl']);
    assert.equal(answer.economy.answers,Number.MAX_SAFE_INTEGER);
    battle=await ok('level/step',{level:'n01',revision:answer.attempt.revision,action:'rfl'});
    assert.equal(battle.complete,true);
    assert.equal(battle.progress.completed.n01.stars,1);
    assert.equal(battle.experience.xp,100);
    battle=await ok('level/reset',{level:'n01',revision:battle.attempt.revision});
    assert.equal(battle.complete,false);
    assert.equal(battle.attempt.answerUnlocked,undefined);
    const exchange={product:'hints10',key:'unlimited-exchange-01'};
    assert.equal((await ok('shop/redeem',exchange)).spent,0);
    assert.equal((await request('shop/purchase',exchange,false)).data.code,'DIAMONDS_EMPTY');
    for(const route of ['shop/claim-beta','shop/claim-trial','energy/refill'])await ok(route,{});
    const practice=await ok('progress/freeplay',{enabled:true});
    assert.equal(practice.progress.freePlay,true);
    assert.equal(practice.progress.economy.freeplayActive,true);
    assert.equal(practice.progress.economy.freeplayRemainingMs,Number.MAX_SAFE_INTEGER);
    assert.equal((await request('bootstrap',undefined,false)).data.progress.freePlay,false);
    assert.equal((await request('progress/freeplay',{enabled:true},false)).data.code,'FREEPLAY_EMPTY');
    const practiceLevel=await ok('level/start',{level:'n08',practice:true});
    assert.equal(practiceLevel.progress.freePlay,true);
    assert.equal(practiceLevel.progress.economy.unlimited,true);
    assert.deepEqual(owner.economy,{...before,xp:100});
    const adventure=await ok('progress/freeplay',{enabled:false});
    assert.equal(adventure.progress.freePlay,false);
    assert.equal(adventure.progress.completed.n01.stars,1);
    assert.equal(adventure.account.role,'player');
    assert.deepEqual(owner.economy,{...before,xp:100});
  }finally{await new Promise(resolve=>server.close(resolve));}
});
