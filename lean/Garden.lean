import Mathlib.Tactic
import Mathlib.Analysis.Calculus.MeanValue
import Mathlib.Analysis.SpecialFunctions.Integrals.Basic
import Mathlib.Analysis.Calculus.Deriv.Pow
import Mathlib.Data.Int.ModEq
import Mathlib.Data.Int.GCD
import Garden.Strict

theorem Garden.deriv_square (x : ℝ) : HasDerivAt (fun y : ℝ => y^2) (2*x) x := by
  have hi : HasDerivAt (fun y : ℝ => y) 1 x := hasDerivAt_id x
  have h := hi.mul hi
  convert h using 1 <;> first | (funext y; simp only [Pi.mul_apply]; ring) | ring

open Lean Meta Elab Tactic

/- Emits the actual elaborator state. It does not solve or admit any goal. -/
elab "garden_state" : tactic => do
  let values ← (← getGoals).toArray.mapM fun g =>
    g.withContext do
      let mut hypotheses : Array Json := #[]
      for d in (← getLCtx) do
        if !d.isImplementationDetail then
          hypotheses := hypotheses.push (Json.mkObj [
            ("name", toJson d.userName.toString),
            ("isProp", toJson (← Meta.isProp d.type)),
            ("isNat", toJson ((← whnf d.type).isConstOf ``Nat)),
            ("isEquality", toJson ((← whnf d.type).isAppOf ``Eq || (← whnf d.type).isAppOf ``Iff)),
            ("type", toJson (← ppExpr (← instantiateMVars d.type)).pretty)])
      return Json.mkObj [
        ("name", toJson (← g.getTag).toString),
        ("target", toJson (← ppExpr (← instantiateMVars (← g.getType))).pretty),
        ("hypotheses", toJson hypotheses)]
  logInfo m!"GARDEN_STATE:{(toJson values).compress}"

/-- Repeat a single rewrite until it stops, with transactional cycle/size guards. -/
private def gardenFingerprint : TacticM String := do
  let states ← (← getGoals).mapM fun g => g.withContext do
    let mut lines := #[(← ppExpr (← instantiateMVars (← g.getType))).pretty]
    for d in (← getLCtx) do
      if !d.isImplementationDetail then
        lines := lines.push (d.userName.toString ++ ":" ++ (← ppExpr (← instantiateMVars d.type)).pretty)
    return String.intercalate "\n" lines.toList
  return String.intercalate "\n---\n" states

elab "garden_repeat" t:tactic : tactic => do
  let initial ← saveState
  let mut seen := #[← gardenFingerprint]
  let mut changed := false
  for _ in [:64] do
    let before ← saveState
    let succeeded ← try
      evalTactic t
      pure true
    catch _ =>
      before.restore
      pure false
    if !succeeded then
      if !changed then throwError "这条等式在所选位置没有可改写的内容。"
      return
    let fingerprint ← gardenFingerprint
    if seen.contains fingerprint then
      initial.restore
      throwError "这条规则会循环改写。请改用单次或指定第几个位置。"
    seen := seen.push fingerprint
    changed := true
    if (← getGoals).isEmpty then return
  initial.restore
  throwError "连续改写超过 64 次，请改用单次或指定位置。"

macro "garden_repeat_rewrite" rules:Lean.Parser.Tactic.rwRuleSeq loc:(Lean.Parser.Tactic.location)? : tactic =>
  `(tactic| garden_repeat (garden_strict_rw $rules:rwRuleSeq $(loc)?))

namespace Garden

/-- A named teaching lemma, proved from the definition of the numeral one. -/
theorem one_eq_succ_zero : (1 : Nat) = Nat.succ 0 := rfl
theorem two_eq_succ_one : (2 : Nat) = Nat.succ 1 := rfl
theorem three_eq_succ_two : (3 : Nat) = Nat.succ 2 := rfl
theorem four_eq_succ_three : (4 : Nat) = Nat.succ 3 := rfl
theorem pow_succ (a n : Nat) : a ^ Nat.succ n = a ^ n * a := by simp only [Nat.pow_succ]

/-- Earned after proving the addition-by-one bridge level. -/
theorem add_one_eq_succ (n : Nat) : n + 1 = Nat.succ n := by
  rewrite [one_eq_succ_zero, Nat.add_succ, Nat.add_zero]
  rfl

/-- The punctured epsilon-delta definition of a real limit. -/
def EpsilonLimit (f : ℝ → ℝ) (a L : ℝ) : Prop :=
  ∀ ε > 0, ∃ δ > 0, ∀ x : ℝ, 0 < |x - a| → |x - a| < δ → |f x - L| < ε

/-- Divisibility form of integer congruence, convenient for a constructive CRT. -/
def Congruent (m x a : ℤ) : Prop := m ∣ x - a

/-- The auxiliary-point lemma proved interactively in level a21. -/
theorem crossing {f : ℝ → ℝ} (hc : ContinuousOn f (Set.Icc (0 : ℝ) 1))
    (h0 : f 0 = 0) (h1 : f 1 = 1) : ∃ c ∈ Set.Ioo (0 : ℝ) 1, f c = 1-c := by
  have hg := hc.add continuousOn_id
  have hv : (1 : ℝ) ∈ Set.Icc (f 0+0) (f 1+1) := by
    rw [h0, h1]
    constructor <;> norm_num
  rcases intermediate_value_Icc (show (0 : ℝ) ≤ 1 by norm_num) hg hv with ⟨c, hci, heq⟩
  have hc0 : 0<c := lt_of_le_of_ne hci.1 (by intro e; subst c; simp [h0] at heq)
  have hc1 : c<1 := lt_of_le_of_ne hci.2 (by intro e; subst c; norm_num [h1] at heq)
  change f c + c = 1 at heq
  refine ⟨c, ⟨hc0, hc1⟩, ?_⟩
  linarith

/-- The constructive two-modulus CRT earned in the number-theory boss. -/
theorem crt (m n a b : ℤ) (hco : Int.gcd m n = 1) :
    ∃ x : ℤ, Congruent m x a ∧ Congruent n x b := by
  have h := Int.gcd_eq_gcd_ab m n
  rewrite [hco] at h
  norm_num at h
  use a*(n*Int.gcdB m n)+b*(m*Int.gcdA m n)
  constructor
  · change m ∣ (a*(n*Int.gcdB m n)+b*(m*Int.gcdA m n))-a
    use (b-a)*Int.gcdA m n
    nlinarith [congrArg (fun z : ℤ => a*z) h]
  · change n ∣ (a*(n*Int.gcdB m n)+b*(m*Int.gcdA m n))-b
    use (a-b)*Int.gcdB m n
    nlinarith [congrArg (fun z : ℤ => b*z) h]

end Garden
