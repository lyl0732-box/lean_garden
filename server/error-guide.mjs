const rules=[
  [/两边还没有完全相同|rfl.*failed|not definitionally equal/i,'两边还不一样','先用 rw 把两边改成相同写法，再用 rfl 收尾。'],
  [/所选位置没有形状完全相同|did not find instance|rewrite.*failed|occurrence/i,'没有找到你选的那一处','确认改写方向和作用位置。指定第几个超过实际出现次数，也会得到这个错误；可以换成“只改第一处”检查。'],
  [/结论与目标写法不同|failed to unify|unable to unify|apply.*failed/i,'这份证据还接不上目标','apply 要让证据的结论和目标对应。先改写需要的定义，或选另一条已知命题。'],
  [/不是等式|只能用等式|expected.*equality/i,'这张证据不能用来改写','rw 需要等式或等价命题。普通的推理规则可以试试 apply。'],
  [/no goals to be solved/i,'这个证明已经完成','当前已经没有目标，可以领取奖励或返回地图。'],
  [/unknown identifier|unknown constant/i,'这份证据在当前分支里找不到','拆包或归纳后，已知条件可能变化。重新打开仓库，选择当前列出的命题。'],
  [/type mismatch|application type mismatch/i,'选的对象类型不合适','例如自然数、实数和命题不能随便互换。检查对象和规则要求的类型。'],
  [/unsolved goals/i,'还有小目标需要完成','先看当前目标；所有分支都完成才算通关。'],
  [/maximum recursion|maximum.*heartbeat|timeout|timed out|超过.*64|循环/i,'这一步重复太多次','改写可能绕回原式，或一直展开。换成“只改第一处”，逐步观察变化。'],
  [/induction.*failed|not an inductive|tactic.*induction/i,'这个对象暂时不能这样归纳','在归纳选择框里选当前分支的自然数变量。'],
  [/依赖类型/i,'这次改写牵动了其他条件','试着只改一处，或先处理依赖这条命题的条件。'],
  [/具体参数|指定.*参数/i,'这条规则还缺少对象','在仓库选择带有本关具体参数的用法。'],
  [/rfl 只能用于等式/i,'目标还不是等式','先看目标是“任意”“存在”还是“并且”，选择相应技能处理。'],
];
export function explainLeanError(details=''){
  const [,title,help]=rules.find(([pattern])=>pattern.test(details))||[null,'这一步还没有对上','检查当前目标、作用位置、方向和证据；也可以查看原始 Lean 解释。'];
  return {title,help};
}
