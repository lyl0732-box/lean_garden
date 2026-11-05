import {escapeHTML as esc,icon} from './ui.js';
import {cardArt} from './card-art.js';
import {evolvedMascot,evolution} from './yaya-forms.js';
import {wandArt,wands} from './wands.js';
const pretty=text=>String(text||'').replaceAll('Nat.succ','succ');

export function reversedFormula(formula){
  // Flip the displayed outer equality, preserving any quantified prefix.
  const text=pretty(formula);if(text.includes('\n'))return text.split('\n').map(reversedFormula).join('\n');let depth=0,cut=0;
  for(let i=0;i<text.length;i++){if('([{⟨'.includes(text[i]))depth++;if(')]}⟩'.includes(text[i]))depth--;if(depth===0&&[',','→'].includes(text[i]))cut=i+1;}
  depth=0;
  for(let i=0;i<text.length;i++){
    if('([{⟨'.includes(text[i]))depth++;
    if(')]}⟩'.includes(text[i]))depth--;
    if(i>=cut&&depth===0&&((text[i]==='='&&!['<','>','!','=',':'].includes(text[i-1])&&text[i+1]!=='=')||text[i]==='↔')){
      return text.slice(0,cut)+(cut?' ':'')+text.slice(i+1).trim()+' '+text[i]+' '+text.slice(cut,i).trim();
    }
  }
  return text;
}
export function evidenceCard(entry,back=false){const formula=back?reversedFormula(entry.formula):pretty(entry.formula);return `<div class="ritual-card kind-${entry.kind} ${back?'dark-side':''}">${entry.cardId?cardArt(entry.cardId):'<div class="hypothesis-art">❧</div>'}<span class="ritual-kind">${({hypothesis:'已有命题',definition:'定义',theorem:'定理',axiom:'公理'})[entry.kind]}</span><h3>${esc(entry.name)}</h3><code>${esc(pretty(entry.term))}</code><p class="ritual-formula">${esc(formula)}</p></div>`;}
export function spellControls(s,repo,btn,disabled){
  const entry=repo.entries.find(e=>e.id===s.entry),step=s.phase==='target'?2:entry?1:0;
  const path=`<ol class="ritual-steps" aria-label="施法步骤">${['抽卡','翻转','作用'].map((name,i)=>'<li class="'+(step===i?'active':step>i?'done':'')+'"><span>'+(i+1)+'</span>'+name+'</li>').join('')}</ol>`;
  if(!entry)return path+'<p class="control-help">从定理、公理、定义、已知命题四类卡组中，抽取一张证据卡。</p>'+btn('open-evidence','抽取证据卡 '+icon('arrow'),'primary wide',disabled?'disabled':'');
  if(s.phase==='target')return path+`<div class="armed-summary"><b>${esc(entry.name)} · ${s.skill==='rw'?(s.mode==='code'?'精细代码':s.direction==='backward'?'反向':'正向'):'应用'}</b>${s.mode==='code'?'<pre class="proof-source">'+esc(s.code)+'</pre>':''}<p>芽芽已准备好。点击发光的目标或已知命题，释放魔法。</p>${btn('prepare-spell','调整卡片','secondary')}${btn('cancel-spell','收回魔杖','text-button')}</div>`;
  const positions=`<fieldset class="occurrence-list occurrence-grid"><legend>选择第几处 · 可多选</legend><div>${Array.from({length:10},(_,i)=>i+1).map(n=>`<label class="${s.occurrences.includes(n)?'selected':''}"><input type="checkbox" data-occurrence="${n}" aria-label="第 ${n} 处" ${s.occurrences.includes(n)?'checked':''}><span>${n}</span></label>`).join('')}</div><p class="control-help">编号超过匹配次数时，Lean 会拒绝这一步。</p></fieldset>`;
  return path+`<div class="ritual-card-space"><div class="ritual-flipper ${s.direction==='backward'?'flipped':''}"><div class="ritual-face front">${evidenceCard(entry)}</div><div class="ritual-face back">${evidenceCard(entry,true)}</div></div></div>`+(s.skill==='rw'?`<div class="flip-slider" role="group" aria-label="卡片方向"><svg viewBox="0 0 280 55" aria-hidden="true"><path d="M 24 20 Q 140 69 256 20"/></svg><div class="flip-knob ${s.direction==='backward'?'backward':''}" aria-hidden="true">↻</div><button data-action="flip-card" data-direction="forward" aria-pressed="${s.direction==='forward'}">正向</button><button data-action="flip-card" data-direction="backward" aria-pressed="${s.direction==='backward'}">反向</button></div><button class="replacement-mode" data-action="rewrite-mode" aria-label="切换改写方式">${s.mode==='code'?'精细代码修改':s.mode==='nth'?'指定位置 · '+s.occurrences.join('、'):'全部代换'} <span>↻</span></button>${s.mode==='nth'?positions:s.mode==='code'?`<label class="rewrite-code-field"><span>编辑当前卡片的 Lean 改写</span><textarea data-rewrite-code maxlength="600" spellcheck="false" autocomplete="off" aria-label="Lean 改写代码">${esc(s.code)}</textarea><small>可用 rw [规则 参数]、nth_rewrite 2 [规则]，或 repeat' rw [规则]；末尾可加 at 命题名。只使用当前这张卡和已有变量。</small></label>`:''}`:'<p class="control-help">apply 使用这张证据的结论。确认后，点选它要作用的命题。</p>')+btn('arm-spell','确认 · 举起魔杖','primary wide',disabled||(s.skill==='rw'&&s.mode==='nth'&&!s.occurrences.length)?'disabled':'')+btn('open-evidence','重新抽卡','text-button wide');
}
export function wizard(level=1){const f=evolution(level),w=wands[f.stage];return `<div class="evolved-wizard wand-wizard" data-evolution="${f.stage+1}" style="--spell-power:${1+f.stage*.16};--wand-color:${w.color};--wand-glow:${w.glow}px">${evolvedMascot(level)}<div class="evolved-wand" data-wand="${w.name}" aria-hidden="true">${wandArt(level)}<i class="wand-tip"></i></div></div>`;}
