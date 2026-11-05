import {escapeHTML as esc,icon} from './ui.js';
import {cardArt} from './card-art.js';
export const evidenceKinds=[['theorem','定理'],['axiom','公理'],['definition','定义'],['hypothesis','已知命题']];
export function wheelEntries(repo,selection){return repo.entries.filter(e=>e.kind===selection.category);}
export function wheelIndex(entries,selection){return Math.max(0,Math.min(entries.length-1,selection.drawIndices?.[selection.category]||0));}
export function wheelSlots(entries,index){return entries.slice(Math.max(0,index-2),index+3).map(entry=>({entry,index:entries.indexOf(entry),offset:entries.indexOf(entry)-index}));}
const transform=offset=>`translate(-50%,calc(-50% + ${offset} * var(--wheel-gap))) scale(${[1,.81,.63][Math.abs(offset)]||.5}) rotateX(${-offset*10}deg)`;
export function wheelCards(entries,index){return wheelSlots(entries,index).map(({entry,index:i,offset})=>`<button class="wheel-card kind-${entry.kind} ${offset===0?'is-centered':''}" data-action="wheel-card" data-index="${i}" data-entry="${entry.id}" data-offset="${offset}" tabindex="${offset===0?0:-1}" aria-label="${offset===0?'抽取':'转到'} ${esc(entry.name)}" style="--offset:${offset};--depth:${3-Math.abs(offset)};transform:${transform(offset)}">${entry.cardId?cardArt(entry.cardId):'<span class="wheel-leaf">❧</span>'}<span class="wheel-copy"><b>${esc(entry.name)}</b><code>${esc(entry.term.replaceAll('Nat.succ','succ'))}</code><span class="wheel-formula">${esc(entry.formula.replaceAll('Nat.succ','succ'))}</span></span></button>`).join('');}
export function repositoryView(repo,s,btn){
  const entries=wheelEntries(repo,s),index=wheelIndex(entries,s),entry=entries[index];
  return `<div class="wheel-heading"><small>${s.skill} · 抽卡阶段</small><h2>转动知识轮盘</h2><p>拨动卡轮，让需要的证据停在中央。</p></div><div class="draw-categories" role="tablist" aria-label="证据类别">${evidenceKinds.map(([kind,name])=>btn('evidence-category',name+`<small>${repo.entries.filter(e=>e.kind===kind).length}</small>`,'draw-category kind-'+kind+(s.category===kind?' selected':''),`data-kind="${kind}" role="tab" aria-selected="${s.category===kind}"`)).join('')}</div><div class="knowledge-drum kind-${s.category}"><div class="drum-rim" aria-hidden="true"></div><div class="drum-notch" aria-hidden="true">◆</div><div class="wheel-window" tabindex="0" role="group" aria-label="卡片滚轮，上下滑动或按方向键切换">${wheelCards(entries,index)}${entries.length?'':'<div class="wheel-empty">⊘<p>这一类还没有可用的卡片</p><small>选择上方其它类别继续寻找</small></div>'}</div><div class="wheel-navigation">${btn('wheel-step',icon('up'),'wheel-arrow','data-delta="-1" aria-label="上一张" '+(index===0?'disabled':''))}<span class="wheel-count" aria-live="polite">${entry?index+1:0} / ${entries.length}</span>${btn('wheel-step',icon('arrow'),'wheel-arrow next','data-delta="1" aria-label="下一张" '+(index>=entries.length-1?'disabled':''))}</div></div><div class="wheel-detail">${entry?'<b>'+esc(entry.name)+'</b><p>'+esc(entry.formula.replaceAll('Nat.succ','succ'))+'</p>':'选择已解锁的知识；尚未发现的卡片不会出现。'}</div>${btn('draw-focused','抽出中央这张卡 ✦','primary wide draw-focused',entry?'':'disabled')}<small class="wheel-help">滚轮 · 上下滑动 · ↑ ↓　均可拨动</small>`;
}
export function updateWheel(container,entries,index,delta,motion){
  const window=container.querySelector('.wheel-window');window.innerHTML=wheelCards(entries,index);
  const entry=entries[index];container.querySelector('.wheel-count').textContent=`${index+1} / ${entries.length}`;
  container.querySelector('.wheel-detail').innerHTML='<b>'+esc(entry.name)+'</b><p>'+esc(entry.formula.replaceAll('Nat.succ','succ'))+'</p>';
  for(const button of container.querySelectorAll('[data-action="wheel-step"]'))button.disabled=Number(button.dataset.delta)<0?index===0:index===entries.length-1;
  if(motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    for(const card of window.querySelectorAll('.wheel-card')){const offset=Number(card.dataset.offset);card.animate([{transform:transform(offset+delta),opacity:Math.abs(offset+delta)>2?0:.6},{transform:transform(offset),opacity:1}],{duration:260,easing:'cubic-bezier(.15,.85,.25,1)'});}
    container.querySelector('.drum-rim').animate([{transform:'rotate(0deg)'},{transform:`rotate(${delta*36}deg)`}],{duration:270,easing:'cubic-bezier(.2,.8,.3,1)'});
  }
}
