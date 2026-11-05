// Teaching metadata is separate from the Lean statements. Lean remains the proof checker.
export function prepareLessons(levels, cards) {
  const level = id => levels.find(l => l.id === id);
  const card = id => cards.find(c => c.id === id);
  const define = (id, name, description, example, at, icon='book') => {
    cards.push({id,name,description,example,icon,kind:'definition'});
    level(at).skills.unshift(id);
  };
  card('rw').description='先在定理仓库选择已解锁的等式，再选择正向或反向、改写目标或某条假设（at）。本游戏只做改写，等式两边相同后还要手动点击 rfl。';
  card('rw').example='rewrite [h]\nrewrite [← h] at h₂\n-- 游戏的 rw 按钮使用 rewrite，不自动执行 rfl';
  card('nat_zero').kind='definition';
  card('nat_zero').name='后继 succ';
  card('nat_zero').example='Nat.succ 0 → 1\nNat.succ 1 → 2\nNat.succ n：n 的下一个自然数';
  cards.push({id:'one_eq_succ_zero',name:'一就是零的后继',description:'1 = Nat.succ 0。先用这条等式把数字 1 换成后继表达式，再用 rfl 确认两边相同。',example:'Garden.one_eq_succ_zero : (1 : Nat) = Nat.succ 0',icon:'seed',kind:'theorem'});
  define('addition','加法的递归定义','从右边的数出发：加零保持原值；加一个后继，就让结果也取一次后继。下面两张定理卡分别描述这两条规则。','n + 0 = n\nn + Nat.succ m = Nat.succ (n + m)','n04','vine');
  level('n03').skills=['nat_zero','one_eq_succ_zero'];
  level('n04').skills=['addition','add_zero','add_succ'];
  level('n05').skills=[];
  for (const [id, term, required, lesson] of [
    ['n03','Garden.one_eq_succ_zero','one_eq_succ_zero','succ 是后继。本关先在 rw 仓库选择 one_eq_succ_zero，把目标中的 1 改写为 succ 0，再手动用 rfl 收尾。'],
    ['n04','Nat.add_zero','add_zero','加法有零和后继两条递归规则。先选 rw → add_zero → 当前目标，观察 n+0 变成 n，再点 rfl。'],
    ['n05','Nat.add_succ','add_succ','用上一关认识的 add_succ 展开 n+succ m。改写后两边都是 succ(n+m)，最后手动点 rfl。']
  ]) {
    Object.assign(level(id),{lesson,requiredRewrites:[term],actions:[{id:`${id}-0`,skill:'rw',label:`用 ${required} 改写`,code:`rewrite [${term}]`,uses:[required]}],solution:[`rewrite [${term}]`,'rfl'],hints:[lesson,'先完成本关要求的定理改写，再点击 rfl。']});
  }
  level('n02').lesson='h 是一条已知等式。点击 rw，在仓库选 h、正向、当前目标。把 a 换成 b 后，目标 b=b 还留在这里；再点击 rfl 才算完成。';
  level('n06').lesson='先用 h 替换 a，再用 add_zero 消去 +0。每一步改写后都观察目标，最后手动点 rfl。';
  level('n06').solution=['rw [h]','rw [Nat.add_zero]','rfl'];
  define('multiplication','乘法的递归定义','乘法是重复加法。零次得到零；多重复一次，就多加一个 n。','n * 0 = 0\nn * Nat.succ m = n*m + n','n14','tree');
  define('exponentiation','乘方的递归定义','乘方是重复乘法。零次的乘积约定为 1；增加一次，就再乘底数。','a^0 = 1\na^(n+1) = a^n*a','n20','crystal');
  define('implication','命题与蕴含','Prop 是命题的类型。P → Q 表示：接受 P 的证据后，可以给出 Q 的证据。','P → Q','l01');
  define('forall','全称量词 ∀','对任意对象都成立。用 intro 取一个任意对象，不是只检查几个例子。','∀ n : Nat, n = n','l02');
  define('and','合取 ∧','两个命题都成立。目标里的合取要分别证明，假设里的合取可以拆成两份证据。','P ∧ Q','l03');
  define('or','析取 ∨','至少一个命题成立。证明目标可选一侧；拆开假设则必须处理两种可能。','P ∨ Q','l05');
  define('not','否定 ¬','¬P 是 P → False。假设 P 后推出矛盾，就是证明 ¬P。','¬ P := P → False','l08');
  define('exists','存在量词 ∃','提供一个具体见证，再证明它满足性质。拆包时会同时得到见证和性质。','∃ n : Nat, n = 3','l10');
  define('iff','等价 ↔','两个方向的蕴含都成立：从 P 到 Q，也能从 Q 到 P。','P ↔ Q','l15');
  define('function','映射与函数','fun x => … 描述输入 x 怎样得到输出。输入和输出各有类型。','(fun x : Nat => x+1) 2 = 3','l16');
  define('composition','函数复合','f ∘ g 先做 g，再做 f。按从右到左的顺序把输出送入下一个映射。','(f ∘ g) x = f (g x)','l17');
  define('injective','单射','不同输入有不同输出；证明时常用等价形式：输出相同则输入相同。','Function.Injective f := ∀ a b, f a = f b → a = b','l18');
  define('surjective','满射','每个输出位置都有原像。任取 y，给出 x 并证明 f x = y。','Function.Surjective f := ∀ y, ∃ x, f x = y','l19');
  define('epsilon_delta','ε–δ 极限定义','任给正精度 ε，都能选择正距离 δ，使输入与 a 的距离在 0 和 δ 之间时，输出与 L 的距离小于 ε。','∀ ε > 0, ∃ δ > 0, ∀ x,\n  0 < |x-a| → |x-a| < δ → |f x-L| < ε','a03','water');
  define('derivative','导数与变化率','HasDerivAt f d x 表示函数 f 在 x 处的导数为 d，也包含在该点可导的信息。','HasDerivAt f d x','a07','water');
  define('continuity','连续性','ContinuousAt f x 表示输入趋近 x 时，输出趋近 f x。可导会带来连续。','ContinuousAt f x','a11','water');
  define('definite_integral','定积分','∫ x in a..b, f x 表示区间上带方向的累积；交换上下限会改变符号。','∫ x : ℝ in a..b, f x','a12','water');
  define('intervals','开区间与闭区间','Icc a b 包含两端，Ioo a b 不包含端点。中值定理要分别检查闭区间连续和开区间可导。','Set.Icc a b = {x | a ≤ x ∧ x ≤ b}\nSet.Ioo a b = {x | a < x ∧ x < b}','a15');
  define('integer','整数 ℤ','整数包含零、正数和负数。整数减法允许负结果，自然数减法则在零处截断。','(-3 : ℤ) + 3 = 0','t01');
  define('remainder','余数运算 %','用模数分组后的余数；这里先使用正模数 5。','17 = 3*5+2\n(17 : ℤ) % 5 = 2','t07');
  for(const id of ['dvd','mod','gcd'])card(id).kind='definition';
  cards.push({id:'real_identities',name:'实数的零与自身',kind:'theorem',icon:'leaf',description:'减去自身得到零；减去零保持原值；零除以任意实数仍为零。这些规则也可以在已知命题中改写。',example:'sub_self : x - x = 0\nsub_zero : x - 0 = x\nzero_div : 0 / x = 0'});
  level('a03').skills.push('real_identities');
  // The game's rw card always uses Lean's non-closing rewrite primitive.
  for(const l of levels) {
    for(const a of l.actions) if(a.skill==='rw') a.code=a.code.replace(/^rw\b/,'rewrite');
    l.solution=l.solution.map(s=>s.replace(/^rw\b/,'rewrite'));
    if(l.solution.at(-1)?.startsWith('rewrite ')&&!/\] at /.test(l.solution.at(-1)))l.solution.push('rfl');
    const expand=code=>{const m=/^rewrite \[([^\]]+)\](.*)$/.exec(code);return m?m[1].split(',').map(term=>`rewrite [${term.trim()}]${m[2]}`):[code];};
    l.solution=l.solution.flatMap(expand);
    l.actions=l.actions.flatMap(a=>a.skill==='rw'?expand(a.code).map((code,i,all)=>({...a,code,id:all.length>1?`${a.id}-${i}`:a.id})):a);
  }
}
