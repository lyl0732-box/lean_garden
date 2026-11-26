import {icon,escapeHTML as esc} from './ui.js';
import {evolvedMascot} from './yaya-forms.js';
export const gem=()=>'<span class="gem-icon" aria-hidden="true">'+icon('diamond')+'</span>';
export const resourceCount=(e,key)=>e?.unlimited?'∞':e?.[key]||0;
export function formatTime(ms){if(ms>=Number.MAX_SAFE_INTEGER-86400000)return '∞';const s=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return (h?h+':':'')+String(m).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
export function diamondPill(e){return `<button class="diamond-pill" data-action="shop" aria-label="钻石余额 ${resourceCount(e,'diamonds')}">${gem()}<b data-diamond-value>${resourceCount(e,'diamonds')}</b></button>`;}
export const diamondProducts=shop=>shop.products.filter(p=>Number.isSafeInteger(p.priceDiamonds)&&p.priceDiamonds>0);
export function shopView(e,shop,btn,filter='all'){
  const categories=[['all','全部补给'],['supplies','灵感补给'],['time','花径通行证']];
  const shown=diamondProducts(shop).filter(p=>filter==='all'||(p.item==='freeplayMs'?'time':'supplies')===filter);
  const products=shown.map(p=>{
    const redeemed=p.once&&e.firstRecharge,pass=p.item==='freeplayMs';
    const art=p.item==='hints'?'💡':p.item==='answers'?'📜':'⌛';
    return `<article class="shop-product ${pass?'time-product':'supply-product'}">
      <span class="shop-product-art">${art}</span><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>
      <b class="shop-price">${gem()}${p.priceDiamonds} <small>钻石</small></b>
      ${btn('buy-product',redeemed?'已兑换':'用钻石兑换','primary',`data-product="${esc(p.id)}" ${redeemed?'disabled':''}`)}
    </article>`;
  }).join('');
  return `<section class="shop-room">
    <div class="shop-canopy"><span>✦</span><h1>星钻小铺</h1><span>✦</span></div>
    <header class="shop-hero">
      <div class="shop-keeper">${evolvedMascot(e.growth.level)}</div>
      <div><h2>用钻石兑换补给</h2><p>通过签到和花园问答获得钻石。</p></div>
      <div class="shop-wallet">${gem()}<b>${resourceCount(e,'diamonds')}</b><span>我的钻石</span></div>
    </header>
    <div class="inventory-strip"><span>💡 提示 <b>${resourceCount(e,'hints')}</b></span><span>📜 答案 <b>${resourceCount(e,'answers')}</b></span><span>🎟 活力券 <b>${resourceCount(e,'adSkips')}</b></span><span>⌛ 选关 <b data-freeplay-time>${formatTime(e.freeplayRemainingMs)}</b></span></div>
    <div class="shop-gifts">
      <article class="shop-gift voucher-gift"><span>🎁</span><div><small>见面礼 · 每个账号一次</small><h3>3 张活力券</h3><p>每张恢复满 50 点活跃度。</p></div>${btn('claim-beta',e.betaClaimed?'已收入背包':'免费领取','primary',e.betaClaimed?'disabled':'')}</article>
      <article class="shop-gift trial-gift"><span>🗺</span><div><small>第一次相遇 · 每个账号一次</small><h3>10 分钟自由选关</h3><p>开启时计时，关闭即暂停。</p></div>${btn('claim-trial',e.trialClaimed?'已收入背包':'免费领取','primary',e.trialClaimed?'disabled':'')}</article>
    </div>
    <div class="shop-tabs" role="tablist">${categories.map(([id,label])=>btn('shop-category',label,'shop-tab '+(id===filter?'selected':''),`data-filter="${id}" role="tab" aria-selected="${id===filter}"`)).join('')}</div>
    <div class="shop-products">${products}</div>
  </section>`;
}
