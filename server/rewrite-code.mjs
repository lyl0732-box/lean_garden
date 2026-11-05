import {witnessExpression} from './witness.mjs';

// Parse a single rewrite, then generate trusted tactics. Raw source never reaches
// Lean: the selected unlocked rule and current local variables are the grammar.
export function selectedRewriteCode(repo,selection,goals,known){
  const entry=repo.entries.find(e=>e.id===selection?.entry);
  const source=selection?.code;
  if(!entry||typeof source!=='string'||source.length>600)return null;
  const m=/^\s*(rw|nth_rewrite\s+([1-9]\d?)|repeat'\s+rw)\s*\[\s*(←\s*)?([^\[\]\r\n]+?)\s*\]\s*(?:at\s+([^\s]+))?\s*$/u.exec(source);
  if(!m)return null;
  const target=repo.targets.find(t=>t.id===(m[5]||'goal'));
  if(!target||selection.target&&target.id!==selection.target||m[2]&&Number(m[2])>64)return null;
  const head=entry.term.split(/\s/)[0],term=m[4].trim();
  if(term!==head&&!term.startsWith(head+' '))return null;
  let evidence;
  try{witnessExpression(term,goals,known,[head]);evidence=term.replace(/\s+/g,' ');}catch{return null;}
  const direction=m[3]?'backward':'forward';
  const mode=m[1].startsWith('repeat')?'all':m[2]?'nth':'once';
  const occurrences=[Number(m[2]||1)];
  const code=`${mode==='all'?'garden_repeat_rewrite':'garden_strict_rw'}${mode==='nth'?` (occs := [${occurrences[0]}])`:''} [${m[3]?'← ':''}${evidence}]${target.id==='goal'?'':` at ${target.id}`}`;
  return {kind:'rewrite',cardId:entry.cardId,term:evidence,direction,target:target.id,mode,occurrences,code,editedSource:source.trim()};
}
