import Lean
open Lean Meta Elab Tactic

elab "garden_state" : tactic => do
  let goals ← getGoals
  let values ← goals.toArray.mapM fun g =>
    g.withContext do
      let mut hypotheses : Array Json := #[]
      for d in (← getLCtx) do
        if !d.isImplementationDetail then
          hypotheses := hypotheses.push (Json.mkObj [
            ("name", toJson d.userName.toString),
            ("type", toJson (← ppExpr (← instantiateMVars d.type)).pretty)])
      return Json.mkObj [
        ("name", toJson (← g.getTag).toString),
        ("target", toJson (← ppExpr (← instantiateMVars (← g.getType))).pretty),
        ("hypotheses", toJson hypotheses)]
  logInfo m!"GARDEN_STATE:{(toJson values).compress}"

example (n : Nat) : 0 + n = n := by
  induction n with
  | zero
  | succ k ih
  garden_state
