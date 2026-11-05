export const previousN06Statement='(a b : Nat) (h : a = b + 1) : a + 0 = b + 1';

export function prepareRevision9(levels){
  const level=levels.find(l=>l.id==='n06');
  Object.assign(level,{
    statement:'(a b : Nat) (h : a = b + 1) : a + 0 = succ b',goal:'a + 0 = succ b',contentVersion:9,
    lesson:'已知 a = b + 1。先用等式替换 a，消去 +0，再用已经证明的加一阶梯，把 b + 1 变成 succ b。最后亲手点 rfl。',
    solution:['garden_strict_rw [h]','garden_strict_rw [Nat.add_zero]','garden_strict_rw [Garden.add_one_eq_succ]','garden_strict_rfl']
  });
  level.hints=[level.lesson];
  level.actions.push({id:'n06-v9-add-one',skill:'rw',label:'用加一阶梯连接后继',code:'garden_strict_rw [Garden.add_one_eq_succ]',uses:['add_one_eq_succ']});
}

export function migrateRevision9(owner){
  let changed=false;
  for(const profile of [owner,owner.practice].filter(Boolean)){
    if(profile.curriculumVersion>=9)continue;
    const attempt=profile.attempts?.n06,result=profile.completed?.n06;
    if(attempt||result){
      profile.legacyLevelsV8={...profile.legacyLevelsV8,n06:{statement:previousN06Statement,attempt:attempt?structuredClone(attempt):undefined,completed:result?structuredClone(result):undefined}};
      if(result)result.statement ||= previousN06Statement;
      // All other attempts and all earned results remain intact.
      if(attempt)profile.attempts.n06={...attempt,steps:[],revision:attempt.revision+1};
    }
    profile.curriculumVersion=9;changed=true;
  }
  return changed;
}
