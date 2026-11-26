import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

process.env.GARDEN_DATA_DIR=path.resolve('artifacts','ad-free-api-'+Date.now());
process.env.GARDEN_PAYMENT_MODE='test';

const {createServer}=await import('../server/index.mjs');
const {getProfile,save}=await import('../server/store.mjs');

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
