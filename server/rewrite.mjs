import {cards,unlocked,actionsFor} from './content.mjs';
import {theoremLibrary} from './theorems.mjs';
export const safeName=name=>/^[\p{L}_][\p{L}\p{N}_'₀-₉]*$/u.test(name);
export function repository(profile,level,goals,skill='rw'){
  const known=unlocked(profile),entries=[],seen=new Set();
  if(!known.has(skill)||!goals.length)return{entries,targets:[]};
  const hyps=goals[0].hypotheses.filter(h=>safeName(h.name));
  const put=(term,cardId,kind='theorem',formula,label)=>{
    term=term.replace(/^←\s*/,'').trim();
    // The generic axiom already infers n from the chosen proposition. The
    // authored `... n` action must not create a second copy of this same card.
    if(cardId==='succ_ne'&&/^Nat\.succ_ne_zero(?:\s+[\p{L}\p{N}_']+)?$/u.test(term))term='Nat.succ_ne_zero';
    // Arguments select a use of a card, not a new card. Keep authored actions
    // for saved proofs; precise parameters belong in the rewrite editor.
    if(['add_comm','mul_comm'].includes(cardId)&&new RegExp('^Nat\\.'+cardId+'\\b').test(term))term='Nat.'+cardId;
    if(seen.has(term))return;seen.add(term);
    const c=cards.find(c=>c.id===cardId);
    entries.push({id:`${skill}-${entries.length}`,term,cardId,kind:kind==='hypothesis'?kind:c?.kind||kind,name:label||c?.name||term,formula:formula||c?.formula||c?.example||term});
  };
  for(const h of hyps.filter(h=>skill==='rw'?h.isEquality:h.isProp))put(h.name,null,'hypothesis',h.type,`已知 ${h.name}`);
  for(const action of actionsFor(profile,level).filter(a=>a.skill===skill)){
    const term=skill==='rw'?/^(?:rewrite|garden_strict_rw) \[(.*)\](?: at .+)?$/.exec(action.code)?.[1]:/^(?:apply|garden_nat_apply) (.+)$/.exec(action.code)?.[1];
    if(!term)continue;
    const plain=term.replace(/^←\s*/,'');
    const head=plain.split(/[ .(]/)[0];
    if(hyps.some(h=>h.name===plain))continue;
    if(hyps.some(h=>h.name===head))put(plain,action.uses[0]||null,'hypothesis',action.formula||action.label,action.label);
    else if(action.uses.length)put(plain,action.uses[0]);
    else if(skill==='rw'&&['sub_self','sub_zero','zero_div'].includes(plain)&&known.has('real_identities'))put(plain,'real_identities');
  }
  for(const [id,terms]of Object.entries(theoremLibrary))if(known.has(id))for(const term of terms)put(term,id);
  const termOrder=new Map(Object.values(theoremLibrary).flat().map((term,i)=>[term,i]));
  entries.sort((a,b)=>a.kind==='hypothesis'?(b.kind==='hypothesis'?0:-1):b.kind==='hypothesis'?1:(cards.find(c=>c.id===a.cardId)?.order??999)-(cards.find(c=>c.id===b.cardId)?.order??999)||(termOrder.get(a.term)??999)-(termOrder.get(b.term)??999)||a.term.localeCompare(b.term,'en'));
  return {chapter:level.chapter,entries,targets:[{id:'goal',name:'当前目标',formula:goals[0].target},...hyps.filter(h=>h.isProp).map(h=>({id:h.name,name:`已知 ${h.name}`,formula:h.type}))]};
}
export function selectedRewrite(repo,selection){
  const entry=repo.entries.find(e=>e.id===selection?.entry),target=repo.targets.find(t=>t.id===selection?.target);
  if(!entry||!target||!['forward','backward'].includes(selection.direction))return null;
  const mode=selection.mode||'once';if(!['once','nth','all'].includes(mode))return null;
  const occurrences=selection.occurrences??[selection.occurrence??1];
  if(mode==='nth'&&(!Array.isArray(occurrences)||!occurrences.length||occurrences.length>64||occurrences.some(n=>!Number.isInteger(n)||n<1||n>64)||new Set(occurrences).size!==occurrences.length))return null;
  const suffix=` [${selection.direction==='backward'?'← ':''}${entry.term}]${target.id==='goal'?'':` at ${target.id}`}`;
  const code=mode==='nth'?[...occurrences].sort((a,b)=>b-a).map(n=>`garden_strict_rw (occs := [${n}])${suffix}`).join('\n'):`${mode==='all'?'garden_repeat_rewrite':'garden_strict_rw'}${suffix}`;
  return {kind:'rewrite',term:entry.term,cardId:entry.cardId,direction:selection.direction,target:target.id,mode,occurrences,code};
}
export function selectedApply(repo,selection){
  const entry=repo.entries.find(e=>e.id===selection?.entry),target=repo.targets.find(t=>t.id===selection?.target);if(!entry||!target)return null;
  return{kind:'apply',term:entry.term,cardId:entry.cardId,target:target.id,code:target.id==='goal'?`${repo.chapter==='n'?'garden_nat_apply':'apply'} ${entry.term}`:`replace ${target.id} := (${entry.term}) ${target.id}`};
}
export function selectedInduction(goals,selection){
  if(!goals[0]?.hypotheses.some(h=>h.name===selection?.variable&&h.isNat&&safeName(h.name)))return null;
  return{kind:'induction',variable:selection.variable,code:`induction ${selection.variable} using Nat.rec with\n| zero\n| succ k ih`};
}
export function introductions(profile){return profile.isPractice?[]:[...unlocked(profile)].filter(id=>!(profile.introduced||[]).includes(id));}
