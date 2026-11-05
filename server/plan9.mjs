export function preparePlan9(levels,cards){
  const splitDefinition=(id,name,formula,newId,newName,newFormula,description)=>{
    const c=cards.find(c=>c.id===id);Object.assign(c,{name,formula,example:formula,description});
    cards.splice(cards.indexOf(c)+1,0,{id:newId,name:newName,kind:'definition',formula:newFormula,example:newFormula,description,icon:c.icon||'flower',order:c.order+.1});
    for(const l of levels)for(const key of ['skills','reward'])if(l[key].includes(id))l[key].push(newId);
  };
  splitDefinition('abs_value','零右边的距离','0 ≤ x → |x| = x','abs_nonpos','零左边的距离','x ≤ 0 → |x| = -x','绝对值表示离零的距离。看清数在零的哪一边，再展开对应的一条规则。');
  splitDefinition('intervals','闭区间','Set.Icc a b = {x | a ≤ x ∧ x ≤ b}','interval_open','开区间','Set.Ioo a b = {x | a < x ∧ x < b}','看清端点是否包含在区间内。');
  const remainder=cards.find(c=>c.id==='remainder');remainder.formula=remainder.example='(17 : ℤ) % 5 = 2';
  for(const l of levels)for(const a of l.actions)if(a.code.includes('abs_of_nonpos'))a.uses=a.uses.map(id=>id==='abs_value'?'abs_nonpos':id);
  const zero=cards.find(c=>c.id==='pow');
  Object.assign(zero,{name:'零次方定义',formula:'a ^ 0 = 1',example:'a ^ 0 = 1',description:'不乘任何一份，约定结果为 1。'});
  cards.splice(cards.indexOf(zero)+1,0,{id:'pow_succ',name:'乘方下一阶',kind:'definition',formula:'a ^ succ n = a ^ n * a',example:'a ^ succ n = a ^ n * a',description:'指数多一格，就再乘一次底数。',icon:'crystal',order:zero.order+.1});
  const first=levels.find(l=>l.id==='n20');
  (first.skills.includes('pow')?first.skills:first.reward).push('pow_succ');
  for(const l of levels)for(const a of l.actions)if(/\[Garden\.pow_succ\]/.test(a.code))a.uses=a.uses.map(id=>id==='pow'?'pow_succ':id);
  const triple=levels.find(l=>l.id==='n13');
  triple.actions=triple.actions.filter(a=>!a.code.includes('Nat.add_comm b c'));
  triple.solution=['garden_strict_rw [Nat.add_assoc]','garden_strict_rw (occs := [2]) [Nat.add_comm]','garden_strict_rfl'];
  triple.actions.push({id:'n13-occurrence-2',skill:'rw',label:'加法交换律 · 指定第 2 处',code:triple.solution[1],uses:['add_comm']});
  triple.lesson='先用结合律移动括号，再抽取加法交换律，指定第 2 处，把内层 b + c 换成 c + b。';
  triple.hints=[triple.lesson];
}
