export const chapters = [
  { id: 'n', number: '01', name: '自然数原野', subtitle: '从一颗种子，到无限可能', topic: '皮亚诺 · 归纳 · 加减乘方', color: '#698d39', icon: 'sprout', boss: '完全平方守卫', requires: null },
  { id: 'l', number: '02', name: '逻辑秘林', subtitle: '让每一个推理，都有迹可循', topic: '量词 · 与或非 · 映射 · 代数', color: '#8064a3', icon: 'tree', boss: '高中代数双子门', requires: 'n' },
  { id: 'a', number: '03', name: '分析浮岛', subtitle: '在无限接近的地方，找到答案', topic: 'ε–δ · 导数 · 积分 · 中值定理', color: '#428eab', icon: 'water', boss: '双中值定理高塔', requires: 'l' },
  { id: 't', number: '04', name: '数论遗迹', subtitle: '解开整数深处的古老密码', topic: '整除 · 同余 · 裴蜀 · 中国剩余定理', color: '#b18336', icon: 'temple', boss: '中国剩余定理', requires: 'l' }
];

const C = (id, name, description, example, icon = 'leaf', kind = 'tactic') => ({ id, name, description, example, icon, kind });
export const cards = [
  C('rfl','自反之种','当等号两边按定义算出来一样，rfl 就能完成证明。它也能计算具体的自然数。','example : (0 : Nat) = 0 := by rfl','seed'),
  C('rw','改写藤蔓','用已知等式替换目标中的表达式。先选等式，再选方向；← 表示从右往左。rw 最后会尝试自反收尾。','rw [h]  /  rw [← h]','vine'),
  C('induction','归纳树','自然数由 0 和后继构成。证明 0 的情形，再在“k 成立”的假设 ih 下证明 k+1。两个分支都需要完成。','induction n with | zero | succ k ih','tree'),
  C('exact','证据花','把类型与当前目标完全吻合的证据交给 Lean。证据可以是一个假设，也可以是已学过的定理。','exact h','flower'),
  C('apply','倒推桥','用“如果 P，那么 Q”的定理证明 Q，会把目标变成 P。应用定理后，请查看还需要哪些条件。','apply h','bridge'),
  C('assumption','回声叶','从当前分支的假设中找一条与目标相同的证据。它不会凭空增加假设。','assumption','leaf'),
  C('ac_rfl','整理松果','只使用加法或乘法的结合律、交换律重新排列项。它不会展开乘法、平方，也不会任意证明等式。','ac_rfl','acorn'),
  C('intro','迎客芽','证明 P → Q 时，把 P 加入假设；证明 ∀ x 时，拿一个任意的 x。按钮会自动起名字。','intro x','sprout'),
  C('constructor','双生花','证明 A ∧ B 时分成两个目标，两个都要完成；证明 A ↔ B 时分成两个方向。','constructor','flower'),
  C('rcases','拆包蘑菇','拆开假设中的 ∧ 得到两条证据，拆开 ∃ 得到见证及性质，拆开 ∨ 得到两个必须分别处理的分支。','rcases h with ⟨ha, hb⟩','mushroom'),
  C('left','左岔路','目标为 A ∨ B 时，选择证明 A。或命题只要一侧成立就足够。','left','left'),
  C('right','右岔路','目标为 A ∨ B 时，选择证明 B。注意这与拆开假设中的“或”不同。','right','right'),
  C('use','见证果','证明 ∃ x, P x 时，给出一个具体的 x，然后证明 P x。点击提供的候选值即可。','use 3','fruit'),
  C('specialize','点名铃','假设 h : ∀ x, P x 可以用在某个具体 x 上。specialize 把 h 变成这一特例。','specialize h 0','bell'),
  C('change','定义透镜','把目标展开为定义上相同的表达式，例如单射、满射、整除。不会把目标改成不等价的命题。','change ∀ x y, f x = f y → x = y','lens'),
  C('ring','代数齿轮','整理交换环中的多项式等式。学会基本代数后再解锁；不负责证明不等式。','ring','gear'),
  C('nlinarith','不等式盾','组合已知的多项式等式、不等式。必要时先提供平方非负等关键事实。','nlinarith [sq_nonneg (x - y)]','shield'),
  C('have','便笺叶','先把一个中间结论加入假设，再用它完成主目标。这里只提供课程中的明确结论。','have h := theorem_name ...','note'),
  C('norm_num','计算晶石','核对具体数字的算术、分数与不等式。它不替代含任意变量的证明。','norm_num','crystal'),
  C('simp','修枝剪','使用明确列出的定义或等式做化简。本游戏中的卡牌使用 simp only 控制范围。','simp only [sub_self, abs_zero]','scissors'),
  C('linarith','线性天平','组合线性等式和不等式，例如从 a < b 推出 b-a > 0。','linarith','scale'),
  C('convert','等价嫁接','借用一个结论相近的定理，并把表达式差异留下来作为新的目标证明。','convert h using 1','vine'),
  C('omega','整数罗盘','处理自然数与整数的线性运算、比较和部分整除约束。','omega','compass'),
  C('nat_zero','零与后继','自然数 Nat 由 0 和 Nat.succ 构成。Nat.succ n 表示 n 的下一个数。','Nat.succ 0 = 1','seed','theorem'),
  C('add_zero','加法的起点','加法按第二个参数递归：n + 0 = n。','Nat.add_zero','leaf','theorem'),
  C('add_succ','加法递归','n + succ m = succ (n+m)。这是从后继构造加法的一步。','Nat.add_succ','vine','theorem'),
  C('zero_add','左零定理','0+n=n 通过对 n 的归纳得到；它与右零的定义规则有所不同。','Nat.zero_add','flower','theorem'),
  C('succ_ne','零不是后继','任何自然数的后继都不等于 0。','Nat.succ_ne_zero','shield','theorem'),
  C('succ_inj','后继的单射性','如果 succ a = succ b，那么 a=b。','Nat.succ.inj','lens','theorem'),
  C('add_assoc','加法结合律','(a+b)+c = a+(b+c)。可以改变括号。','Nat.add_assoc','vine','theorem'),
  C('add_comm','加法交换律','a+b=b+a。可以交换加数。','Nat.add_comm','leaf','theorem'),
  C('mul_zero','乘法的起点','n*0=0。乘法表示重复加法。','Nat.mul_zero','seed','theorem'),
  C('mul_succ','乘法递归','n*(m+1)=n*m+n。','Nat.mul_succ','vine','theorem'),
  C('zero_mul','左零乘法','0*n=0；用归纳从乘法递归规则证明。','Nat.zero_mul','flower','theorem'),
  C('distribute','乘法分配律','a*(b+c)=a*b+a*c；(a+b)*c=a*c+b*c。','Nat.mul_add / Nat.add_mul','tree','theorem'),
  C('mul_comm','乘法交换律','a*b=b*a。结合律和交换律可用 ac_rfl 整理。','Nat.mul_comm','acorn','theorem'),
  C('pow','乘方递归','a^0=1；a^(n+1)=a^n*a。平方是 a*a。','pow_zero / pow_succ / pow_two','crystal','theorem'),
  C('square_nonneg','平方非负','对所有实数 x，0 ≤ x²。用于代数不等式。','sq_nonneg x','shield','theorem'),
  C('abs','绝对值','|x|<ε 等价于 -ε<x 且 x<ε；|0|=0。','abs_lt / abs_zero','lens','theorem'),
  C('deriv_id','恒等映射求导','f(x)=x 在任何点的导数等于 1。HasDerivAt 包含函数、导数值和求导点。','hasDerivAt_id x','water','theorem'),
  C('deriv_pow','幂函数求导','x^n 的导数为 n*x^(n-1)。指数 n 是自然数。','hasDerivAt_pow n x','water','theorem'),
  C('deriv_const','常数求导','常数函数的导数为 0。','hasDerivAt_const x c','water','theorem'),
  C('deriv_add','导数的加法法则','已知两个函数的导数，可把它们相加或相减。','HasDerivAt.add / HasDerivAt.sub','water','theorem'),
  C('integral','基本定积分','从常数、恒等函数的定积分开始；积分是在区间内累积。','intervalIntegral.integral_const / integral_id','water','theorem'),
  C('rolle','罗尔定理','闭区间连续、开区间可导且端点值相等，则内部存在导数为零的点。','exists_deriv_eq_zero','temple','theorem'),
  C('mvt','拉格朗日中值定理','闭区间连续、开区间可导，则内部某点的导数等于割线斜率。区间和连续性条件不能省略。','exists_deriv_eq_slope','temple','theorem'),
  C('dvd','整除定义','m∣n 表示存在整数 k，使 n=m*k。负数见证也可以。','dvd_def','fruit','theorem'),
  C('mod','同余定义','x 与 a 模 m 同余，等价于 m 整除 x-a。','Garden.Congruent m x a','compass','theorem'),
  C('gcd','最大公因数','Int.gcd 的结果是自然数，嵌入整数后可参加裴蜀等式。','Int.gcd','acorn','theorem'),
  C('bezout','裴蜀等式','扩展欧几里得算法给出 u、v，使 m*u+n*v=gcd(m,n)。互素时右边等于 1。','Int.gcd_eq_gcd_ab','bridge','theorem'),
  C('crt','中国剩余定理','互素模数 m、n 下，可构造同时具有指定两个余数的整数；所有解模 m*n 同余。','x = a*(n*v) + b*(m*u)','temple','theorem')
];

