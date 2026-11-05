export const oldMiniStatement='(n : Nat) : 0+(0+n)=n';
export function prepareRevision7(levels){
  const l=levels.find(l=>l.id==='m02'),rw=t=>`garden_strict_rw [${t}]`;
  const solution=['induction n using Nat.rec with\n| zero\n| succ k ih',rw('hf0'),rw('hg0'),'norm_num','rcases ih with ⟨ihf, ihg⟩',rw('hf k'),rw('hg k'),...Array(5).fill(rw('← Garden.add_one_eq_succ')),'constructor','nlinarith','nlinarith'];
  const required=['induction','rw','norm_num','rcases','constructor','nlinarith','add_one_eq_succ'];
  Object.assign(l,{title:'双生数列塔',statement:'(f g : Nat → Nat) (hf0 : f 0 = 0) (hg0 : g 0 = 0) (hf : ∀ k, f (succ k) = f k + succ k) (hg : ∀ k, g (succ k) = g k + (2*k+1)) (n : Nat) : 2 * f n = n*(n+1) ∧ g n = n*n',goal:'两条递推数列：证明 2 f(n) = n(n+1)，且 g(n) = n²',lesson:'一座塔逐层叠加自然数，另一座叠加奇数。对 n 归纳；在下一层拆出两条归纳假设，展开递推规则，再分别证明两座塔的高度公式。',solution,required,difficulty:'高难 · 双命题归纳',miniBoss:true,contentVersion:7,requiredRewrites:[],actions:[]});
  l.hints=[l.lesson];
  const labels={'induction':'把两座数列塔一起归纳','norm_num':'核验零层的数值','rcases':'拆出 ih 的两条归纳假设','constructor':'分别证明两座塔的公式','nlinarith':'组合归纳假设与当前代数关系'};
  for(const [i,code] of [...new Set(solution)].entries()){
    const skill=code.startsWith('garden_strict_rw')?'rw':code.split(/[ \n]/)[0];
    const term=/\[(.*)\]/.exec(code)?.[1],rewriteLabels={hf0:'展开 f 的零层',hg0:'展开 g 的零层','hf k':'展开 f 的下一层','hg k':'展开 g 的下一层','← Garden.add_one_eq_succ':'把后继写成加一'};
    const formula=term==='hf k'?'f (succ k) = f k + succ k':term==='hg k'?'g (succ k) = g k + (2 * k + 1)':undefined;
    l.actions.push({id:`m02-v7-${i}`,skill,code,label:labels[skill]||rewriteLabels[term]||'选择证明步骤',formula,uses:code.includes('Garden.add_one_eq_succ')?['add_one_eq_succ']:[]});
  }
}
export function migrateChallengeV7(owner){
  let changed=false;
  for(const profile of [owner,owner.practice].filter(Boolean)){
    if(profile.challengeVersion>=7)continue;
    const completed=profile.completed?.m02,attempt=profile.attempts?.m02;
    if(completed||attempt){
      profile.legacyChallengesV6={...profile.legacyChallengesV6,m02:{title:'双重归纳回廊',statement:oldMiniStatement,completed,attempt}};
      if(profile.completed)delete profile.completed.m02;
      if(profile.attempts)delete profile.attempts.m02;
    }
    profile.challengeVersion=7;changed=true;
  }
  return changed;
}
