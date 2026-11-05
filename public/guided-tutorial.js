import {escapeHTML as esc} from './ui.js';
import {wizard} from './spell-flow.js';
import {wheelEntries,wheelIndex} from './card-wheel.js';

const REVEAL_DELAY=750;

export const offersTutorial=state=>state.page==='battle'&&['n01','n02','n03'].includes(state.battle?.level.id)&&!state.battle.complete&&state.story==null;

export function tutorialStep(state,s,modalClass=''){
  const b=state.battle,id=b?.level.id;
  if(!offersTutorial(state)||!state.tutorialActive)return null;
  const step=(key,selector,title,text)=>({key:id+'-'+key,selector,title,text});
  if(state.busy)return step('waiting',null,'Lean 正在核验','刚才的点击已经写成了一步证明。等它检查完，芽芽带你继续。');
  if(b.introductions?.length||b.pendingTopics?.length){
    if(modalClass.includes('unlock-modal'))return step('reward','[data-action="reveal-card"]','先认识新伙伴','这是上一关证明换来的知识卡。点开它，看看接下来能做什么。');
    if(modalClass.includes('reward-guide'))return step('learn','[data-action="learn-card"]','把规则收入卡册','收好这张卡，才能在后面的证明中亲自使用。');
    if(modalClass.includes('topic-celebration'))return step('topic','[data-action="learn-topic"]','一个新概念','先读一读这个概念，再把规则带进下一步证明。');
    return step('gift','[data-action="claim-cards"]','先领取上一关的礼物','这关要用到新知识。点这里，领完卡片后我们再开始。');
  }
  if(b.proof.length&&b.goals?.[0]){
    const equality=/^(.+) = (.+)$/s.exec(b.goals[0].target);
    if(!equality||equality[1]!==equality[2])return modalClass.includes('restart-modal')?step('restart-confirm','[data-action="restart-now"]','从本关起点练习','这只重新开始当前证明，已经获得的星星和卡片会保留。'):step('restart','[data-action="restart"]','接回教学的起点','这份旧证明走了另一条路线。点重来当前关，芽芽带你重新走一遍完整的操作。');
  }
  if(id==='n01'||b.proof.length)return step('rfl','[data-skill="rfl"]',id==='n01'?'第一课 · 相同就能收尾':'最后一步 · 亲手收尾',id==='n01'?'你看，目标是 0 = 0，两边完全一样。点 rfl，让 Lean 确认这个最小的证明。':'现在等号两边已经一样了。rw 只负责改写，不替你结束；点 rfl，为证明盖上最后一枚印章。');
  if(s.skill!=='rw')return step('rw','[data-skill="rw"]','先找一条等式',id==='n02'?'已知 h 告诉我们 a = b。rw 能用这份凭据替换目标里的 a。先点左侧 rw。':'1 为什么等于 succ 0？要用数字 1 的定义。先点 rw，寻找这张定义卡。');
  const kind=id==='n02'?'hypothesis':'definition',repo=b.repository,expected=repo.entries.find(e=>id==='n02'?e.term==='h':e.cardId==='one_eq_succ_zero');
  if(modalClass.includes('evidence-modal')){
    if(!s.categoryChosen||s.category!==kind)return step('category',`[data-action="evidence-category"][data-kind="${kind}"]`,'抽卡之前 · 切换证据类别','四类证据分别是：定理（已经证明的结论）、公理（基本规则）、定义（符号的含义）、已知命题（这道题给出的条件）。当前默认打开「定理」。'+(id==='n02'?'这次要用题目给出的 h：a = b，请点上方「已知命题」切换卡组，再抽卡。':'这次要用数字 1 的含义，请点上方「定义」切换卡组，再寻找 one_eq_succ_zero。'));
    const entries=wheelEntries(repo,s),entry=entries[wheelIndex(entries,s)];
    if(entry?.id!==expected?.id)return step('wheel','.wheel-window','让证据停在正中',`上下拨动滚轮，找到「${expected?.name||'所需证据'}」。中央放大的卡，才是即将抽出的卡。`);
    return step('draw','[data-action="draw-focused"]','抽出中央的证据',id==='n02'?'正中这张 h：a = b，就是替换的理由。点「抽出」，再决定怎样使用。':'正中这张定义告诉我们 1 = succ 0。先抽出它，接下来试试把卡片翻过来使用。');
  }
  if(s.entry!==expected?.id)return step('open','[data-action="open-evidence"]','打开证据卡组','这一步需要正确的等式作凭据。打开卡组，我们一起找到它。');
  if(s.phase==='target')return step('target','[data-action="pick-target"][data-target="goal"]','把魔法送到目标上',id==='n02'?'我们要把目标里的 a 换成 b。点发光的目标框；已有条件 h 是证据来源，不是这次的作用位置。':'现在用反面的 succ 0 → 1，把目标右边的 succ 0 换回 1。点发光的目标框，看看它变成 1 = 1。');
  if(!modalClass.includes('preparation-modal'))return step('prepare','[data-action="prepare-spell"]','准备好这张卡','点这里打开翻卡舞台，检查方向后再施法。');
  const direction=id==='n03'?'backward':'forward';
  if(s.direction!==direction)return id==='n03'?step('backward','[data-action="flip-card"][data-direction="backward"]','翻到反面 · 试试反向规则','正面是 1 → succ 0，反面就是 succ 0 → 1。点「反向」翻过这张卡；等式也可以倒过来用，这次我们把目标右边换回 1。'):step('forward','[data-action="flip-card"][data-direction="forward"]','先恢复正向','这一步要把等号左边换成右边。把卡翻回正面，使用正向规则。');
  if(s.mode!=='all')return step('mode','[data-action="rewrite-mode"]','使用全部代换','这道入门题先使用全部代换。以后可以改为指定位置，处理更复杂的等式。');
  return step('arm','[data-action="arm-spell"]','确认方向，举起魔杖',id==='n02'?'正面表示 a → b，默认全部代换。现在只完成了准备；点确认后，还要亲手指出要改写的命题。':'卡片反面表示 succ 0 → 1，和正面的方向相反。确认这张反向定义卡，然后亲手选择目标，看看反向改写的效果。');
}

