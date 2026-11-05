export function prepareRevision6(levels,cards){
  const retired=new Set(['peano_zero','peano_successor','peano_induction']);
  for(let i=cards.length-1;i>=0;i--)if(retired.has(cards[i].id))cards.splice(i,1);
  for(const l of levels){l.skills=l.skills.filter(id=>!retired.has(id));l.reward=(l.reward||[]).filter(id=>!retired.has(id));}
  cards.find(c=>c.id==='use').description='亲手填写一个数或表达式，作为存在命题的见证，再证明它满足要求。';
  cards.find(c=>c.id==='rw').description='先抽取等式卡，再用弧形滑钮决定方向；默认全部代换，也可指定位置。确认后点目标或已知命题施法，最后手动 rfl 收尾。';
  levels.find(l=>l.id==='n02').lesson='h 是一条已知等式。点 rw，抽取 h；确认方向后举起魔杖，再点目标等式。把 a 换成 b 后，亲手点 rfl 完成。';
  levels.find(l=>l.id==='n08').lesson='后继永远不是零。点 apply，从公理架抽取“零不是后继”，确认后把魔法送到当前目标。';
  levels.find(l=>l.id==='l10').lesson='∃ 表示“存在”。点 use，亲手输入一个自然数作见证，再让 Lean 检查它是否满足 n = 3。';
  const mini=levels.find(l=>l.id==='m06');mini.lesson='亲手构造一个整数，让它同时打开三把余数锁；选好后逐个验证。';
}
