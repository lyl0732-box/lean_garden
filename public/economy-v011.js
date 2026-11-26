import {resourceCount} from './shop.js';
import {icon} from './ui.js';
export {evolution,evolvedMascot,growthView} from './yaya-forms.js';
export {shopView} from './shop.js';
export function energyPill(e){
  if(!e)return '';
  const label=e.unlimited?'无限':`${e.energy} / ${e.maxEnergy}`;
  return `<button class="energy-pill" data-action="energy" aria-label="活跃度 ${label}"><span>⚡</span><b data-energy-value>${resourceCount(e,'energy')}</b>${e.unlimited?'':`<small>/${e.maxEnergy}</small>`}</button>`;
}
export function energyView(e,btn){
  if(e.unlimited)return `<div class="energy-orb">⚡<b>∞</b></div><h2>活跃度无限</h2><p>随时进入关卡，也可以反复练习。</p>${btn('close-modal','继续冒险','primary wide')}`;
  const seconds=Math.ceil(e.nextIn/1000);
  const time=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  return `<div class="energy-orb">⚡<b>${e.energy}<small>/50</small></b></div>
    <h2>准备好下一场冒险</h2><p>每开一局消耗 5 活跃度，每 5 分钟恢复 1 点，上限 50 点。未完成的关卡可以免费继续。</p>
    <p class="energy-countdown">${e.energy===50?'活跃度已满，出发吧！':`下 1 点约在 ${time} 后恢复`}</p>
    <p>背包里有 <b>${resourceCount(e,'adSkips')}</b> 张活力券。</p>
    ${btn('refill-energy','用 1 张活力券 · 恢复满活跃度','primary wide',e.adSkips<1||e.energy===50?'disabled':'')}
    <p class="subtle">在星钻小铺领取见面礼，或通过七天签到获得活力券。</p>
    ${btn('shop',icon('shop')+' 去星钻小铺','text-button wide')}`;
}
