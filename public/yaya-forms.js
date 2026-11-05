import {assetURL} from './asset-cache.js';import {escapeHTML as esc} from './ui.js';
export const yayaAssetRoot='/assets/yaya-v0111/';
export const forms=[
  {level:1,name:'嫩芽伙伴',file:'01-sprout',detail:'最初的两片嫩叶，圆圆的芽芽。'},
  {level:3,name:'花苞伙伴',file:'02-bud',detail:'两片叶子之间，长出一颗小花苞。'},
  {level:5,name:'初绽伙伴',file:'03-bloom',detail:'小花轻轻绽开，添上几片叶领。'},
  {level:8,name:'披叶学徒',file:'04-cape',detail:'叶领长成短披肩，扣上一朵小花。'},
  {level:11,name:'见习学徒',file:'05-apprentice',detail:'戴上小小的学徒帽，拿起朴素木杖。'},
  {level:14,name:'星叶学徒',file:'06-mage',detail:'披肩添上紫边，木杖结出一颗小晶石。'},
  {level:18,name:'花园法师',file:'07-scholar',detail:'衣边多了叶纹，带上自己的小书。'},
  {level:22,name:'紫晶贤者',file:'08-sage',detail:'帽檐与披肩绣上花叶，依旧是熟悉的芽芽。'}
];
export function evolution(level=1){const stage=forms.findLastIndex(f=>f.level<=level);return {...forms[Math.max(0,stage)],stage:Math.max(0,stage),hue:(level-1)*9};}
export function evolvedMascot(level=1){const f=evolution(level);return `<img class="yaya-form yaya-form-${f.stage+1}" src="${esc(assetURL(yayaAssetRoot+f.file+'.png'))}" alt="芽芽当前形态：${f.name}" draggable="false" style="--level-aura:${f.hue}deg">`;}
export function growthView(e,interactive=true){const g=e?.growth||{level:1,current:0,required:100},f=evolution(g.level);return `<section class="home-companion hero-yaya" ${interactive?'data-action="growth" role="button" tabindex="0"':''} aria-label="查看芽芽等级与经验"><div class="yaya-pedestal" aria-hidden="true"></div>${evolvedMascot(g.level)}<div class="yaya-growth-label"><b>Lv.${g.level} · ${f.name}</b><div class="growth-meter" role="progressbar" aria-label="升级经验" aria-valuemin="0" aria-valuemax="${g.required}" aria-valuenow="${g.current}" aria-valuetext="${g.current} / ${g.required} 经验"><i class="growth-fill" aria-hidden="true" style="width:${g.current/g.required*100}%"></i></div><small>${g.current} / ${g.required} EXP</small><span>每一个证明，都让我更强一点。</span></div><small class="yaya-tap-label">点我看成长</small></section>`;}
