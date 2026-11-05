import Mathlib.Tactic

open Lean Meta Elab Tactic

namespace GardenStrict

/-- Structural equality, ignoring annotations and bound-variable names only. -/
partial def sameShape (a b : Expr) : Bool :=
  let a := a.consumeMData
  let b := b.consumeMData
  match a, b with
  | .app af aa, .app bf ba => sameShape af bf && sameShape aa ba
  | .lam _ aTy ab ai, .lam _ bt bb bi => ai == bi && sameShape aTy bt && sameShape ab bb
  | .forallE _ aTy ab ai, .forallE _ bt bb bi => ai == bi && sameShape aTy bt && sameShape ab bb
  | .letE _ aTy av ab an, .letE _ bt bv bb bn => an == bn && sameShape aTy bt && sameShape av bv && sameShape ab bb
  | .proj an ai ae, .proj bn bi be => an == bn && ai == bi && sameShape ae be
  | _, _ => a == b

/-- Ignore notation elaboration (HAdd.hAdd versus Nat.add), never evaluate arithmetic. -/
def sameSurface (a b : Expr) : MetaM Bool := do
  if sameShape a b then return true
  let clean (e : Expr) := e.replace fun x => if x.isConstOf ``Nat.zero then some (mkNatLit 0) else none
  let opts := (← getOptions).setBool `pp.universes false |>.setBool `pp.explicit false
  withOptions (fun _ => opts) do
    return (← ppExpr (clean a)).pretty == (← ppExpr (clean b)).pretty

/-- Bind parameters to the written expression before Lean can reduce it. -/
partial def matchWritten (e p : Expr) : MetaM Bool := do
  let e := e.consumeMData
  let p := (← instantiateMVars p).consumeMData
  if let .mvar id := p then
    if ← isDefEq (← inferType e) (← id.getType) then
      unless ← occursCheck id e do return false
      id.assign e
      return true
    return false
  if let .app ef ea := e then
    if let .app pf pa := p then
      let saved ← getMCtx
      if (← matchWritten ef pf) && (← matchWritten ea pa) then return true
      setMCtx saved
  return (← isDefEq e p) && (← sameSurface (← instantiateMVars e) (← instantiateMVars p))

/-- Let Lean instantiate parameters, but reject matches requiring visible term reduction. -/
def strictMatch (e pattern : Expr) : MetaM Bool := do
  let saved ← getMCtx
  try
    if (← matchWritten e pattern) && (← sameSurface (← instantiateMVars e) (← instantiateMVars pattern)) then
      return true
    setMCtx saved
    return false
  catch _ =>
    setMCtx saved
    return false

/-- Variant of Lean.Meta.kabstract. Occurrences are 1-based, outside-in and left-to-right. -/
partial def strictKAbstract (e pattern : Expr) (occs : Occurrences := .pos [1]) : MetaM Expr := do
  let e ← instantiateMVars e
  let rec visit (e : Expr) (offset : Nat) : StateRefT Nat MetaM Expr := do
    let children : Unit → StateRefT Nat MetaM Expr := fun _ => do
      match e with
      | .app .. =>
        let fn := e.getAppFn
        -- Numerals are one visible token, not their OfNat implementation arguments.
        if fn.isConstOf ``OfNat.ofNat then return e
        let args := e.getAppArgs
        let info ← getFunInfoNArgs fn args.size
        let fn ← if fn.isConst then pure fn else visit fn offset
        let mut result := fn
        for i in [:args.size] do
          let arg := args[i]!
          let arg ← if info.paramInfo[i]?.any (fun p => p.binderInfo == .default) then
            visit arg offset
          else pure arg
          result := mkApp result arg
        return result
      | .mdata _ b => return e.updateMData! (← visit b offset)
      | .proj _ _ b => return e.updateProj! (← visit b offset)
      | .letE _ t v b _ => return e.updateLetE! (← visit t offset) (← visit v offset) (← visit b (offset+1))
      | .lam _ d b _ => return e.updateLambdaE! (← visit d offset) (← visit b (offset+1))
      | .forallE _ d b _ => return e.updateForallE! (← visit d offset) (← visit b (offset+1))
      | _ => return e
    if e.hasLooseBVars then
      children ()
    else
      let saved ← getMCtx
      if ← strictMatch e pattern then
        let index ← get
        set (index + 1)
        if occs.contains index then return mkBVar offset
        setMCtx saved
      children ()
  visit e 0 |>.run' 1

