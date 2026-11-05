import {escapeHTML as esc} from './ui.js';

export function branchTitle(goal,index=0){
  const part=goal.name?.split('.').at(-1);
  if(part==='zero')return '起点 · 取 0';
  if(part==='succ')return '下一步 · 从 k 到 succ k';
  if(part==='left')return '左边这一部分';
  if(part==='right')return '右边这一部分';
  if(part==='inl')return '情况一 · 左边成立';
  if(part==='inr')return '情况二 · 右边成立';
  return `目标 ${index+1}`;
}
export function branchNote(goal){
  const part=goal?.name?.split('.').at(-1);
  if(part==='zero')return '先守住起点：证明 0 的情形。完成后会自动进入下一步。';
  if(part==='succ')return 'ih 是归纳假设：上一格已经成立。借它证明下一格 succ k。';
  return '';
}
const symbols=[
  ['succ','下一个自然数','succ 2 表示 2 的下一格，也就是 3。'],
  ['∀','任意一个','∀ n, P n：不论选哪个 n，P n 都成立。'],
  ['∃','至少存在一个','∃ n, P n：找一个 n，并证明它满足 P。'],
  ['∧','两件事都成立','P ∧ Q：既要证明 P，也要证明 Q。'],
  ['∨','至少一件事成立','P ∨ Q：证明其中一边就够了。'],
  ['¬','不成立','¬ P：假设 P 成立，会导致矛盾。'],
  ['→','推出；也可表示映射','P → Q 是“如果 P，那么 Q”；ℝ → ℝ 是实数到实数的函数。'],
  ['↔','互相推出','P ↔ Q：既证明 P 推出 Q，也证明 Q 推出 P。'],
  ['≠','不相等','a ≠ b：假设相等，会产生矛盾。'],
  ['≤','小于或等于','a ≤ b 允许两边相等。'],
  ['∈','属于','x ∈ A：x 在集合 A 里面。'],
  ['ℕ','自然数','从 0 开始：0、1、2、3……'],
  ['ℤ','整数','包含负整数、零和正整数。'],
  ['ℝ','实数','数轴上的数，包括分数和无理数。'],
  ['HasDerivAt','在某点的导数','HasDerivAt f d x：f 在 x 处可导，导数是 d。'],
  ['ContinuousOn','在一片范围上连续','ContinuousOn f A：f 在集合 A 上连续。'],
  ['Icc','含端点的区间','Icc a b 表示 a ≤ x ≤ b 的范围。'],
  ['Ioo','不含端点的区间','Ioo a b 表示 a < x < b 的范围。'],
  ['∣','整除','m ∣ n：n 是 m 的某个整数倍。'],
  ['∫','积分','∫ x in a..b, f x：累计 a 到 b 上的带符号面积。'],
  ['False','矛盾','证明 False 就是推导出了不可能成立的事情。']
];
export function symbolGuide(goals){
  const text=goals.map(g=>g.target+' '+g.hypotheses.map(h=>h.type).join(' ')).join(' ').replace(/\bNat\b/g,'ℕ');
  const items=symbols.filter(([symbol])=>text.includes(symbol));
  return `<p class="modal-description">这里解释当前证明中出现的记号。随时查阅，不消耗提示，也不影响星星。</p><dl class="symbol-guide">${items.map(([symbol,title,explanation])=>`<div><dt><code>${esc(symbol)}</code><b>${title}</b></dt><dd>${esc(explanation)}</dd></div>`).join('')||'<div><dt><code>=</code><b>相等</b></dt><dd>要证明等号两边表示同一个对象。先用学过的规则改写，再用 rfl 收尾。</dd></div>'}</dl>`;
}
