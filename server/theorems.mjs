export const theoremLibrary={
  false_elim:['False.elim'],crt:['Garden.crt'],
  one_eq_succ_zero:['Garden.one_eq_succ_zero'],two_eq_succ_one:['Garden.two_eq_succ_one'],three_eq_succ_two:['Garden.three_eq_succ_two'],four_eq_succ_three:['Garden.four_eq_succ_three'],add_one_eq_succ:['Garden.add_one_eq_succ'],
  add_zero:['Nat.add_zero'],add_succ:['Nat.add_succ'],zero_add:['Nat.zero_add'],succ_ne:['Nat.succ_ne_zero'],succ_inj:['Nat.succ.inj'],
  add_assoc:['Nat.add_assoc'],add_comm:['Nat.add_comm'],mul_zero:['Nat.mul_zero'],mul_succ:['Nat.mul_succ'],zero_mul:['Nat.zero_mul'],
  succ_add:['Nat.succ_add'],mul_one:['Nat.mul_one'],succ_mul:['Nat.succ_mul'],add_mul:['Nat.add_mul'],pow_two:['pow_two'],
  distribute:['Nat.mul_add'],mul_comm:['Nat.mul_comm'],pow:['pow_zero'],pow_succ:['Garden.pow_succ'],square_nonneg:['sq_nonneg'],
  abs:['abs_lt','abs_zero'],real_identities:['sub_self','sub_zero','zero_div'],
  derivative:['hasDerivAt_iff_isLittleO_nhds_zero','Asymptotics.isLittleO_zero'],abs_value:['abs_of_nonneg'],abs_nonpos:['abs_of_nonpos'],integer:['Int.neg_mul_neg'],gcd:['Nat.gcd_eq_gcd_ab'],
  deriv_id:['hasDerivAt_id'],deriv_const:['hasDerivAt_const'],deriv_pow:['Garden.deriv_square'],deriv_add:['HasDerivAt.add'],
  integral:['intervalIntegral.integral_const'],integral_identity:['integral_id'],integral_power:['integral_pow'],rolle:['exists_deriv_eq_zero'],mvt:['exists_deriv_eq_slope'],
  ivt:['intermediate_value_Icc'],bezout:['Int.gcd_eq_gcd_ab']
};
export const builtinRules={False_elim:{term:'False.elim',cardId:'not'},And_intro:{term:'And.intro',cardId:'constructor'}};
