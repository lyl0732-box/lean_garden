// Proof workshops precede applications; none grants its own conclusion as equipment.
export function advancedRevision({level,card,insert,set,addCard}){
  const R=t=>`garden_strict_rw [${t}]`;
  addCard('positivity','阳光判号','tactic','0 ≤ x ^ 2','判断平方、绝对值等表达式的正负。');
  insert('l20','l20square','平方为什么不会负','(x : ℝ) : 0 ≤ x ^ 2',['positivity'],['square_nonneg'],['positivity']);
  addCard('abs_value','距离的两种写法','definition','0 ≤ x 时 |x| = x；x ≤ 0 时 |x| = -x','绝对值就是离零的距离。');
  insert('a01','a01abs','亲手搭起距离的两面','(x ε : ℝ) : |x| < ε ↔ -ε < x ∧ x < ε',[
    'rcases le_total 0 x with hx | hx','simp only [abs_of_nonneg hx]','constructor','intro h','constructor','linarith','apply h','intro h','apply h.2',
    'simp only [abs_of_nonpos hx]','constructor','intro h','constructor','linarith','linarith','intro h','linarith [h.1]'
  ],['abs'],['abs_value','simp']).lesson='按 x 在零的左边还是右边分情况，展开距离定义，再拼出双向结论。';
  insert('a02','a02identities','把零的规则亲手证明','(x : ℝ) : x-x=0 ∧ x-0=x ∧ 0/x=0',['constructor','ring','constructor','ring','simp only [div_eq_mul_inv, zero_mul]'],['real_identities']).lesson='逐个证明三条零的规则，之后它们才能进入仓库。';
  set('a07',[R('hasDerivAt_iff_isLittleO_nhds_zero'),'have he : (fun h : ℝ => (x+h)-x-h*1) = fun _ => 0 := by funext h; ring','simp only [smul_eq_mul, he]','apply Asymptotics.isLittleO_zero'],'展开导数定义：实际变化减去预测变化，恒等于零，所以误差比步长更小。');
  set('a08',[R('hasDerivAt_iff_isLittleO_nhds_zero'),'simp only [smul_eq_mul, mul_zero, sub_self]','apply Asymptotics.isLittleO_zero'],'常数没有变化。把零变化代入导数定义，再验证误差为零。');
  set('a09',['have hi : HasDerivAt (fun y : ℝ => y) 1 x := hasDerivAt_id x','have hm := hi.mul hi','convert hm using 1','change (fun y : ℝ => y^2) = (fun y => y*y)','have hf : (fun y : ℝ => y^2) = (fun y => y*y) := by funext y; ring','apply hf','ring'],'把平方看成两个相同函数相乘，用乘法的误差分解，再核对系数。');
  insert('a09','a09sum','导数如何相加','(f g : ℝ → ℝ) (x df dg : ℝ) (hf : HasDerivAt f df x) (hg : HasDerivAt g dg x) : HasDerivAt (fun y => f y+g y) (df+dg) x',[
    'simp only [hasDerivAt_iff_isLittleO_nhds_zero] at hf hg ⊢','have he := hf.add hg','convert he using 1','have herr : (fun h => (f (x+h)+g (x+h))-(f x+g x)-h • (df+dg)) = (fun h => (f (x+h)-f x-h • df)+(g (x+h)-g x-h • dg)) := by funext h; simp only [smul_eq_mul]; ring','apply herr'
  ],['deriv_add']).lesson='两个很小的误差相加，仍然很小。展开定义，再把误差合并。';
  insert('a11','a11constant','矩形的积分规则','(a b c : ℝ) : (∫ _ : ℝ in a..b, c) = (b-a)*c',[
    'simp only [intervalIntegral.integral_const\', MeasureTheory.measureReal_def, Real.volume_Ioc, ENNReal.toReal_ofReal\', ← neg_sub b, max_zero_sub_eq_self, smul_eq_mul]'
  ],['integral'],['definite_integral']).lesson='把定积分展开为两段集合积分，区间的长度乘上高度，就是矩形的面积。';
  addCard('integral_power','幂函数面积','theorem','∫ x in a..b, x ^ n = (b ^ (n+1) - a ^ (n+1)) / (n+1)','从整数幂的积分规则，推导自然数幂的面积。');
  addCard('integral_identity','斜坡面积公式','theorem','∫ x in a..b, x = (b ^ 2 - a ^ 2) / 2','把幂函数面积公式里的指数换成 1。');
  insert('a12','a12power','自然数幂的面积规则','(a b : ℝ) (n : Nat) : (∫ x in a..b, x^n) = (b^(n+1)-a^(n+1))/(n+1)',[
    'have hi := @integral_zpow a b (n : ℤ) (Or.inl (Int.natCast_nonneg n))',
    'simpa only [← Int.natCast_succ, zpow_natCast, Int.cast_natCast, Nat.succ_eq_add_one] using hi'
  ],['integral_power']).lesson='自然数也可以看作整数。取出整数幂的积分结果，核对指数与类型。';
  insert('a12power','a12identity','从幂面积到斜坡','(a b : ℝ) : (∫ x : ℝ in a..b, x) = (b^2-a^2)/2',['have hi := @integral_pow a b 1','norm_num only [pow_one, Nat.reduceAdd, Nat.cast_one] at hi','apply hi'],['integral_identity']);
  set('a15',['rcases exists_isLocalExtr_Ioo hab hc he with ⟨c, hm, hext⟩','use c','constructor','apply hm','apply hext.deriv_eq_zero'],'两端同高，内部会出现极值；在这个极值点，导数为零。完成后才收下罗尔定理。');
  set('a16',[
    'have hs : (b-a) ≠ 0 := ne_of_gt (sub_pos.mpr hab)',
    'let s := (f b-f a)/(b-a)','let g := fun x => f x-s*x',
    'have hg : ContinuousOn g (Icc a b) := hc.sub (continuousOn_const.mul continuousOn_id)',
    'have he : g a=g b := by dsimp [g,s]; field_simp [hs]; ring',
    'rcases exists_deriv_eq_zero hab hg he with ⟨c, hm, hzero⟩',
    'have hder : HasDerivAt g (deriv f c-s) c := by\n  convert (hd.differentiableAt (Ioo_mem_nhds hm.1 hm.2)).hasDerivAt.sub ((hasDerivAt_id c).const_mul s) using 1 <;> first | rfl | simp',
    'have heq := hder.deriv','use c','constructor','apply hm','change deriv f c=s','linarith'
  ],'减去割线，造出两端同高的辅助函数。用刚证明的罗尔定理找到静止点，再还原原函数的斜率。');
  level('a16').skills.push('field_simp');
  insert('a19','a19ivt','连成一片的所有高度','(f : ℝ → ℝ) (a b y : ℝ) (hab : a ≤ b) (hc : ContinuousOn f (Icc a b)) (hy0 : f a ≤ y) (hy1 : y ≤ f b) : ∃ c ∈ Icc a b, f c=y',[
    'have hconnected := isPreconnected_Icc.image f hc',
    'have hl : f a ∈ f \'\' Icc a b := ⟨a,⟨le_rfl,hab⟩,rfl⟩',
    'have hr : f b ∈ f \'\' Icc a b := ⟨b,⟨hab,le_rfl⟩,rfl⟩',
    'apply hconnected.ordConnected.out hl hr','constructor','apply hy0','apply hy1'
  ],['ivt']).lesson='连续函数的像连成一片。先放入两个端点，再证明任意中间高度都属于这片像。';
  set('a20',[
    'have hconnected := isPreconnected_Icc.image g hc',
    'have hl : g 0 ∈ g \'\' Icc (0:ℝ) 1 := ⟨0,by norm_num,rfl⟩',
    'have hr : g 1 ∈ g \'\' Icc (0:ℝ) 1 := ⟨1,by norm_num,rfl⟩',
    'apply hconnected.ordConnected.out hl hr',R('h0'),R('h1'),'constructor','norm_num','norm_num'
  ],'连续映射把连成一片的区间，送到连成一片的像。两个端点之间的高度，也在这片像中。');
  insert('t13','t13bezout','裴蜀桥的正负四条路','(m n : ℤ) : (Int.gcd m n : ℤ) = m*Int.gcdA m n+n*Int.gcdB m n',[
    'rcases m with m | m','rcases n with n | n','apply Nat.gcd_eq_gcd_ab',
    'change (_ : ℤ) = _ + -(n+1) * -_',R('Int.neg_mul_neg'),'apply Nat.gcd_eq_gcd_ab',
    'rcases n with n | n','change (_ : ℤ) = -(m+1) * -_ + _',R('Int.neg_mul_neg'),'apply Nat.gcd_eq_gcd_ab',
    'change (_ : ℤ) = -(m+1) * -_ + -(n+1) * -_',R('Int.neg_mul_neg'),R('Int.neg_mul_neg'),'apply Nat.gcd_eq_gcd_ab'
  ],['bezout']).lesson='按两个整数的正负分成四种情况，把负负相乘还原为正数的扩展欧几里得结果。';
  // Workshop ingredients describe smaller facts, not the theorem currently being earned.
  const foundations={derivative:['hasDerivAt_iff_isLittleO_nhds_zero','Asymptotics.isLittleO_zero'],abs_value:['abs_of_nonneg','abs_of_nonpos','le_total'],intervals:['exists_isLocalExtr_Ioo'],gcd:['Nat.gcd_eq_gcd_ab'],integer:['Int.neg_mul_neg']};
  const owners={square_nonneg:'l20square',abs:'a01abs',real_identities:'a02identities',deriv_add:'a09sum',integral:'a11constant',integral_power:'a12power',integral_identity:'a12identity',bezout:'t13bezout',ivt:'a19ivt'};
  return {foundations,owners};
}