/-- Construct congrArg proof exactly as Lean's rewrite, using strict abstraction. -/
def strictRewrite (goal : MVarId) (e heq : Expr) (symm := false)
    (occs : Occurrences := .pos [1]) : MetaM RewriteResult := goal.withContext do
  goal.checkNotAssigned `garden_strict_rw
  let heqIn := heq
  let heqType ← instantiateMVars (← inferType heq)
  let (newMVars, binderInfos, heqType) ← forallMetaTelescopeReducing heqType
  let heq := mkAppN heq newMVars
  let (heq, heqType) ← match heqType.iff? with
    | some (lhs, rhs) => pure (mkApp3 (mkConst ``propext) lhs rhs heq, ← mkEq lhs rhs)
    | none => pure (heq, heqType)
  let some (α, lhs, rhs) ← matchEq? heqType | throwError "只能用等式或等价命题改写。"
  let (heq, lhs, rhs) ← if symm then pure (← mkEqSymm heq, rhs, lhs) else pure (heq, lhs, rhs)
  if lhs.getAppFn.isMVar then throwError "请先指定这条定理要使用的参数。"
  let e ← instantiateMVars e
  let abstracted ← strictKAbstract e lhs occs
  unless abstracted.hasLooseBVars do
    throwError "所选位置没有形状完全相同的内容；请先用定理展开需要的定义。"
  let newExpr ← instantiateMVars (abstracted.instantiate1 rhs)
  let newExpr ← if rhs.hasBinderNameHint then newExpr.resolveBinderNameHint else pure newExpr
  let eType ← inferType e
  let motive := Lean.mkLambda `_a BinderInfo.default α abstracted
  check motive
  let typeCorrect ← withLocalDeclD `_a α fun a => do
    let actual ← inferType (abstracted.instantiate1 a)
    isDefEq actual eType
  unless typeCorrect do
    throwError "此处存在依赖类型，请缩小改写位置。"
  let u1 ← getLevel α
  let u2 ← getLevel eType
  let eqProof := mkApp6 (.const ``congrArg [u1, u2]) α eType lhs rhs motive heq
  postprocessAppMVars `garden_strict_rw goal newMVars binderInfos
    (synthAssignedInstances := !tactic.skipAssignedInstances.get (← getOptions))
  let newIds ← newMVars.map Expr.mvarId! |>.filterM fun m => not <$> m.isAssigned
  appendParentTag goal newMVars binderInfos
  let otherIds ← getMVarsNoDelayed heqIn
  let otherIds := otherIds.filter (!newIds.contains ·)
  return { eNew := newExpr, eqProof, mvarIds := (newIds ++ otherIds).toList }

def elabStrictRewrite (goal : MVarId) (e : Expr) (stx : Syntax) (symm : Bool)
    (occs : Occurrences) : TacticM RewriteResult := do
  let savedCounter := (← getMCtx).mvarCounter
  let ruleProof ← elabTerm stx none true
  if ruleProof.hasSyntheticSorry then throwAbortTactic
  unless ← occursCheck goal ruleProof do throwError "不能把正在证明的目标当作已有定理。"
  let result ← strictRewrite goal e ruleProof symm occs
  let mctx ← getMCtx
  return { result with mvarIds := result.mvarIds.filter fun m => (mctx.getDecl m).index >= savedCounter }

def target (stx : Syntax) (symm : Bool) (occs : Occurrences) : TacticM Unit := do
  let result ← Term.withSynthesize <| withMainContext do
    elabStrictRewrite (← getMainGoal) (← getMainTarget) stx symm occs
  let result ← finishElabRewrite result
  let newGoal ← (← getMainGoal).replaceTargetEq result.eNew result.eqProof
  replaceMainGoal (newGoal :: result.mvarIds)

def hypothesis (stx : Syntax) (symm : Bool) (occs : Occurrences) (id : FVarId) : TacticM Unit := withMainContext do
  let result ← Term.withSynthesize <| withMainContext do
    elabStrictRewrite (← getMainGoal) (← id.getDecl).type stx symm occs
  let result ← finishElabRewrite result
  let replaced ← (← getMainGoal).replaceLocalDecl id result.eNew result.eqProof
  replaceMainGoal (replaced.mvarId :: result.mvarIds)