export function installTutorial(getState,getSelection,onExit){
  const root=document.createElement('div');root.id='guided-tutorial';document.body.append(root);
  const helper=document.createElement('div');helper.id='tutorial-helper';document.body.append(helper);
  const exitRoot=document.createElement('div');exitRoot.id='tutorial-exit';document.body.append(exitRoot);
  let current=null,lastKey='',queued=false,lesson='',readyAt=0,revealTimer,stepReadyAt=0,stepTimer,leavingFor='',exitOpen=false,exitReturnFocus;
  function closeExit(){
    exitOpen=false;exitRoot.replaceChildren();document.body.classList.remove('tutorial-exit-open');
    if(exitReturnFocus?.isConnected)exitReturnFocus.focus({preventScroll:true});
    schedule();
  }
  function askToExit(){
    if(exitOpen)return;exitOpen=true;exitReturnFocus=document.activeElement;
    exitRoot.innerHTML=`<div class="tutorial-exit-backdrop"><section class="tutorial-exit-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorial-exit-title" aria-describedby="tutorial-exit-description"><span class="tutorial-exit-avatar" aria-hidden="true">${wizard()}</span><div><small>芽芽轻轻问你</small><h2 id="tutorial-exit-title">是否要结束教程？</h2><p id="tutorial-exit-description">先自己试试也很好。需要帮忙时，再点我就好啦。</p><div class="tutorial-exit-actions"><button class="primary" data-tutorial-exit="confirm">确认结束</button><button class="secondary" data-tutorial-exit="cancel">继续教程</button></div></div></section></div>`;
    document.body.classList.add('tutorial-exit-open');exitRoot.querySelector('[data-tutorial-exit="cancel"]').focus({preventScroll:true});
  }
  function fadeToStep(key=''){
    root.classList.add('is-leaving');root.classList.remove('is-visible');
    leavingFor=key;stepReadyAt=performance.now()+REVEAL_DELAY;
    clearTimeout(stepTimer);stepTimer=setTimeout(schedule,REVEAL_DELAY+10);
  }
  function update(){
    const state=getState(),modal=document.querySelector('#overlay .modal'),plan=tutorialStep(state,getSelection(),modal?.className||'');current=plan;
    const offer=offersTutorial(state)&&!state.tutorialActive&&!state.busy&&!modal;
    if(offer&&!helper.childElementCount)helper.innerHTML=`<button class="tutorial-help-button" data-action="tutorial-start" aria-label="不会就点我，开启本关教程"><span class="tutorial-help-avatar" aria-hidden="true">${wizard()}</span><span class="tutorial-help-bubble"><small>芽芽在这里</small><b>不会就点我</b><span aria-hidden="true">✦</span></span></button>`;
    else if(!offer&&helper.childElementCount)helper.replaceChildren();
    document.body.classList.toggle('tutorial-available',offer);
    if(!plan){if(exitOpen)closeExit();clearTimeout(revealTimer);clearTimeout(stepTimer);root.replaceChildren();root.classList.remove('is-visible','is-leaving');delete root.dataset.step;lastKey='';lesson='';stepReadyAt=0;leavingFor='';document.body.classList.remove('guided-lesson');document.body.style.removeProperty('--tutorial-space');return;}
    if(exitOpen)return;
    if(lesson!==state.battle.level.id){
      lesson=state.battle.level.id;readyAt=performance.now()+REVEAL_DELAY;lastKey='';root.classList.remove('is-visible');root.replaceChildren();delete root.dataset.step;
      clearTimeout(revealTimer);revealTimer=setTimeout(schedule,REVEAL_DELAY);
    }
    // Let the player read the newly arrived question before the spotlight fades in.
    if(performance.now()<readyAt)return;
    document.body.classList.add('guided-lesson');
    // Every teaching click fades the old spotlight out before revealing the next one.
    if(performance.now()<stepReadyAt)return;
    if(root.dataset.step&&root.dataset.step!==plan.key&&leavingFor!=='*'&&leavingFor!==plan.key){fadeToStep(plan.key);return;}
    root.classList.remove('is-leaving');
    if(!root.classList.contains('is-visible'))requestAnimationFrame(()=>{if(current&&performance.now()>=Math.max(readyAt,stepReadyAt))root.classList.add('is-visible');});
    const target=plan.selector?document.querySelector(plan.selector):null;
    if(plan.selector&&!target){root.replaceChildren();lastKey='';return;}
    const speechTop=root.querySelector('.tutorial-speech')?.getBoundingClientRect().top??innerHeight-170;
    const goal=document.querySelector('.math-target');
    if(!state.busy&&!document.querySelector('#overlay .modal')&&goal){
      const bounds=goal.getBoundingClientRect();
      if(bounds.bottom>speechTop-16)window.scrollBy({top:bounds.bottom-speechTop+16,behavior:'instant'});
    }
    let r=target?.getBoundingClientRect();
    if(r&&(r.bottom>speechTop-12||r.top<6)){target.scrollIntoView({block:'center',behavior:'instant'});r=target.getBoundingClientRect();}
    const pad=7,x=r?Math.max(0,r.left-pad):0,y=r?Math.max(0,r.top-pad):0,w=r?Math.min(innerWidth-x,r.width+2*pad):0,h=r?Math.min(innerHeight-y,r.height+2*pad):0;
    const key=plan.key+plan.text+[x,y,w,h,innerWidth,innerHeight].map(Math.round).join(',');if(key===lastKey)return;lastKey=key;
    const shade=(left,top,width,height)=>`<div class="tutorial-shade" style="left:${left}px;top:${top}px;width:${Math.max(0,width)}px;height:${Math.max(0,height)}px"></div>`;
    root.innerHTML=(r?shade(0,0,innerWidth,y)+shade(0,y,x,h)+shade(x+w,y,innerWidth-x-w,h)+shade(0,y+h,innerWidth,innerHeight-y-h):shade(0,0,innerWidth,innerHeight))+(r?`<div class="tutorial-spotlight" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`:'')+`<aside class="tutorial-speech" role="status" aria-live="polite"><div class="tutorial-avatar">${wizard()}</div><div><small>芽芽带你做 · 第 ${state.battle.level.number} 课</small><b>${esc(plan.title)}</b><p>${esc(plan.text)}</p></div></aside>`;
    root.dataset.step=plan.key;
    leavingFor=plan.key;
    const height=root.querySelector('.tutorial-speech').getBoundingClientRect().height;
    const space=Math.ceil(height+24)+'px';
    if(document.body.style.getPropertyValue('--tutorial-space')!==space){document.body.style.setProperty('--tutorial-space',space);schedule();}
    if(target&&!target.contains(document.activeElement))target.focus({preventScroll:true});
  }
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;update();});};
  function allowed(target){return !!target.closest?.('#fullscreen-toggle')||(!exitOpen&&(!current||!!(performance.now()>=Math.max(readyAt,stepReadyAt)&&current.selector&&target.closest?.(current.selector))));}
  function exitChoice(choice){
    closeExit();if(choice==='confirm'){onExit();update();helper.querySelector('button')?.focus({preventScroll:true});}
  }
  document.addEventListener('click',event=>{
    update();
    if(exitOpen&&!event.target.closest?.('#fullscreen-toggle')){event.preventDefault();event.stopImmediatePropagation();const choice=event.target.closest?.('[data-tutorial-exit]')?.dataset.tutorialExit;if(choice)exitChoice(choice);return;}
    if(!allowed(event.target)){
      event.preventDefault();event.stopImmediatePropagation();
      const blank=event.target.closest?.('.tutorial-shade')||!event.target.closest?.('button,a,input,select,textarea,summary,[role="button"],.tutorial-speech,.wheel-window');
      if(blank)askToExit();return;
    }
    if(current&&root.childElementCount&&!event.target.closest?.('#fullscreen-toggle')){
      fadeToStep('*');
    }
  },true);
  document.addEventListener('keydown',event=>{
    if(!current)return;
    if(exitOpen){
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeExit();}
      else if(event.key==='Tab'){const nodes=[...exitRoot.querySelectorAll('button'),document.querySelector('#fullscreen-toggle')].filter(Boolean);event.preventDefault();event.stopImmediatePropagation();const i=nodes.indexOf(document.activeElement);nodes[(i+(event.shiftKey?-1:1)+nodes.length)%nodes.length]?.focus({preventScroll:true});}
      return;
    }
    if(event.key==='Escape'){if(document.fullscreenElement)return;event.preventDefault();event.stopImmediatePropagation();askToExit();}
    if(event.key==='Tab'){const nodes=[...(current.selector?document.querySelectorAll(current.selector):[]),document.querySelector('#fullscreen-toggle')].filter(n=>n&&!n.disabled);event.preventDefault();const i=nodes.indexOf(document.activeElement),next=nodes[(i+(event.shiftKey?-1:1)+nodes.length)%nodes.length];next?.focus({preventScroll:true});}
    else if(!allowed(event.target)&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  const observer=new MutationObserver(schedule);for(const id of ['app','overlay'])observer.observe(document.getElementById(id),{childList:true,subtree:true});
  window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);
  return {update:schedule,allowed};
}
