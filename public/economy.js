import {mascot} from './ui.js';
export {shopView,energyView} from './economy-v011.js';

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