end GardenStrict

syntax (name := gardenStrictRw) "garden_strict_rw" ("(" &"occs" ":=" "[" num,* "]" ")")?
  Lean.Parser.Tactic.rwRuleSeq (Lean.Parser.Tactic.location)? : tactic

elab_rules : tactic
  | `(tactic| garden_strict_rw $[(occs := [$nums:num,*])]? $rules:rwRuleSeq $[$loc:location]?) => do
    let occs := match nums with
      | none => Occurrences.pos [1]
      | some nums => Occurrences.pos (nums.getElems.toList.map (·.getNat))
    let location := expandOptLocation (mkOptionalNode loc)
    withRWRulesSeq (mkAtom "garden_strict_rw") rules fun symm term => do
      withLocation location
        (GardenStrict.hypothesis term symm occs)
        (GardenStrict.target term symm occs)
        (throwTacticEx `garden_strict_rw · "没有形状相同的可改写位置。")

elab "garden_strict_rfl" : tactic => withMainContext do
  -- Rewriting may leave the equality under an applied lambda. Expose only
  -- beta-redexes/annotations; do not evaluate addition or other definitions.
  let target := (← instantiateMVars (← getMainTarget)).headBeta.consumeMData
  let some (_, lhs, rhs) := target.eq?
    | throwError "rfl 只能用于等式。"
  unless ← GardenStrict.sameSurface lhs rhs do
    throwError "两边还没有完全相同；请先使用改写。"
  liftMetaFinishingTactic (·.refl)

/-- Natural-number equality lessons cannot use apply to smuggle in computation. -/
elab "garden_nat_apply " term:term : tactic => withMainContext do
  let target ← getMainTarget
  if let some (ty, _, _) := target.eq? then
    if ← isDefEq ty (mkConst ``Nat) then
      let saved ← getMCtx
      let proof ← elabTerm term none
      let (_, _, conclusion) ← forallMetaTelescopeReducing (← inferType proof)
      unless ← GardenStrict.strictMatch target conclusion do
        throwError "这份证据的结论与目标写法不同；请先改写需要的定义。"
      setMCtx saved
  evalTactic (← `(tactic| apply $term))

/-- The same match enumeration used by a single rewrite, without changing the goal. -/
def GardenStrict.matches (e : Expr) (stx : Syntax) (symm : Bool) : TacticM Json := do
  let ruleProof ← elabTerm stx none true
  let (_, _, eqType) ← forallMetaTelescopeReducing (← inferType ruleProof)
  let (lhs, rhs) ← match eqType.iff? with
    | some sides => pure sides
    | none => match eqType.eq? with
      | some (_, l, r) => pure (l, r)
      | none => throwError "这条规则不是等式或等价命题，不能用于 rw。"
  let pattern := if symm then rhs else lhs
  if pattern.getAppFn.isMVar then throwError "请先选择带有具体参数的规则。"
  let saved ← getMCtx
  let mut entries : Array Json := #[]
  for index in [1:65] do
    setMCtx saved
    let abstracted ← GardenStrict.strictKAbstract e pattern (.pos [index])
    if !abstracted.hasLooseBVars then break
    let actual ← instantiateMVars pattern
    let expression := (← ppExpr actual).pretty
    let context ← withLocalDeclD (Name.mkSimple "selected") (← inferType actual) fun marker => do
      return (← ppExpr (abstracted.instantiate1 marker)).pretty
    entries := entries.push (Json.mkObj [("index",toJson index),("expression",toJson expression),("context",toJson context)])
  setMCtx saved
  return toJson entries

syntax "garden_rewrite_matches" Lean.Parser.Tactic.rwRuleSeq (Lean.Parser.Tactic.location)? : tactic
elab_rules : tactic
  | `(tactic| garden_rewrite_matches $rules:rwRuleSeq $[$loc:location]?) => do
    withMainContext do
      let location := expandOptLocation (mkOptionalNode loc)
      withRWRulesSeq (mkAtom "garden_rewrite_matches") rules fun symm term => do
        let report (e : Expr) : TacticM Unit := do
          logInfo m!"GARDEN_MATCHES:{(← GardenStrict.matches e term symm).compress}"
        withLocation location
          (fun id => do report (← id.getDecl).type)
          (do report (← getMainTarget))
          (throwTacticEx `garden_rewrite_matches · "请选择当前目标或有效命题。")

