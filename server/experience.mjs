import assumptions from './assumption-replacements.json' with {type:'json'};

export function prepareExperience(levels,cards,commonActions) {
  const bridge={id:'n06a',chapter:'n',number:7,title:'加一，就是下一步',statement:'(n : Nat) : n + 1 = succ n',goal:'n + 1 = succ n',
    lesson:'先把 1 换成 succ 0，再用 add_succ 和 add_zero。你会发现：加一就是走到下一个数。',skills:[],reward:['add_one_eq_succ'],
    actions:[['Garden.one_eq_succ_zero','one_eq_succ_zero'],['Nat.add_succ','add_succ'],['Nat.add_zero','add_zero']].map(([term,uses],i)=>({id:`n06a-${i}`,skill:'rw',label:`使用 ${uses}`,code:`rewrite [${term}]`,uses:[uses]})),
    solution:['rewrite [Garden.one_eq_succ_zero]','rewrite [Nat.add_succ]','rewrite [Nat.add_zero]','rfl'],requiredRewrites:['Garden.one_eq_succ_zero','Nat.add_succ','Nat.add_zero'],
    hints:['把 1 看成 succ 0。','依次用 one_eq_succ_zero、add_succ、add_zero，最后点 rfl。']};
  levels.splice(levels.findIndex(l=>l.id==='n07'),0,bridge);
  let naturalNumber=0;for(const l of levels.filter(l=>l.chapter==='n'))l.number=++naturalNumber;
  cards.push({id:'add_one_eq_succ',name:'加一阶梯',description:'加上 1，就是走到下一个自然数。',example:'n + 1 = succ n',icon:'sprout',kind:'theorem'});
  const rename=id=>['exact','assumption'].includes(id)?'apply':id;
  for(const l of levels) {
    l.skills=[...new Set(l.skills.map(rename))];l.reward=[...new Set((l.reward||[]).map(rename))];
    if(l.required)l.required=[...new Set(l.required.map(rename))];
    l.lesson=l.lesson.replaceAll('exact','apply').replaceAll('assumption','apply 选择已知命题').replaceAll('Nat.succ','succ');
    l.hints=l.hints.map(h=>h.replaceAll('exact','apply').replaceAll('assumption','apply 选择已知命题').replaceAll('Nat.succ','succ'));
    const convert=code=>code.replace(/^exact /,'apply ').replace('apply ⟨hc0,hc1⟩','apply And.intro hc0 hc1');
    l.solution=l.solution.map((code,i)=>code==='assumption'?assumptions[`${l.id}:${i}`]:convert(code));
    if(l.solution.some(c=>!c))throw new Error(`${l.id}: missing apply replacement`);
    l.actions=l.actions.map(a=>({...a,skill:rename(a.skill),code:convert(a.code)}));
    for(const code of l.solution.filter(c=>c.startsWith('apply ')))if(!l.actions.some(a=>a.code===code))
      l.actions.push({id:`${l.id}-apply-${l.actions.length}`,skill:'apply',label:`使用 ${code.slice(6)}`,code,uses:[]});
  }
  for(let i=commonActions.length-1;i>=0;i--)if(['exact','assumption'].includes(commonActions[i].skill))commonActions.splice(i,1);
  for(let i=cards.length-1;i>=0;i--)if(['exact','assumption'].includes(cards[i].id))cards.splice(i,1);
  const apply=cards.find(c=>c.id==='apply');apply.description='选目标时，用证据完成目标，或把它变成前提；选已知命题时，把规则用在它身上。';apply.example='apply h\napply theorem_name';
  levels.find(l=>l.id==='n07').lesson='先选 induction，再选变量 n。零分支用 rfl；后继分支用 add_succ 和 ih 改写，最后再点 rfl。';
  levels.find(l=>l.id==='n08').lesson='后继永远不是零。选 apply → 当前目标，再到定理仓库找“零不是后继”。';
  levels.find(l=>l.id==='n06').hints[0]='先用 h 替换 a，再用 add_zero 消去 +0，最后手动点 rfl。';
  levels.find(l=>l.id==='n01').lesson='目标栏是你要证明的事。0 和 0 一样，点左侧的 rfl 卡，就能完成第一个证明！';
  const contradiction=levels.find(l=>l.id==='l09');
  cards.push({id:'false_elim',name:'矛盾之门',kind:'theorem',icon:'shield',description:'如果已知条件互相矛盾，得到 False，就可以推出任意命题。',example:'False → Q'});
  contradiction.skills.push('false_elim');
  contradiction.solution=['apply False.elim','apply hn','apply hp'];
  contradiction.actions=contradiction.solution.map((code,i)=>({id:`l09-apply-${i}`,skill:'apply',label:['从矛盾推出目标','使用否定条件 hn','使用条件 hp'][i],code,uses:i===0?['false_elim']:[]}));
  const crossing=levels.find(l=>l.id==='a21');
  crossing.solution=crossing.solution.flatMap(code=>code==='apply And.intro hc0 hc1'?['constructor','apply hc0','apply hc1']:[code]);
  crossing.actions=crossing.actions.filter(a=>a.code!=='apply And.intro hc0 hc1');
  for(const name of ['hc0','hc1'])crossing.actions.push({id:`a21-apply-${name}`,skill:'apply',label:`使用 ${name}`,code:`apply ${name}`,uses:[]});
  const meanValue=levels.find(l=>l.id==='a22');
  meanValue.solution=meanValue.solution.map(code=>code==='apply lt_trans hui.2 hvi.1'?'linarith [hui.2,hvi.1]':code);
  meanValue.actions=meanValue.actions.map(a=>a.code==='apply lt_trans hui.2 hvi.1'?{...a,skill:'linarith',code:'linarith [hui.2,hvi.1]'}:a);
  for(const c of cards){c.description=c.description.replaceAll('Nat.succ','succ');c.example=c.example.replaceAll('Nat.succ','succ');}
}
