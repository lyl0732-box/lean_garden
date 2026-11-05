import { advancedRevision } from './advanced-v4.mjs';
import { labelActions } from './action-labels.mjs';
// Version 4: definitions are equipment; theorems are earned by proving them.
export function prepareRevision4(levels,cards,commonActions){
  const level=id=>levels.find(l=>l.id===id),card=id=>cards.find(c=>c.id===id);
  const R=term=>`garden_strict_rw [${term}]`,F='garden_strict_rfl',I=v=>`induction ${v} using Nat.rec with\n| zero\n| succ k ih`;
  const addCard=(id,name,kind,formula,description)=>cards.push({id,name,kind,formula,description,example:formula,icon:'flower'});
  const insert=(after,id,title,statement,solution,reward=[],skills=[])=>{
    const old=level(after),l={id,chapter:old.chapter,number:0,title,statement,goal:statement.slice(statement.lastIndexOf(' : ')+3),lesson:title+'：一步一步，把等式两边变成一样。',solution,reward,skills,actions:[],hints:['观察目标，选择已经学过的定义或定理。']};
    levels.splice(levels.indexOf(old)+1,0,l);return l;
  };
  const set=(id,solution,lesson)=>{level(id).solution=solution;level(id).actions=[];if(lesson)level(id).lesson=lesson;};
  const removed=['nat_zero','addition','multiplication','exponentiation'];
  for(let i=cards.length-1;i>=0;i--)if(removed.includes(cards[i].id))cards.splice(i,1);
  for(const l of levels){l.skills=l.skills.filter(x=>!removed.includes(x));l.reward=l.reward.filter(x=>!removed.includes(x));}
  for(const id of ['one_eq_succ_zero','add_zero','add_succ','mul_zero','mul_succ','pow','false_elim'])card(id).kind='definition';
  for(const id of ['succ_ne','succ_inj'])card(id).kind='axiom';
  addCard('peano_zero','起点 · 零','axiom','0 : Nat','自然数的旅程从 0 开始。');
  addCard('peano_successor','每个数都有下一步','axiom','n : Nat → succ n : Nat','每个自然数都能再往前走一步。');
  addCard('peano_induction','走遍整条数轴','axiom','P 0 → (∀ n, P n → P (succ n)) → ∀ n, P n','起点成立；每一步都能接上；就能走遍所有自然数。');
  for(const [id,name,formula]of [['two_eq_succ_one','第二级台阶','2 = succ 1'],['three_eq_succ_two','第三级台阶','3 = succ 2'],['four_eq_succ_three','第四级台阶','4 = succ 3']])addCard(id,name,'definition',formula,'数字的名字，就是前一个数的下一步。');
  for(const [id,name,formula]of [['succ_add','左边的下一步','succ a + b = succ (a + b)'],['mul_one','只种一排','a * 1 = a'],['succ_mul','多种一列','succ a * b = a * b + b'],['add_mul','左侧分配律','(a + b) * c = a * c + b * c'],['pow_two','平方的两份','a ^ 2 = a * a']])addCard(id,name,'theorem',formula,'先亲手证明，再把这条规则收入仓库。');
  Object.assign(card('rfl'),{description:'只有等号两边写法完全相同，才能收尾。计算和展开定义要先用 rw。',formula:'同一个式子 = 同一个式子'});
  Object.assign(card('rw'),{description:'选择证据，把匹配的一处换成另一边。默认只改第一个；改完后自己点 rfl。',formula:'a = b：把一处 a 换成 b'});
  Object.assign(card('pow'),{name:'乘方的两条定义',description:'零次方是 1；指数走到下一步，就再乘一次底数。',formula:'a ^ 0 = 1\na ^ succ n = a ^ n * a'});
  const formulas={one_eq_succ_zero:'1 = succ 0',add_zero:'a + 0 = a',add_succ:'a + succ b = succ (a + b)',zero_add:'0 + a = a',succ_ne:'succ n ≠ 0',succ_inj:'succ a = succ b → a = b',add_assoc:'(a + b) + c = a + (b + c)',add_comm:'a + b = b + a',mul_zero:'a * 0 = 0',mul_succ:'a * succ b = a * b + a',zero_mul:'0 * a = 0',distribute:'a * (b + c) = a * b + a * c',mul_comm:'a * b = b * a',add_one_eq_succ:'a + 1 = succ a',square_nonneg:'0 ≤ x ^ 2',abs:'|x| < ε ↔ -ε < x ∧ x < ε',real_identities:'x - x = 0\nx - 0 = x\n0 / x = 0',deriv_id:'HasDerivAt (fun y => y) 1 x',deriv_const:'HasDerivAt (fun _ => c) 0 x',deriv_pow:'HasDerivAt (fun y => y ^ 2) (2 * x) x',deriv_add:'HasDerivAt f f′ x → HasDerivAt g g′ x → HasDerivAt (f + g) (f′ + g′) x',integral:'∫ x in a..b, c = (b - a) * c',rolle:'f a = f b → ∃ c ∈ (a, b), deriv f c = 0',mvt:'∃ c ∈ (a, b), deriv f c = (f b - f a) / (b - a)',ivt:'f a ≤ y ≤ f b → ∃ c ∈ [a, b], f c = y',bezout:'gcd m n = m * gcdA m n + n * gcdB m n',crt:'gcd m n = 1 → ∃ x, x ≡ a (mod m) ∧ x ≡ b (mod n)',false_elim:'False → P'};
  for(const c of cards)if(formulas[c.id])c.formula=formulas[c.id];
  level('n03').skills.push('peano_zero','peano_successor');level('n02').discoveries=['successor'];
  level('n02').lesson='h 是一条已知等式。点击 rw，在主界面选正向、当前目标，再从「已有命题」选 h。把 a 换成 b 后，亲手点 rfl 完成。';
  level('n03').reward.push('two_eq_succ_one','three_eq_succ_two','four_eq_succ_three');
  insert('n03','n03numbers','数字阶梯接力',': succ (succ (succ (1 : Nat))) = 4',[R('Garden.four_eq_succ_three'),R('Garden.three_eq_succ_two'),R('Garden.two_eq_succ_one'),F]).discoveries=['addition'];
  insert('n05','n05one','一加一的花朵',': (1 : Nat) + 1 = 2',[R('Garden.one_eq_succ_zero'),R('Garden.one_eq_succ_zero'),R('Nat.add_succ'),R('Nat.add_zero'),R('← Garden.one_eq_succ_zero'),R('← Garden.two_eq_succ_one'),F]).lesson='先把 1 变成 succ 0，再展开加法。最后把台阶变回数字 2。';
  level('n07').skills.push('peano_induction');
  set('n07',[I('n'),R('Nat.add_zero'),F,R('Nat.add_succ'),R('ih'),F],'小首领：先证明 0，再借助 ih 走到 succ k。两个分支都要亲手改写。');
  insert('n06a','n07two','两朵加两朵',': (2 : Nat) + 2 = 4',[R('Garden.two_eq_succ_one'),R('Garden.two_eq_succ_one'),R('Nat.add_succ'),R('Garden.add_one_eq_succ'),R('← Garden.two_eq_succ_one'),R('← Garden.three_eq_succ_two'),R('← Garden.four_eq_succ_three'),F]);
  set('n11',[I('c'),R('Nat.add_zero'),R('Nat.add_zero'),F,R('Nat.add_succ'),R('Nat.add_succ'),R('Nat.add_succ'),R('ih'),F]);
  insert('n11','n11succ','把左边也推一步','(a b : Nat) : succ a + b = succ (a + b)',[I('b'),R('Nat.add_zero'),R('Nat.add_zero'),F,R('Nat.add_succ'),R('Nat.add_succ'),R('ih'),F],['succ_add']);
  set('n12',[I('b'),R('Nat.add_zero'),R('Nat.zero_add'),F,R('Nat.add_succ'),R('Nat.succ_add'),R('ih'),F],'用归纳法证明交换律。先解决零，再用刚证明的 succ_add 接上下一步。');
  level('n13').discoveries=['multiplication'];
  set('n14',[R('Nat.mul_zero'),F]);set('n15',[R('Nat.mul_succ'),F]);
  set('n16',[I('n'),R('Nat.mul_zero'),F,R('Nat.mul_succ'),R('ih'),R('Nat.add_zero'),F]);
  set('n17',[R('Garden.one_eq_succ_zero'),R('Nat.mul_succ'),R('Nat.mul_zero'),R('Nat.zero_add'),F]);level('n17').reward.push('mul_one');
  set('n18',[I('c'),R('Nat.add_zero'),R('Nat.mul_zero'),R('Nat.add_zero'),F,R('Nat.add_succ'),R('Nat.mul_succ'),R('Nat.mul_succ'),R('ih'),R('Nat.add_assoc'),F],'对 c 归纳；乘法的下一步会变成加法，再用结合律整理。');
  insert('n18','n18succ','多一列的花田','(a b : Nat) : succ a * b = a * b + b',[I('b'),R('Nat.mul_zero'),R('Nat.mul_zero'),R('Nat.add_zero'),F,R('Nat.mul_succ'),R('Nat.mul_succ'),R('ih'),R('Nat.add_succ'),R('Nat.add_succ'),R('Nat.add_assoc'),R('Nat.add_comm k a'),R('Nat.add_assoc'),F],['succ_mul']);
  set('n19',[I('b'),R('Nat.mul_zero'),R('Nat.zero_mul'),F,R('Nat.mul_succ'),R('Nat.succ_mul'),R('ih'),F],'把列数归纳展开，再用多一列定理。完成后才获得乘法交换律。');level('n19').discoveries=['exponentiation'];
  set('n20',[R('pow_zero'),F]);set('n21',[R('Garden.add_one_eq_succ'),R('Garden.pow_succ'),F]);
  insert('n21','n21square','平方真正展开了','(a : Nat) : a ^ 2 = a * a',[R('Garden.two_eq_succ_one'),R('Garden.pow_succ'),R('Garden.one_eq_succ_zero'),R('Garden.pow_succ'),R('pow_zero'),R('Nat.mul_comm 1 a'),R('Nat.mul_one'),F],['pow_two']);
  insert('n22','n22distribute','另一侧的分配律','(a b c : Nat) : (a + b) * c = a * c + b * c',[R('Nat.mul_comm (a+b) c'),R('Nat.mul_add'),R('Nat.mul_comm c a'),R('Nat.mul_comm c b'),F],['add_mul']);
  set('m01',[R('h1'),R('h1'),R('h2'),R('h2'),R('h3'),R('h3'),F]);
  level('m01').lesson='把 a 一路替换成 d。默认每次只改第一处；也可以指定多处或重复全部。';
  level('l16').skills.push('norm_num');set('l16',['norm_num']);set('l17',['norm_num [Function.comp_def]']);
  const a5=level('a05');a5.solution.splice(a5.solution.indexOf('rewrite [he]'),0,'change |x+1-(a+1)| < ε');
  const a22=level('a22');a22.solution.splice(a22.solution.indexOf('rewrite [he]'),0,'rewrite [he]');
  const advanced=advancedRevision({level,card,insert,set,addCard});
  // Every theorem has a proof owner. No theorem is equipment granted on entry.
  for(const c of cards.filter(c=>c.kind==='theorem')){
    const owner=level(advanced.owners[c.id])||levels.find(l=>l.reward.includes(c.id))||levels.find(l=>l.skills.includes(c.id));
    for(const l of levels)l.skills=l.skills.filter(id=>id!==c.id);
    if(owner){if(!owner.reward.includes(c.id))owner.reward.push(c.id);c.proofLevel=owner.id;owner.reproveV4=true;}
  }
  // Record explicit rule dependencies for all natural-number buttons.
  const ruleCard={'Garden.one_eq_succ_zero':'one_eq_succ_zero','Garden.two_eq_succ_one':'two_eq_succ_one','Garden.three_eq_succ_two':'three_eq_succ_two','Garden.four_eq_succ_three':'four_eq_succ_three','Garden.add_one_eq_succ':'add_one_eq_succ','Nat.add_zero':'add_zero','Nat.add_succ':'add_succ','Nat.zero_add':'zero_add','Nat.add_assoc':'add_assoc','Nat.succ_add':'succ_add','Nat.add_comm':'add_comm','Nat.mul_zero':'mul_zero','Nat.mul_succ':'mul_succ','Nat.zero_mul':'zero_mul','Nat.mul_one':'mul_one','Nat.mul_add':'distribute','Nat.succ_mul':'succ_mul','Nat.mul_comm':'mul_comm','Nat.add_mul':'add_mul','pow_zero':'pow','Garden.pow_succ':'pow','pow_two':'pow_two'};
  const strict=code=>code.replace(/^rewrite /,'garden_strict_rw ').replace(/^rfl$/,'garden_strict_rfl');
  for(const a of commonActions)a.code=strict(a.code);
  for(const l of levels){
    const convert=code=>l.chapter==='n'?strict(code).replace(/^apply /,'garden_nat_apply '):strict(code);
    l.solution=l.solution.map(convert);l.statement=l.statement.replaceAll('Nat.succ','succ');l.lesson=l.lesson.replaceAll('Nat.succ','succ');
    l.actions.forEach(a=>{a.code=convert(a.code);if(l.chapter==='n'&&a.skill==='rw'){const term=/\[←?\s*([^\s\]]+)/.exec(a.code)?.[1];if(ruleCard[term])a.uses=[ruleCard[term]];}});
    for(const code of new Set(l.solution))if(!l.actions.some(a=>a.code===code)&&!commonActions.some(a=>a.code===code)){
      let skill=code.startsWith('garden_strict_rw')?'rw':code.startsWith('garden_nat_apply')?'apply':code.split(/[ \n]/)[0];if(skill==='let')skill='have';if(skill==='simpa')skill='simp';
      const term=/\[←?\s*([^\s\]]+)/.exec(code)?.[1];
      l.actions.push({id:`${l.id}-v4-${l.actions.length}`,skill,code,label:skill==='rw'?`改写 ${term?.split('.').at(-1)}`:skill==='induction'?'选择自然数，开始归纳':code,uses:ruleCard[term]?[ruleCard[term]]:[]});
    }
    l.miniBoss=!l.boss&&(l.solution.length>=6||l.solution.some(s=>s.startsWith('induction')));
    l.hints=[l.lesson];
  }
  labelActions(levels);
  for(const ch of ['n','l','a','t','m'])levels.filter(l=>l.chapter===ch).forEach((l,i)=>l.number=i+1);
}