export const commonActions = [
  { id:'rfl', skill:'rfl', label:'两边相同，完成证明', code:'rfl', uses:[] },
  { id:'assumption', skill:'assumption', label:'使用已有的同型假设', code:'assumption', uses:[] },
  { id:'constructor', skill:'constructor', label:'把目标拆成两个任务', code:'constructor', uses:[] },
  { id:'left', skill:'left', label:'证明左边', code:'left', uses:[] },
  { id:'right', skill:'right', label:'证明右边', code:'right', uses:[] },
  { id:'ring', skill:'ring', label:'整理多项式等式', code:'ring', uses:[] },
  { id:'ac_rfl', skill:'ac_rfl', label:'用结合律、交换律整理', code:'ac_rfl', uses:[] },
  { id:'norm_num', skill:'norm_num', label:'核对数字运算', code:'norm_num', uses:[] },
  { id:'linarith', skill:'linarith', label:'组合线性条件', code:'linarith', uses:[] },
  { id:'omega', skill:'omega', label:'推导整数关系', code:'omega', uses:[] }
];
export const levels = [];
const counts = {};
export const act = (skill,label,code,...uses) => ({skill,label,code,uses});
const rw = (label,code,...uses) => act('rw',label,`rw [${code}]`,...uses);
const intro = (name,label=`引入 ${name}`) => act('intro',label,`intro ${name}`);
const exact = (label,code,...uses) => act('exact',label,`exact ${code}`,...uses);
const use = (term,label=`选择见证 ${term}`) => act('use',label,`use ${term}`);
const ind = name => act('induction',`对 ${name} 做归纳`,`induction ${name} with\n| zero\n| succ k ih`);
const split = (h,names,label) => act('rcases',label,`rcases ${h} with ${names}`);
function add(ch,title,statement,goal,lesson,skills,actions,solution,options={}) {
  const number = counts[ch] = (counts[ch] || 0)+1;
  const id = `${ch}${String(number).padStart(2,'0')}`;
  levels.push({id,chapter:ch,number,title,statement,goal,lesson,skills,actions:actions.map((a,i)=>({...a,id:`${id}-${i}`})),solution,hints:options.hints || [lesson,'观察当前目标最外层的符号，再选择对应技能。展开后的每一个分支都需要证明。'],...options});
}

