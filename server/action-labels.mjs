// Button labels describe the mathematical move; Lean source stays in proof history.
const labels={
  l17:['展开函数复合，计算结果'],l20square:['判断平方非负'],
  a01abs:['按 x ≥ 0 或 x ≤ 0 分情况','用 x ≥ 0 展开绝对值','把条件记为 h','用 x ≤ 0 展开绝对值','结合 h 的左半边比较大小'],
  a02identities:['展开除法，算出零乘任何数'],a05:['把目标写成两点距离的比较'],
  a07:['证明实际变化与预测变化之差为零','用零误差简化目标'],a08:['化简常数函数的零误差'],
  a09:['取出恒等函数的导数，记为 hi','把 hi 与自身相乘，记为 hm','对照 hm，逐项核对表达式','把平方写成两个相同因子','证明平方与自身相乘相等'],
  a09sum:['把两个假设和目标都展开为导数定义','相加两份误差，记为 he','对照 he，核对误差表达式','证明总误差等于两份误差之和'],
  a11constant:['展开常数积分，整理为长度乘高度'],
  a12power:['取整数幂的积分结果，记为 hi','把整数幂转回自然数幂'],
  a12identity:['在幂函数积分中选指数 1','在 hi 中化简一次方与数字'],
  a15:['取出内部极值点 c、位置 hm 与极值性质 hext','选择 c 作为例子'],
  a16:['证明区间长度不为零，记为 hs','把整段平均斜率记为 s','定义辅助函数 g：原函数减去割线','证明 g 连续，记为 hg','证明 g 两端同高，记为 he','用罗尔定理取点 c、位置 hm 与零导数 hzero','求 g 的导数，记为 hder','取出 hder 中的导数等式，记为 heq','选择 c 作为例子','把目标写成原函数导数等于 s'],
  a19ivt:['证明连续函数的像连成一片','把左端点的高度放进像中','把右端点的高度放进像中'],
  a20:['证明连续函数的像连成一片','把 0 处的高度放进像中','把 1 处的高度放进像中'],
  t13bezout:['按整数 m 的正负分情况','按整数 n 的正负分情况','展开 n 为负数的表达式','展开 m 为负数的表达式','展开 m、n 都为负数的表达式']
};
export function labelActions(levels){
  for(const level of levels){
    const raw=level.actions.filter(a=>a.label===a.code&&!['rw','apply','induction'].includes(a.skill));
    const names=labels[level.id];
    if(names){if(names.length!==raw.length)throw new Error(`Teaching labels need review: ${level.id}`);raw.forEach((a,i)=>a.label=names[i]);}
    for(const a of level.actions)if(a.skill==='apply'&&a.label===a.code)a.label=`使用 ${a.code.replace(/^(?:garden_nat_apply|apply) /,'')}`;
  }
}
