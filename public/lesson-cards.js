export function framesFor(card) {
  const frames={
    rfl:[['观察等号两边','0 = 0'],['两边是同一个数','0  ↔  0'],['点击自反之种','rfl'],['种下第一个证明','✓ 证明完成']],
    rw:[['已知一条等式','h : a = b'],['在仓库选 h，正向改写目标','a = b  →  b = b'],['改写后目标仍然保留','b = b'],['再手动点 rfl','✓ 证明完成']],
    nat_zero:[['从零出发','0'],['取一次后继','Nat.succ 0'],['走到下一个数','1'],['再走一步','Nat.succ 1 = 2']],
    one_eq_succ_zero:[['认识这条等式','1 = Nat.succ 0'],['准备改写目标','Nat.succ 0 = 1'],['用定理把 1 换成后继','Nat.succ 0 = Nat.succ 0'],['现在可以手动点 rfl','✓ 两边相同']],
    addition:[['加法从零开始','n + 0 = n'],['右边走一步','n + Nat.succ m'],['结果也走一步','Nat.succ (n + m)'],['两条规则共同定义加法','add_zero  ·  add_succ']],
    add_zero:[['已经有 n 朵花','n'],['再放入零朵','n + 0'],['用 add_zero 改写','n + 0 = n  →  n = n'],['最后手动点 rfl','✓ 证明完成']],
    add_succ:[['要加的是一个后继','n + Nat.succ m'],['先加 m，再向前一步','Nat.succ (n + m)'],['用 add_succ 改写目标','Nat.succ (n + m) = Nat.succ (n + m)'],['最后手动点 rfl','✓ 证明完成']],
    constructor:[['目标是合取','P ∧ Q'],['拆成两个目标','① P     ② Q'],['两边都要提供证据','✓ P     ✓ Q'],['重新合成一朵双生花','✓ P ∧ Q']],
    rcases:[['假设中有一个包裹','h : P ∧ Q'],['点击拆包','rcases h with ⟨hp, hq⟩'],['获得两份证据','hp : P     hq : Q']],
    induction:[['任意自然数的性质','P n'],['先证明起点','① P 0'],['再证明后继','② 已知 P k，证明 P (succ k)'],['两个分支都要完成','P 0 → P 1 → P 2 → …']]
  };
  return frames[card.id]||[
    [card.kind==='definition'?'认识一个新定义':card.kind==='theorem'?'认识一条新定理':'认识一个新技能',card.name],
    ['看看它的形式',card.example],
    ['带着它去观察当前目标',card.description]
  ];
}
