import {actionsFor} from './content.mjs';
import {repository, selectedInduction, missingRewrites} from './rewrite.mjs';

const kinds={definition:'定义',theorem:'定理',axiom:'公理'};
// A single explicit occurrence is the same operation as the default first match.
const canonical=code=>code.replace(/garden_strict_rw \(occs := \[1\]\)/g,'garden_strict_rw').replace(/\s+/g,' ').trim();
const place=target=>target==='goal'?'当前目标':`已知条件 ${target}`;
export function nextHint(profile,level,codes,goals,count){
  if(!goals.length)return {hint:'所有目标都完成了，可以领取通关奖励。',steps:[],suggestion:null};
  const actions=actionsFor(profile,level),goal=goals[0];
  const onPath=codes.every((code,i)=>canonical(code)===canonical(level.solution[i]||''));
  const code=onPath?level.solution[codes.length]:null;
  let suggestion=null,steps=[];
  if(code){
    const rw=/^garden_strict_rw(?: \(occs := \[(\d+)\]\))? \[(← )?(.+)\](?: at (.+))?$/.exec(code);
    const apply=/^(?:garden_nat_apply|apply) (.+)$/.exec(code);
    if(rw||apply){
      const skill=rw?'rw':'apply',repo=repository(profile,level,goals,skill);
      const term=rw?rw[3]:apply[1],exact=repo.entries.find(e=>e.term===term);
      const entry=exact||repo.entries.find(e=>e.term===term.split(/\s/)[0]),target=rw?.[4]||'goal';
      if(entry&&repo.targets.some(t=>t.id===target)){
        suggestion={skill,entry:entry.id,target,source:entry.kind==='hypothesis'?'hypothesis':'warehouse',category:entry.kind==='hypothesis'?'definition':entry.kind,direction:rw?.[2]?'backward':'forward',mode:rw?.[1]?'nth':'once',occurrences:[Number(rw?.[1]||1)]};
        steps=[`点击左边的 ${skill} 技能卡。`,`选择${entry.kind==='hypothesis'?'「已知命题」':`「${kinds[entry.kind]}」`}卡组，转动滚轮，让「${entry.name}」停在正中并抽出。`,...(rw?[`在翻卡舞台选择「${rw[2]?'反向':'正向'}」，点「全部代换」改为指定第 ${rw[1]||1} 处。`]:[]),'确认后举起魔杖。',`点击「${place(target)}」释放魔法。`];
        suggestion.name=entry.name;suggestion.formula=entry.formula;
        if(!exact&&rw){suggestion.mode='code';suggestion.code=`${rw[1]?'nth_rewrite '+rw[1]:'rw'} [${rw[2]||''}${term}]${target==='goal'?'':` at ${target}`}`;steps[2]='在翻卡舞台切换到「精细代码修改」，填写：'+suggestion.code;}
      }
    }else if(code.startsWith('induction ')){
      const variable=code.split(' ')[1];
      if(actions.some(a=>a.skill==='induction')&&selectedInduction(goals,{variable})){
        suggestion={skill:'induction',variable};steps=['点击左边的 induction 技能卡。',`归纳对象选「${variable}」。`,'点「开始归纳」，先完成起点，再完成下一步。'];
      }
    }else if(code.startsWith('use ')){
      suggestion={skill:'use'};steps=['点击左边的 use 技能卡。',`亲手输入见证：${code.slice(4)}。`,'点「交给 Lean 验证」，再完成剩余目标。'];
    }else{
      const action=actions.find(a=>canonical(a.code)===canonical(code));
      if(action){suggestion={skill:action.skill,action:action.id};steps=[`点击左边的 ${action.skill} 技能卡。`,action.skill==='rfl'?'两边写法已经相同，用 rfl 收尾。':`使用「${action.label}」，再观察目标的变化。`];}
    }
  }
  // Alternate valid proofs remain welcome: do not suggest the next reference
  // command unless the player's actual sequence matches that reference.
  if(!onPath){
    const equality=/^(.+) = (.+)$/s.exec(goal.target);
    if(equality&&equality[1]===equality[2]&&!missingRewrites(level,codes).length){
      const action=actions.find(a=>a.skill==='rfl');
      if(action){suggestion={skill:'rfl',action:action.id};steps=['目标两边已经一样了。','点击 rfl，为这个分支收尾。'];}
    }
  }
  const contextual=goal.name?.split('.').at(-1)==='zero'?'现在先证明起点：把自然数取成 0。完成这一支后，下一步的目标会自动接上。':goal.name?.split('.').at(-1)==='succ'?'现在证明下一步。ih 是“上一格已经成立”的证据，可以在已有命题里选它。':goal.target.includes('∧')?'目标里的 ∧ 表示两件事都要成立。用 constructor 拆开，依次证明。':goal.target.includes('∃')?'目标里的 ∃ 表示找一个例子。用 use 选对象，再证明它满足条件。':level.lesson;
  return {hint:count===1?level.lesson:suggestion?'沿着当前证明，可以这样走下一步：':contextual,steps:count>1?steps:[],suggestion:count>1?suggestion:null,canExpand:count===1};
}