// Chapter 1: concrete computations, Peano recursion, induction, and algebra.
add('n','第一颗证明之种',': (0 : Nat) = 0','0 = 0','欢迎来到证明花园！目标栏是你要证明的事。0 和 0 完全相同，点击下方唯一的 rfl 卡，就能种下第一颗种子。',['rfl'],[],['rfl'],{hints:['点击「自反之种 rfl」。等号两边相同就可以结束。']});
add('n','让等式长出藤蔓','(a b : Nat) (h : a = b) : a = b','已知 a = b，证明 a = b','h 是背包里的一条已知等式。点击 rw，再选 h 的正向改写，把目标里的 a 换成 b。',['rw'],[rw('用 h：a → b','h'),rw('用 h：b → a（反向）','← h')],['rw [h]']);
add('n','数的下一步',': Nat.succ 0 = 1','succ 0 = 1','Nat 是自然数；succ 表示“下一个”。1 就是 0 的后继。这是皮亚诺自然数的起点。',['nat_zero'],[],['rfl']);
add('n','加上零','(n : Nat) : n + 0 = n','n + 0 = n','加法按右边的数递归定义。右边是 0 时，直接返回左边的 n，所以 rfl 就能证明。',['add_zero'],[],['rfl']);
add('n','再加一个','(n m : Nat) : n + Nat.succ m = Nat.succ (n + m)','n + succ m = succ (n + m)','把右侧加数向前走一步，和也向前走一步。这是加法的递归规则。',['add_succ'],[],['rfl']);
add('n','把规则用起来','(a b : Nat) (h : a = b + 1) : a + 0 = b + 1','已知 a = b + 1，证明 a + 0 = b + 1','先用 h 替换 a。改写后，+0 可以按定义消去，rw 会尝试自动收尾。',[],[rw('把 a 改为 b+1','h'),rw('使用加法右零规则','Nat.add_zero','add_zero')],['rw [h]']);
add('n','归纳树的两根枝','(n : Nat) : 0 + n = n','对任意 n，0 + n = n','这里未知数在加法右边，不能直接计算。先对 n 归纳：用 rfl 完成零分支，再用 add_succ 展开，最后用归纳假设 ih。',['induction'],[ind('n'),rw('展开后继处的加法','Nat.add_succ','add_succ'),rw('使用归纳假设 ih','ih')],['induction n with\n| zero\n| succ k ih','rfl','rw [Nat.add_succ]','rw [ih]'],{reward:['zero_add']});
add('n','零不会是后继','(n : Nat) : Nat.succ n ≠ 0','succ n ≠ 0','后继与零不同是自然数构造的基本性质。exact 可以把这条现成的基础证据交给 Lean。',['exact','succ_ne'],[exact('后继不等于零','Nat.succ_ne_zero n','succ_ne')],['exact Nat.succ_ne_zero n']);
add('n','后继可以消去','(a b : Nat) (h : Nat.succ a = Nat.succ b) : a = b','已知 succ a = succ b，证明 a = b','后继构造是单射。apply 倒着用这条规则，把目标 a=b 变成 succ a=succ b，再用已有假设。',['apply','assumption','succ_inj'],[act('apply','使用后继单射性','apply Nat.succ.inj','succ_inj')],['apply Nat.succ.inj','assumption']);
add('n','左零回来帮忙','(a : Nat) : 0 + (0 + a) = a','0 + (0 + a) = a','上一关证明出的左零规则已经进入图鉴。连续使用两次，剥开外层和内层的 0+。',[],[rw('消去一层 0+','Nat.zero_add','zero_add')],['rw [Nat.zero_add]','rw [Nat.zero_add]']);
add('n','括号的秘密','(a b c : Nat) : (a + b) + c = a + (b + c)','(a+b)+c = a+(b+c)','对最右侧的 c 做归纳。零分支按定义成立；后继分支先在外层、内层分别展开 add_succ，再用 ih。',[],[ind('c'),rw('展开后继加法','Nat.add_succ','add_succ'),rw('改写归纳假设','ih')],['induction c with\n| zero\n| succ k ih','rfl','rw [Nat.add_succ]','rw [Nat.add_succ]','rw [Nat.add_succ]','rw [ih]'],{reward:['add_assoc']});
add('n','交换两颗果实','(a b : Nat) : a + b = b + a','a+b = b+a','加法交换律可以由递归和归纳证明。这里学习把这条已证明的库定理作为工具使用。',['add_comm'],[rw('交换 a 与 b','Nat.add_comm a b','add_comm')],['rw [Nat.add_comm a b]']);
add('n','穿过三重藤蔓','(a b c : Nat) : (a + b) + c = a + (c + b)','(a+b)+c = a+(c+b)','先移动括号，再交换括号内的 b、c。改写可以精准选中带参数的子表达式。',[],[rw('把括号向右移','Nat.add_assoc','add_assoc'),rw('交换 b、c','Nat.add_comm b c','add_comm')],['rw [Nat.add_assoc]','rw [Nat.add_comm b c]']);
add('n','乘法从零开始','(n : Nat) : n * 0 = 0','n × 0 = 0','乘法是重复加法。重复零次，就得到零。',['mul_zero'],[],['rfl']);
add('n','再种一排','(n m : Nat) : n * Nat.succ m = n * m + n','n × succ m = n × m + n','乘法也按右边的自然数递归。多乘一次，就再加一个 n。',['mul_succ'],[],['rfl']);
add('n','零排果树','(n : Nat) : 0 * n = 0','0 × n = 0','再次使用归纳。零分支用 rfl；后继分支展开乘法，再用 ih。',[],[ind('n'),rw('展开乘法后继','Nat.mul_succ','mul_succ'),rw('使用 ih','ih')],['induction n with\n| zero\n| succ k ih','rfl','rw [Nat.mul_succ]','rw [ih]'],{reward:['zero_mul']});
add('n','乘一个一','(n : Nat) : n * 1 = n','n × 1 = n','1 是 0 的后继。先展开乘法递归，再用左零定理消去 0+n。',[],[rw('展开一次乘法','Nat.mul_succ','mul_succ'),rw('消去左边的零','Nat.zero_add','zero_add'),rw('消去乘零项','Nat.mul_zero','mul_zero')],['rw [Nat.mul_succ]','rw [Nat.mul_zero]','rw [Nat.zero_add]']);
add('n','把花坛一分为二','(a b c : Nat) : a * (b + c) = a * b + a * c','a×(b+c) = a×b + a×c','分配律连接乘法与加法。学习使用这条定理；后面会把它与乘方组合。',['distribute'],[rw('向加法分配乘法','Nat.mul_add','distribute')],['rw [Nat.mul_add]']);
add('n','排列花坛','(a b : Nat) : a * b = b * a','a×b = b×a','交换行数和列数，花的总数不变。使用乘法交换律完成证明。',['mul_comm'],[rw('交换两个因子','Nat.mul_comm a b','mul_comm')],['rw [Nat.mul_comm a b]']);
add('n','乘方发芽','(a : Nat) : a ^ 0 = 1','a⁰ = 1','乘方是重复乘法。递归起点 a^0=1；这也适用于 a=0，是自然数乘方的约定。',['pow'],[],['rfl']);
add('n','乘方的阶梯','(a n : Nat) : a ^ (n + 1) = a ^ n * a','aⁿ⁺¹ = aⁿ × a','每往上一阶，再乘一个 a。用乘方递归规则展开。',[],[rw('展开 pow_succ','pow_succ','pow')],['rw [pow_succ]']);
add('n','整理一篮果实','(a b c : Nat) : (a + b) + c = c + (b + a)','(a+b)+c = c+(b+a)','已经学过结合律和交换律，现在解锁只负责整理顺序的 ac_rfl。它不能凭空展开平方。',['ac_rfl'],[],['ac_rfl']);
add('n','平方门前的练习','(a b : Nat) : (a + b) * a = a * a + b * a','(a+b)×a = a²+b×a','这是分配律的另一个方向：拆开左侧的和。注意 mul_add 和 add_mul 的名字顺序。',[],[rw('对左侧的和做分配','Nat.add_mul','distribute')],['rw [Nat.add_mul]']);
add('n','BOSS · 完全平方守卫','(a b : Nat) : (a + b)^2 = a*a + a*b + b*a + b*b','(a+b)² = a²+ab+ba+b²','组合乘方、分配律和结合律。先展开平方，再拆开两个乘法中的加法，最后整理顺序。这里的 ab+ba 就是初中公式里的 2ab。',[],[rw('把平方展开成乘法','pow_two','pow'),rw('展开左侧的和','Nat.add_mul','distribute'),rw('展开右侧的和','Nat.mul_add','distribute')],['rw [pow_two]','rw [Nat.add_mul]','rw [Nat.mul_add]','rw [Nat.mul_add]','ac_rfl'],{boss:true});

