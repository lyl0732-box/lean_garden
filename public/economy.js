import {mascot,escapeHTML as esc} from './ui.js';

export function evolution(level=1){
  const forms=['嫩芽伙伴','花冠学徒','藤蔓术士','星叶法师','翡翠守卫','辉光贤者','苍穹领主','星河花神'];
  const stage=Math.min(forms.length-1,Math.floor((level-1)/3));
  return {name:forms[stage],stage,petals:Math.min(16,level+2),hue:(level-1)*17,crown:level>=4,wings:level>=7,rings:Math.floor((level-1)/3)};
}
export function evolvedMascot(level=1){
  const f=evolution(level),petals=level>1?Array.from({length:f.petals},(_,i)=>`<ellipse cx="60" cy="16" rx="4" ry="9" fill="hsl(${f.hue+35},80%,74%)" stroke="#927042" stroke-width=".7" transform="rotate(${i*360/f.petals} 60 62)"/>`).join(''):'';
  const wings=f.wings?'<path d="M32 86Q-8 45 10 30Q39 43 43 74M88 86Q128 45 110 30Q81 43 77 74" fill="#d7f8ef" stroke="#759c9b" stroke-width="2"/>':'';
  const crown=f.crown?'<path d="M41 37L36 18L51 26L60 10L70 26L84 18L79 37Z" fill="#f7d66e" stroke="#a77d38" stroke-width="2"/><circle cx="60" cy="28" r="4" fill="#8f78dc"/>':'';
  return mascot('growth-mascot').replace('<ellipse cx="61"',`${wings}<g class="growth-petals">${petals}</g><ellipse cx="61"`).replace('</svg>',`${crown}${f.rings?'<path d="M33 110Q60 123 89 110" fill="none" stroke="#dfb557" stroke-width="4"/>':''}</svg>`).replace('viewBox="0 0 120 130"',`viewBox="0 0 120 130" style="--growth-hue:${f.hue}deg"`);
}
export function growthView(e,btn){
  const g=e?.growth||{level:1,current:0,required:100},f=evolution(g.level);
  return `<button class="home-growth" data-action="growth" aria-label="芽芽等级 ${g.level}，${f.name}">${evolvedMascot(g.level)}<span><b>Lv.${g.level} · ${f.name}</b><span class="growth-meter" role="progressbar" aria-label="升级经验" aria-valuemin="0" aria-valuemax="${g.required}" aria-valuenow="${g.current}"><i style="width:${g.current/g.required*100}%"></i></span><small>${g.current} / ${g.required} EXP · 点我看成长</small></span></button>`;
}
export function energyPill(e){return e?`<button class="energy-pill" data-action="energy" aria-label="活跃度 ${e.energy} / 50"><span>⚡</span><b data-energy-value>${e.energy}</b><small>/50</small></button>`:'';}
export function shopView(e,shop,btn){
  return `<span class="eyebrow">YAYA'S LITTLE SHOP</span><h2>芽芽的小商城</h2><p class="shop-beta-note">${shop.mode==='test'?'测试服务器 · 模拟购买不扣款':'内测商城 · 仅展示价格，真实支付接入后开放购买'}</p><div class="inventory-strip"><span>💡 提示 <b>${e.hints}</b></span><span>📜 答案 <b>${e.answers}</b></span><span>🎟 免广告券 <b>${e.adSkips}</b></span></div><article class="shop-beta-gift"><span>🎁</span><div><b>内测见面礼 · 10 张免广告券</b><p>每个存档免费领取一次。每张券恢复满 50 活跃度。</p></div>${btn('claim-beta',e.betaClaimed?'已经领过啦':'免费领取','primary',e.betaClaimed?'disabled':'')}</article><div class="shop-products">${shop.products.map(p=>`<article class="shop-product"><span class="shop-product-art">${({hints:'💡',answers:'📜',adSkips:'🎟'})[p.item]}</span><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><b class="shop-price">¥ ${(p.priceFen/100).toFixed(0)}</b>${btn('buy-product',p.once&&e.firstRecharge?'已购买首充礼包':shop.mode==='disabled'?'支付待接入':shop.mode==='test'?'模拟购买（不扣款）':'购买','secondary',`data-product="${p.id}" ${shop.mode==='disabled'||p.once&&e.firstRecharge?'disabled':''}`)}</article>`).join('')}</div><p class="subtle">新存档赠送 5 次提示；答案包初始为 0。商品到账后自动存入背包。清空冒险进度不会重复发放内测礼包。</p>`;
}
export function energyView(e,adsAvailable,btn){
  const seconds=Math.ceil(e.nextIn/1000),time=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  return `<div class="energy-orb">⚡<b>${e.energy}<small>/50</small></b></div><h2>准备好下一场冒险</h2><p>每开一局消耗 5 活跃度，每 5 分钟恢复 1 点，上限 50 点。未完成的关卡可以免费继续。</p><p class="energy-countdown">${e.energy===50?'活跃度已满，出发吧！':`下 1 点约在 ${time} 后恢复`}</p><p>背包里有 <b>${e.adSkips}</b> 张免广告券。</p>${btn('refill-energy','用 1 张免广告券 · 恢复满活跃度','primary wide',e.adSkips<1||e.energy===50?'disabled':'')}${btn('watch-ad',adsAvailable?'看广告 · 恢复满活跃度':'广告尚未接入','secondary wide',!adsAvailable||e.energy===50?'disabled':'')}<p class="subtle">内测版可以去商城免费领取一次免广告券。</p>${btn('shop','去芽芽的小商城','text-button wide')}`;
}
