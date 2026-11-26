import { icon, mascot, escapeHTML as esc } from './ui.js';
import { cardArt } from './card-art.js';
import {branchTitle,branchNote} from './learning.js';
import {scenery} from './scenery.js';
import {spellControls,wizard} from './spell-flow.js';
import {formatTime,resourceCount} from './shop.js';
export const pretty = text => String(text ?? '').replaceAll('Nat.succ', 'succ').replace(/\bzero\b/g,'0').replaceAll('garden_strict_rfl','rfl').replaceAll('garden_strict_rw','rw').replaceAll('garden_nat_apply','apply');
const html = text => esc(pretty(text));
export const newSelection = () => ({skill:null,phase:'draw',target:'goal',direction:'forward',mode:'all',code:'',occurrences:[1],variable:'',action:'',witness:'',source:'warehouse',category:'theorem',categoryChosen:false,drawIndices:{},entry:null,matches:[],previewLoading:false,previewError:null});
const option = (value,label,current) => `<option value="${esc(value)}" ${String(value)===String(current)?'selected':''}>${html(label)}</option>`;
const select = (name,label,options) => `<label class="battle-field"><span>${label}</span><select data-control="${name}" aria-label="${label}">${options}</select></label>`;
export function battleView({state,selection:s,cardById,chapterById,btn}) {
  const b=state.battle,g=b.goals[0],ch=chapterById(b.level.chapter),groups=new Map();
  for(const a of b.actions){if(!groups.has(a.skill))groups.set(a.skill,[]);groups.get(a.skill).push(a);}
  const disabled=state.busy||b.complete, options=groups.get(s.skill)||[];
  const economy=b.progress.economy;
  const practiceTime=economy.unlimited?'自由选关 · 时长不限':`自由选关剩余 <b data-freeplay-time>${formatTime(economy.freeplayRemainingMs)}</b>`;
  const repo=s.skill==='apply'?b.applyRepository:b.repository;
  const armed=!disabled&&['rw','apply'].includes(s.skill)&&s.phase==='target'&&!!s.entry;
  if(!repo.targets.some(t=>t.id===s.target))s.target='goal';
  const vars=(g?.hypotheses||[]).filter(h=>h.isNat&&!h.name.includes('✝')&&!h.name.includes('._@.'));
  if(!vars.some(h=>h.name===s.variable))s.variable=vars[0]?.name||'';
  if(!options.some(a=>a.id===s.action))s.action=options[0]?.id||'';
  let controls='';
  if(s.skill&&g){
    if(['rw','apply'].includes(s.skill)){
      controls=s.phase==='prepare'?'<p class="control-help">证据卡已抽出，在翻卡舞台检查方向。</p>'+btn('prepare-spell','打开翻卡舞台','primary wide'):spellControls(s,repo,btn,disabled);
    }else if(s.skill==='use'){
      controls=`<label class="battle-field witness-field"><span>亲手构造一个见证</span><input data-witness autocomplete="off" spellcheck="false" maxlength="180" aria-label="见证表达式" value="${esc(s.witness)}" placeholder="填写数、变量或运算式"></label><p class="control-help">可用 + − * / ^ % 与括号；当前变量：${html((g.hypotheses||[]).filter(h=>!h.isProp).map(h=>h.name).join('、')||'无')}。每次提交一个见证。</p>${btn('confirm-witness','交给 Lean 验证','primary wide',disabled?'disabled':'')}`;
    }else if(s.skill==='induction'){
      controls='<p class="control-help">选择一个自然数，分成起点与后继两支来证明。</p>'+btn('open-induction','选择归纳变量','primary wide',disabled?'disabled':'');
    }else{
      controls=select('action','选择对象或用法',options.map(a=>option(a.id,a.label,s.action)).join(''))+btn('confirm-action','确认使用','primary wide',disabled||!options.length?'disabled':'');
    }
  }
  const compact=innerWidth<700,available=Math.max(210,innerHeight-130),nominal=compact?78:106,maxColumns=compact?2:Math.max(2,Math.floor(innerWidth*.28/100)),baseRows=Math.max(2,Math.floor((available-52)/(nominal+6))),columns=Math.max(1,Math.min(maxColumns,Math.ceil(groups.size/baseRows))),rows=Math.ceil(groups.size/columns),cardHeight=Math.min(nominal,Math.floor((available-52-(rows-1)*6)/rows)),railWidth=columns*(compact?60:94)+(columns-1)*6+12;
  return `<div class="battle-shell battle-v3 battle-v5 battle-v6 world-${b.level.chapter} ${armed?'spell-armed':''} ${cardHeight<75?'dense-hand':''} ${cardHeight<52?'tiny-hand':''}" style="--rail-width:${railWidth}px;--rail-cols:${columns};--rail-rows:${rows};--card-height:${cardHeight}px"><div class="battle-backdrop" aria-hidden="true">${scenery(b.level.chapter)}</div><header class="battle-header">${btn('leave',icon('back'),'icon-button','aria-label="返回地图"')}<div><span>${ch?.name||'小游戏副本'}${b.level.boss?' · 最终守卫':b.level.miniBoss?' · 首领挑战':''}</span><h2>${String(b.level.number).padStart(2,'0')} · ${html(b.level.title)}</h2></div><span class="battle-steps">${b.attempt.steps.length} 步</span>${['n01','n02','n03'].includes(b.level.id)?btn('tutorial-replay','教学','icon-button tutorial-replay','aria-label="重看新手教程"'):''}${btn('settings',icon('settings'),'icon-button','aria-label="设置"')}</header>
  <div class="battle-layout"><aside class="skill-rail" aria-label="你的技能卡"><span class="rail-label">你的技能</span>${[...groups.entries()].map(([id,actions])=>{const c=cardById(id);return `<button class="rail-card ${s.skill===id?'selected':''}" data-action="skill" data-skill="${id}" ${disabled?'disabled':''} aria-pressed="${s.skill===id}" aria-label="${esc(c?.name||id)} ${id}">${cardArt(id)}<code>${id}</code><span>${esc(c?.name||id)}</span></button>`;}).join('')}${btn('lesson-cards',`${icon('book')} 温习`,'rail-review')}</aside>
  <main class="battle-main">${b.progress.freePlay?`<div class="practice-banner">${practiceTime}</div>`:''}${['n01','n02','n03'].includes(b.level.id)&&state.tutorialActive?`<div class="lesson-box">${mascot()}<div><span>芽芽的小课堂</span><p>${html(b.level.lesson)}</p></div></div>`:''}
  ${(b.introductions?.length||b.pendingTopics?.length)?`<div class="pending-banner"><span>通关礼物：${(b.introductions.length+(b.pendingTopics?.length||0))} 张新卡等你领取</span>${btn('claim-cards','领取新卡','primary')}</div>`:''}
  <section class="proof-arena" aria-label="证明区域">${b.goals.length>1?`<div class="branch-tabs" aria-label="证明分支">${b.goals.map((goal,i)=>`<button class="${i===0?'active':''}" data-action="inspect-branch" data-branch="${i}"><small>${i===0?'正在证明':'等待证明 · 点击查看'}</small><b>${esc(branchTitle(goal,i))}</b></button>`).join('')}</div>`:''}${branchNote(g)?`<p class="branch-guide">${esc(branchNote(g))}</p>`:''}
  <div class="hypotheses"><div class="hypotheses-label">${icon('book')} 已知条件 <span>${g?.hypotheses.length||0}</span></div>${g?.hypotheses.length?g.hypotheses.map(h=>`<button class="hypothesis ${armed&&repo.targets.some(t=>t.id===h.name)?'spell-target':''}" data-action="pick-target" data-target="${esc(h.name)}" ${!armed||!repo.targets.some(t=>t.id===h.name)||disabled?'disabled':''}><code>${html(h.name.includes('._@.')?h.name.split('._@.')[0]+'✝':h.name)}</code><span>${html(h.type)}</span></button>`).join(''):'<p class="no-hypotheses">这一步不需要额外假设。</p>'}</div>
  <div class="arena-top"><span>${icon('flag')} 当前目标</span><span class="goal-count">${b.goals.length?`还剩 ${b.goals.length} 个目标`:'全部完成'}</span>${g?btn('notation','读懂这些符号','notation-button'):''}</div>
  <div class="target-area ${state.busy?'thinking':''}">${g?`<button class="target-pick ${armed?'spell-target':''}" data-action="pick-target" data-target="goal" ${!armed||disabled?'disabled':''}><span class="target-label">需要证明</span><div class="math-target ${g.target.length<30?'short':''}" data-testid="goal">${html(g.target)}</div></button>`:`<div class="proof-complete">${icon('check')}证明完成！<small>每一个分支，都通过了 Lean 验证。</small>${btn((b.introductions?.length||b.pendingTopics?.length)?'claim-cards':'victory',(b.introductions?.length||b.pendingTopics?.length)?'打开通关礼物':'查看通关奖励','primary')}</div>`}${state.busy?'<span class="verifying" role="status"><i></i> Lean 正在检查这一步…</span>':''}</div>
  ${state.error?`<div class="move-error" role="alert"><b>${esc(state.error.explanation?.title||'这张卡还用不上')}</b><p>${esc(state.error.error)}</p>${btn('error-detail','查看 Lean 原始解释','text-button')}${btn('dismiss-error',icon('close'),'icon-button','aria-label="关闭提示"')}</div>`:''}</section>
  ${controls?`<section class="skill-controls" aria-label="技能参数"><div class="control-title">${cardArt(s.skill)}<div><code>${s.skill}</code><h3>${esc(cardById(s.skill)?.name||s.skill)}</h3></div></div>${s.prepared?'<p class="hint-ready">已按提示选好。检查参数后，由你确认这一步。</p>':''}${controls}</section>`:g?'<p class="select-prompt">← 点左侧技能卡，选择这一步的操作。</p>':''}
  <div class="battle-tools">${btn('undo',`${icon('undo')} 撤销`,'tool-button',!b.attempt.steps.length||state.busy?'disabled':'')}${btn('restart',`${icon('refresh')} 重来`,'tool-button',state.busy?'disabled':'')}${btn('hint',`${icon('light')} 提示 <small>${resourceCount(b.progress.economy,'hints')}</small>`,'tool-button',disabled?'disabled':'')}${btn('answer',`📜 答案 <small>${b.attempt.answerUnlocked?'已打开':resourceCount(b.progress.economy,'answers')}</small>`,'tool-button',disabled?'disabled':'')}${btn('source',`${icon('code')} 证明`,'tool-button')}</div>
  <details class="proof-history"><summary>证明足迹 · ${b.proof.length} 步</summary>${b.proof.length?`<ol>${b.proof.map(code=>`<li><code>${html(code)}</code></li>`).join('')}</ol>`:'<p>点一张技能卡，留下第一个脚印。</p>'}</details></main></div>${armed?'<div class="wizard-guide">'+wizard(b.progress.economy?.growth.level)+'<span>点选发光命题</span></div>':''}</div>`;
}