// Chapter 2: all introduction/elimination forms, functions, high-school algebra.
add('l','假如有一颗种子','(P : Prop) : P → P','P → P','Prop 表示命题。“如果 P，那么 P”：先用 intro 接受前提 h，再使用它。',['intro'],[intro('h','接受前提 P，命名为 h')],['intro h','assumption']);
add('l','所有种子的名字',': ∀ n : Nat, n = n','∀ n : ℕ，n = n','∀ 表示“对任意”。你不能只检查几个数；intro n 取的是任意自然数。',[],[intro('n','取任意自然数 n')],['intro n','rfl']);
add('l','两朵花都要开放','(P Q : Prop) (hp : P) (hq : Q) : P ∧ Q','已知 P、Q，证明 P ∧ Q','目标中的 ∧ 要同时证明两边。constructor 分出两个目标，逐个用 assumption 完成。',['constructor'],[],['constructor','assumption','assumption']);
add('l','打开双层种袋','(P Q : Prop) (h : P ∧ Q) : Q ∧ P','已知 P ∧ Q，证明 Q ∧ P','假设中的 ∧ 是一袋已有证据。先 rcases 拆成 hp、hq，再构造目标中的两部分。',['rcases'],[split('h','⟨hp, hq⟩','把 h 拆成 hp : P 与 hq : Q')],['rcases h with ⟨hp, hq⟩','constructor','assumption','assumption']);
add('l','左边也能到达','(P Q : Prop) (hp : P) : P ∨ Q','已知 P，证明 P ∨ Q','目标中的 ∨ 只需证明一边。选择 left 后，目标就成为 P。',['left'],[],['left','assumption']);
add('l','右边的花径','(P Q : Prop) (hq : Q) : P ∨ Q','已知 Q，证明 P ∨ Q','这次背包里只有 Q。用 right 选择右边。选错也没关系，可以撤销。',['right'],[],['right','assumption']);
add('l','岔路都要检查','(P Q : Prop) (h : P ∨ Q) : Q ∨ P','已知 P ∨ Q，证明 Q ∨ P','假设里的“或”不能任意挑一边。rcases 分出两种可能：第一支用 right，第二支用 left。',[],[split('h','hp | hq','按 P 成立 / Q 成立分情况')],['rcases h with hp | hq','right','assumption','left','assumption']);
add('l','否定的真正含义','(P : Prop) (hp : P) : ¬¬P','已知 P，证明 ¬¬P','¬P 意思是 P → False。证明 ¬¬P，先假设 hn : ¬P，再 apply hn 把矛盾目标变成 P。',[],[intro('hn','假设 hn : ¬P'),act('apply','用 hn 推导矛盾','apply hn')],['intro hn','apply hn','assumption']);
add('l','矛盾之门','(P Q : Prop) (hn : ¬P) (hp : P) : Q','已知 ¬P 和 P，证明 Q','互相矛盾的前提可以推出任何命题。先构造 False 的证据，再用 False.elim。',[],[exact('用 hn hp 得到矛盾，排除它','False.elim (hn hp)')],['exact False.elim (hn hp)']);
add('l','至少有一颗果实',': ∃ n : Nat, n = 3','∃ n : ℕ，n = 3','∃ 表示“存在”。use 选择具体见证，然后证明它满足性质。这里见证可以选 3。',['use'],[use('3'),use('0')],['use 3']);
add('l','把存在打开','(P : Nat → Prop) (h : ∃ n, P n) : ∃ m, P m','已知 ∃ n, P n，证明 ∃ m, P m','拆开存在假设，得到见证 n 和证据 hn。给目标提供 n 后，交出 hn。',[],[split('h','⟨n, hn⟩','从 h 取出见证 n 与性质 hn'),use('n'),exact('使用见证的性质 hn','hn')],['rcases h with ⟨n, hn⟩','use n']);
add('l','给任意一个点名','(P : Nat → Prop) (h : ∀ n, P n) : P 0','已知 ∀ n, P n，证明 P 0','全称假设是一台可用于任何输入的机器。specialize h 0，把它用在零上。',['specialize'],[act('specialize','把全称假设用在 0 上','specialize h 0')],['specialize h 0','assumption']);
add('l','交换量词背后的证据','(P Q : Nat → Prop) (h : ∃ n, P n ∧ Q n) : ∃ n, Q n ∧ P n','∃ n, P n∧Q n → ∃ n, Q n∧P n','先拆存在，再拆合取。见证保持同一个 n；use 会尝试用手中的 hp、hq 自动完成剩下的性质。',[],[split('h','⟨n, hp, hq⟩','取出 n、hp、hq'),use('n')],['rcases h with ⟨n, hp, hq⟩','use n']);
add('l','不能同时成立','(P Q : Prop) (h : ¬(P ∨ Q)) : ¬P ∧ ¬Q','¬(P∨Q) → ¬P∧¬Q','这条德摩根律的方向不需要排中律。两个分支分别假设 P 或 Q，再构造被 h 否定的析取。',[],[intro('hp','假设 P'),intro('hq','假设 Q'),act('apply','用 h 把目标变成 P∨Q','apply h')],['constructor','intro hp','apply h','left','assumption','intro hq','apply h','right','assumption']);
add('l','双向花桥','(P Q : Prop) : (P ∧ Q) ↔ (Q ∧ P)','P∧Q ↔ Q∧P','↔ 包含两个方向。constructor 先拆方向；每个方向 intro h、拆包、再构造合取。',[],[intro('h','接受当前方向的前提'),split('h','⟨ha, hb⟩','拆开当前合取')],['constructor','intro h','rcases h with ⟨ha, hb⟩','constructor','assumption','assumption','intro h','rcases h with ⟨ha, hb⟩','constructor','assumption','assumption']);
add('l','映射小工坊',': (fun x : Nat => x + 1) 2 = 3','f(x)=x+1，f(2)=3','fun x => … 表示函数。把 2 送进映射，按定义计算即可。',[],[],['rfl']);
add('l','两个映射接起来',': ((fun x : Nat => x * 2) ∘ (fun x => x + 1)) 3 = 8','f(x)=2x，g(x)=x+1，(f∘g)(3)=8','∘ 是函数复合：先计算右边的 g，再计算左边的 f。',[],[],['rfl']);
add('l','每个输入各不相同',': Function.Injective (fun n : Nat => Nat.succ n)','后继映射是单射','单射意思是“输出相同，输入就相同”。先用 change 展开定义，再逐个引入两个输入和等式。',['change'],[act('change','展开单射定义','change ∀ a b : Nat, Nat.succ a = Nat.succ b → a = b'),intro('a'),intro('b'),intro('h'),exact('由后继相等得到输入相等','Nat.succ.inj h','succ_inj')],['change ∀ a b : Nat, Nat.succ a = Nat.succ b → a = b','intro a','intro b','intro h','exact Nat.succ.inj h']);
add('l','每个终点都可到达',': Function.Surjective (fun x : ℝ => x + 1)','实数映射 x ↦ x+1 是满射','满射要求每个 y 都有原像。取 x=y-1，并用代数整理验证。这里解锁 ring。',['ring'],[act('change','展开满射定义','change ∀ y : ℝ, ∃ x : ℝ, x + 1 = y'),intro('y','取任意输出 y'),use('y - 1','选择原像 y−1')],['change ∀ y : ℝ, ∃ x : ℝ, x + 1 = y','intro y','use y - 1','ring']);
add('l','平方差花阵','(a b : ℝ) : (a+b)*(a-b) = a^2-b^2','(a+b)(a−b)=a²−b²','ring 能核验交换环中的多项式恒等式。与前面的自然数不同，实数减法是环运算。',[],[],['ring']);
add('l','非负的守护','(x y : ℝ) : 2*x*y ≤ x^2 + y^2','2xy ≤ x²+y²','关键事实是 (x-y)²≥0。先把它放进背包，再让 nlinarith 整理。',['have','nlinarith','square_nonneg'],[act('have','加入 (x−y)²≥0','have hs := sq_nonneg (x-y)','square_nonneg'),act('nlinarith','组合非负平方与目标','nlinarith')],['have hs := sq_nonneg (x-y)','nlinarith']);
add('l','把恒等式用进假设','(x y : ℝ) (h : x+y=3) : (x+y)^2=9','已知 x+y=3，证明 (x+y)²=9','先 rw 改写和式，再用 norm_num 做具体数字计算。',['norm_num'],[rw('用 h 替换 x+y','h')],['rw [h]','norm_num']);
add('l','二次式的最低处','(x : ℝ) : -1 ≤ x^2 - 2*x','−1 ≤ x²−2x','配方得到 (x-1)²−1。把平方非负加入假设，再用不等式技能。',[],[act('have','加入 (x−1)²≥0','have hs := sq_nonneg (x-1)','square_nonneg'),act('nlinarith','利用平方非负','nlinarith')],['have hs := sq_nonneg (x-1)','nlinarith']);
add('l','BOSS · 高中代数双子门','(x y : ℝ) (h : x+y=2) : x*y ≤ 1 ∧ x^2+y^2 ≥ 2','若 x+y=2，则 xy≤1 且 x²+y²≥2','先加入 (x-y)²≥0，再拆开两个结论。每道门都需要结合 h 和非负平方。',[],[act('have','记录 (x−y)²≥0','have hs := sq_nonneg (x-y)','square_nonneg'),act('nlinarith','用和式与平方非负推导','nlinarith')],['have hs := sq_nonneg (x-y)','constructor','nlinarith','nlinarith'],{boss:true});

export { add, rw, intro, exact, use, split };
