import {randomUUID} from 'node:crypto';
import {checkinSummary} from './checkin.mjs';

export const ENERGY_MAX=50,ENERGY_COST=5,ENERGY_INTERVAL=300000;
export const BETA_VOUCHERS=3,TRIAL_MS=600000;
export const products=[
  {id:'hints10',name:'灵感提示包',priceDiamonds:100,quantity:10,item:'hints',description:'10 次芽芽提示'},
  {id:'answer1',name:'一张答案包',priceDiamonds:100,quantity:1,item:'answers',description:'打开一局完整参考答案'},
  {id:'first6',name:'首次答案礼包',priceDiamonds:600,quantity:10,item:'answers',once:true,description:'首次礼包 · 10 张答案包'},
  {id:'freeplay10',name:'十分钟花径通行证',priceDiamonds:200,quantity:600000,item:'freeplayMs',description:'10 分钟自由选关额度'},
  {id:'freeplay60',name:'一小时花径通行证',priceDiamonds:600,quantity:3600000,item:'freeplayMs',description:'60 分钟自由选关额度'}
];
export function shopInfo(){return {products,mode:'diamonds',betaVoucherQuantity:BETA_VOUCHERS,trialGiftMs:TRIAL_MS};}
const fail=(status,message,code)=>Object.assign(new Error(message),{status,code});
export const unlimited=owner=>owner.adminBenefits===true;
export function attachBenefits(owner,account){Object.defineProperty(owner,'adminBenefits',{value:account?.role==='admin',writable:true,configurable:true,enumerable:false});return owner;}
export const xpFor=level=>level.boss?400:level.miniBoss?200:100;
export const threshold=level=>100*(level-1)+25*(level-1)*(level-2);
export function growth(xp){
  let level=1;while(xp>=threshold(level+1))level++;
  return {xp,level,current:xp-threshold(level),required:threshold(level+1)-threshold(level),next:threshold(level+1)};
}
export function migrateEconomy(owner,levels=[],now=Date.now()){
  if(owner.economy?.version>=2)return false;
  if(!owner.economy)owner.economy={version:1,energy:ENERGY_MAX,energyAt:now,hints:5,answers:0,adSkips:0,betaClaimed:false,xp:Object.keys(owner.completed||{}).reduce((sum,id)=>sum+xpFor(levels.find(l=>l.id===id)||{}),0),firstRecharge:false,orders:[]};
  const e=owner.economy;
  // Retire only the unspent part of the old ten-voucher gift. Purchased vouchers
  // are retained, even when the player has already spent some of the gift.
  if(e.betaClaimed){const paid=e.orders.filter(o=>o.product==='adSkips10').length*10,used=Math.max(0,10+paid-e.adSkips);e.adSkips-=Math.max(0,10-used)-Math.max(0,BETA_VOUCHERS-used);}
  Object.assign(e,{version:2,diamonds:0,trialClaimed:false,freeplayMs:0,freeplayStartedAt:owner.freePlay?now:null,diamondReceipts:[],garden:{nextAt:now+18000000,questions:[],answers:[]}});
  return true;
}
export function freeplayRemaining(e,now=Date.now()){return Math.max(0,e.freeplayMs-(e.freeplayStartedAt===null?0:Math.max(0,now-e.freeplayStartedAt)));}
function settleFreeplay(e,now){e.freeplayMs=freeplayRemaining(e,now);if(e.freeplayStartedAt!==null)e.freeplayStartedAt=now;}
export function changeFreeplay(owner,enabled,now=Date.now()){
  const e=owner.economy;settleFreeplay(e,now);
  if(enabled&&!unlimited(owner)&&e.freeplayMs<=0)throw fail(403,'选关时间用完了。去商城领取免费的 10 分钟体验，或补充通行证。','FREEPLAY_EMPTY');
  owner.freePlay=enabled;e.freeplayStartedAt=enabled?now:null;
}
export function expireFreeplay(owner,now=Date.now()){
  if(!owner.freePlay||unlimited(owner)||freeplayRemaining(owner.economy,now)>0)return false;
  changeFreeplay(owner,false,now);return true;
}
export function claimTrial(owner,now=Date.now()){
  const e=owner.economy;if(e.trialClaimed)throw fail(409,'这个账号已经领取过选关体验啦。','TRIAL_CLAIMED');
  settleFreeplay(e,now);e.trialClaimed=true;e.freeplayMs+=TRIAL_MS;
}
export function requireFreeplayTime(owner,continuing=false,now=Date.now()){
  if(!unlimited(owner)&&owner.freePlay&&freeplayRemaining(owner.economy,now)<=0)throw fail(403,'自由选关时间已到，已退出自由模式。补充通行证后可继续练习。','FREEPLAY_EMPTY');
}
function energyState(e,now){
  const elapsed=Math.max(0,now-e.energyAt),ticks=Math.floor(elapsed/ENERGY_INTERVAL),value=Math.min(ENERGY_MAX,e.energy+ticks);
  const at=value===ENERGY_MAX?now:e.energyAt+ticks*ENERGY_INTERVAL;
  return {value,at,nextIn:value===ENERGY_MAX?0:Math.min(ENERGY_INTERVAL,Math.max(0,ENERGY_INTERVAL-(now-at)))};
}
export function economySummary(owner,now=Date.now()){
  const e=owner.economy,{value,nextIn}=energyState(e,now);
  const n=unlimited(owner)?Number.MAX_SAFE_INTEGER:null;
  // The old native asset cache can still render its shop before refreshing.
  return {unlimited:unlimited(owner),energy:n?ENERGY_MAX:value,maxEnergy:ENERGY_MAX,energyCost:ENERGY_COST,interval:ENERGY_INTERVAL,nextIn:n?0:nextIn,serverTime:now,hints:n??e.hints,answers:n??e.answers,adSkips:n??e.adSkips,betaClaimed:e.betaClaimed,firstRecharge:e.firstRecharge,growth:growth(e.xp),diamonds:n??e.diamonds,trialClaimed:e.trialClaimed,freeplayRemainingMs:n??freeplayRemaining(e,now),freeplayActive:e.freeplayStartedAt!==null,dailyAds:{remaining:0},checkin:checkinSummary(owner,now)};
}
export function beginRun(owner,attempt,now=Date.now()){
  if(attempt.run)return false;
  const e=owner.economy,{value,at}=energyState(e,now);
  if(unlimited(owner)){attempt.run=randomUUID();attempt.rewarded=false;return true;}
  if(value<ENERGY_COST)throw fail(409,'活跃度不足 5 点。可以等待恢复，或用活力券恢复满活跃度。','ENERGY_EMPTY');
  e.energy=value-ENERGY_COST;e.energyAt=at;attempt.run=randomUUID();attempt.rewarded=false;return true;
}
export function awardRun(owner,attempt,level){
  if(!attempt.run||attempt.rewarded)return null;
  const before=growth(owner.economy.xp),xp=xpFor(level);owner.economy.xp+=xp;attempt.rewarded=true;
  return {xp,before:before.level,after:growth(owner.economy.xp).level};
}
export function useHint(owner){if(unlimited(owner))return;if(owner.economy.hints<1)throw fail(409,'提示用完了，去商城补充提示包吧。','HINTS_EMPTY');owner.economy.hints--;}
export function useAnswer(owner,attempt){
  if(attempt.answerUnlocked)return false;
  if(!unlimited(owner)&&owner.economy.answers<1)throw fail(409,'还没有答案包，可在商城用钻石兑换。','ANSWERS_EMPTY');
  if(!unlimited(owner))owner.economy.answers--;attempt.answerUnlocked=true;attempt.hints++;return true;
}
export function claimBeta(owner){
  if(owner.economy.betaClaimed)throw fail(409,'这个账号已经领取过活力券见面礼啦。','BETA_CLAIMED');
  owner.economy.betaClaimed=true;owner.economy.adSkips+=BETA_VOUCHERS;
}
export function refillEnergy(owner,now=Date.now()){
  const e=owner.economy;if(energyState(e,now).value===ENERGY_MAX)throw fail(409,'活跃度已经满了，先去冒险吧。','ENERGY_FULL');
  if(!unlimited(owner)&&e.adSkips<1)throw fail(409,'活力券用完了。可以等待活跃度恢复，或在星钻小铺领取见面礼。','VOUCHERS_EMPTY');
  if(!unlimited(owner))e.adSkips--;e.energy=ENERGY_MAX;e.energyAt=now;
}
export function grantPurchase(owner,productId,orderId){
  const product=products.find(p=>p.id===productId);if(!product)throw fail(400,'找不到这份补给。','PRODUCT_UNAVAILABLE');
  const e=owner.economy;
  const existing=e.orders.find(order=>order.id===orderId);
  if(existing){if(existing.product!==productId)throw fail(409,'这次兑换已用于其他补给。');return false;}
  if(product.once&&e.firstRecharge)throw fail(409,'首次答案礼包每个账号只能兑换一次。');
  if(product.item==='freeplayMs')settleFreeplay(e,Date.now());
  e[product.item]+=product.quantity;if(product.once)e.firstRecharge=true;
  e.orders.push({id:orderId,product:product.id,currency:'diamonds',priceDiamonds:product.priceDiamonds,at:new Date().toISOString()});return true;
}
export function buyWithDiamonds(owner,{product:productId,key}){
  if(typeof key!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(key))throw fail(400,'兑换请求缺少有效编号。');
  const product=products.find(p=>p.id===productId);if(!product)throw fail(400,'找不到这份补给。','PRODUCT_UNAVAILABLE');
  const e=owner.economy,id='diamond-'+key,existing=e.orders.find(o=>o.id===id||o.requestKey===key);
  if(existing){if(existing.product!==productId)throw fail(409,'这笔请求已经用于其他商品。');return {duplicate:true,spent:0};}
  if(!unlimited(owner)&&e.diamonds<product.priceDiamonds)throw fail(409,'钻石不够啦，可以通过花园问答和签到获得更多钻石。','DIAMONDS_EMPTY');
  grantPurchase(owner,productId,id);e.orders.find(o=>o.id===id).requestKey=key;if(!unlimited(owner))e.diamonds-=product.priceDiamonds;return {duplicate:false,spent:unlimited(owner)?0:product.priceDiamonds};
}
export function creditDiamonds(owner,amount,receipt){
  if(!Number.isSafeInteger(amount)||amount<=0||typeof receipt!=='string')throw new Error('Invalid diamond reward');
  const e=owner.economy;if(e.diamondReceipts.includes(receipt))return false;e.diamondReceipts.push(receipt);e.diamonds+=amount;return true;
}
