import {products,grantPurchase,buyWithDiamonds,creditDiamonds,dailyAds,BETA_VOUCHERS,TRIAL_MS,DAILY_AD_LIMIT,AD_DIAMONDS} from './economy.mjs';

const fail=(status,message,code)=>Object.assign(new Error(message),{status,code});
// Integrations are supplied by server code, never selected by HTTP parameters.
// A payment adapter must verify payment with its provider before returning a
// unique receipt ID. An ad adapter must verify its signed reward receipt.
let paymentAdapter=null,adAdapter=null;
export function configureCommerce({payments=null,ads=null}={}){paymentAdapter=payments;adAdapter=ads;}
export function configureRewardAds(ads){adAdapter=ads;}
export const paymentMode=()=>paymentAdapter?'live':process.env.GARDEN_PAYMENT_MODE==='test'?'test':'disabled';
export function shopInfo(){return {products,mode:'diamonds',topupMode:paymentMode(),adsAvailable:!!adAdapter&&adAdapter.ready!==false,adsProvider:adAdapter?.provider||null,adsStatus:adAdapter?.ready===false?'configuration_pending':adAdapter?'ready':'unavailable',betaVoucherQuantity:BETA_VOUCHERS,trialGiftMs:TRIAL_MS,dailyAdLimit:DAILY_AD_LIMIT,adDiamonds:AD_DIAMONDS};}
export async function purchase(owner,body){
  const product=products.find(p=>p.id===body.product);return product?.currency==='cash'?cashPurchase(owner,body):buyWithDiamonds(owner,body);
}
export async function cashPurchase(owner,{product:productId,key}){
  if(typeof key!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(key))throw fail(400,'购买请求缺少有效编号。');
  const product=products.find(p=>p.id===productId&&p.currency==='cash');if(!product)throw fail(400,'这不是现金商品。');
  const previous=owner.economy.orders.find(o=>o.requestKey===key||o.id==='diamond-'+key);if(previous){if(previous.product!==productId)throw fail(409,'这笔请求已用于其他商品。');return {duplicate:true};}
  const mode=paymentMode();if(mode==='disabled')throw fail(501,'现金支付尚未接入，免广告券当前不能购买。','PAYMENT_UNAVAILABLE');
  const receipt=mode==='live'?await paymentAdapter.verifyPurchase({ownerId:owner.id,product,key}):{id:'test-cash-'+owner.id+'-'+key};
  if(!receipt?.id)throw fail(409,'支付尚未完成，免广告券还未到账。','PAYMENT_PENDING');
  // Cash receipts grant vouchers only. They never debit or credit diamonds.
  const granted=grantPurchase(owner,productId,receipt.id);if(granted)owner.economy.orders.find(o=>o.id===receipt.id).requestKey=key;return {duplicate:!granted,test:mode==='test'};
}
export async function topup(owner,{package:packageId,key}){
  if(typeof key!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(key))throw fail(400,'购买请求缺少有效编号。');
  const amount=({diamonds100:100,diamonds600:600,diamonds1000:1000})[packageId];if(!amount)throw fail(400,'找不到这个充值档位。');
  const mode=paymentMode();if(mode==='disabled')throw fail(501,'正式支付尚未接入，当前不会扣款。','PAYMENT_UNAVAILABLE');
  const receipt=mode==='live'?await paymentAdapter.verifyPurchase({ownerId:owner.id,product:{id:packageId,priceFen:amount,diamonds:amount},key}):{id:'test-'+owner.id+'-'+key};
  if(!receipt?.id)throw fail(409,'支付还没有完成，商品尚未到账。','PAYMENT_PENDING');
  const credited=creditDiamonds(owner,amount,'topup-'+receipt.id);return {test:mode==='test',duplicate:!credited,credited:credited?amount:0};
}
export async function startRewardAd(owner,purpose='diamonds',now=Date.now()){
  if(!adAdapter||adAdapter.ready===false)throw fail(501,'广告暂未开放。可以先领取商城的免费免广告券。','ADS_UNAVAILABLE');
  if(!['diamonds','energy'].includes(purpose))throw fail(400,'广告奖励类型不正确。');
  if(dailyAds(owner,now).remaining<1)throw fail(429,'今天的 10 次奖励广告已经用完，明天再来吧。','AD_DAILY_LIMIT');
  const session=await adAdapter.createSession({ownerId:owner.id,purpose});if(!session?.id)throw fail(503,'广告暂时还没准备好。');
  owner.economy.adSessions=owner.economy.adSessions.filter(s=>s.expires>now);owner.economy.adSessions.push({id:session.id,purpose,expires:now+600000});return session;
}
export async function finishRewardAd(owner,receipt,now=Date.now()){
  if(!adAdapter)throw fail(501,'广告尚未接入。内测版请使用免广告券。','ADS_UNAVAILABLE');
  const reward=await adAdapter.verifyReward({ownerId:owner.id,receipt});
  if(!reward?.id)throw fail(403,'广告奖励凭据未通过验证。');
  const e=owner.economy;if(e.adClaims.includes(reward.id))return {duplicate:true,earned:0};
  const session=e.adSessions.find(s=>s.id===reward.sessionId&&s.expires>now);if(!session)throw fail(403,'广告奖励会话已过期或不属于当前账号。');
  const daily=dailyAds(owner,now);if(daily.remaining<1)throw fail(429,'今天的 10 次奖励广告已经用完。','AD_DAILY_LIMIT');
  e.dailyAds={day:daily.day,used:daily.used+1};e.adClaims.push(reward.id);e.adSessions=e.adSessions.filter(s=>s!==session);creditDiamonds(owner,AD_DIAMONDS,'ad-'+reward.id);
  if(session.purpose==='energy'){e.energy=50;e.energyAt=now;}
  return {duplicate:false,earned:AD_DIAMONDS,refilled:session.purpose==='energy'};
}
