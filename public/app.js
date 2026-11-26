import { icon, mascot, escapeHTML as esc } from './ui.js';
import { music, musicCredit, musicTracks } from './music.js';
import { cardArt } from './card-art.js';
import { battleView, newSelection, pretty } from './battle.js';
import { guideFor } from './card-guides.js';
import {homeView,gardenView,kinds,topics,transitionStart,transitionEnd} from './world-v11.js';
import {rewardSound,wheelSound,flipSound} from './sfx.js';
import {repositoryView,wheelEntries,wheelIndex,updateWheel} from './card-wheel.js';
import {spellControls,wizard} from './spell-flow.js';
import {installTutorial} from './guided-tutorial.js';
import {installFullscreen} from './fullscreen.js';
import {scenery,ultimateEmblem,loadingView} from './scenery.js';
import {spellCast,damageEffect,drawEvidence} from './effects.js';
import {prologueView} from './onboarding.js';
import {branchTitle,symbolGuide} from './learning.js';
import {parseRoute,routeFor} from './routes.js';
import {readQuality,saveQuality,qualityChoices} from './quality.js';
import {energyPill,energyView,shopView,evolvedMascot,evolution} from './economy-v011.js';
import {diamondPill,formatTime,gem,resourceCount,diamondProducts} from './shop.js';
import {growthView} from './yaya-forms.js';
import {questionView,resultView} from './garden-quiz.js';
import {installPresence} from './presence.js';
import {authorLinks,checkinView,checkinRewardLabel,rewriteEditorSource} from './plan9.js';
import {checkWebUpdate,GAME_VERSION} from './update-check.js';


const $=selector=>document.querySelector(selector);
const app=$('#app'),overlay=$('#overlay');
const state={page:'home',chapter:'n',data:null,battle:null,busy:false,health:null,filter:'all',knownOnly:false,sound:localStorage.getItem('garden-sound')!=='off',motion:localStorage.getItem('garden-motion')!=='off',error:null};
installPresence(account=>{if(state.data&&account&&state.data.account?.role!==account.role){state.data.account=account;void api('economy').then(()=>render()).catch(()=>{});}});
let audioContext,toastTimer,modalReturnFocus;
let selection=newSelection(), revealing=false, hintSuggestion=null;
state.story=null;let afterStory=null;
installFullscreen(toast);
const guided=installTutorial(()=>state,()=>selection,()=>{state.tutorialActive=false;render();});
let observedHash=location.hash,pendingNavigation=null;
history.scrollRestoration='manual';
const cardById=id=>state.data.cards.find(c=>c.id===id);
const chapterById=id=>state.data.chapters.find(c=>c.id===id);
const completed=()=>Object.keys(state.data.progress.completed).filter(id=>!id.startsWith('m')).length;
const campaign=()=>state.data.levels.filter(l=>l.chapter!=='m');
const nextLevel=()=>{const levels=campaign(),last=levels.find(l=>l.id===state.data.progress.lastLevel),index=levels.indexOf(last),needsEarlierProof=levels.slice(0,index).some(l=>l.result?.needsReproof);return last?.open&&!last.result&&!needsEarlierProof?last:levels.find(l=>l.open&&(!l.result||l.result.needsReproof))||levels[0];};
const btn=(action,text,cls='secondary',extra='')=>`<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
const stars=(n=0)=>`<span class="stars" aria-label="${n} 颗星">${[1,2,3].map(i=>icon('star',i<=n?'lit':'')).join('')}</span>`;

async function api(path,body,options={}) {
  if(body?.level)body={...body,practice:!!state.data?.progress.freePlay};
  const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,...options});
  const data=await response.json();
  if(!response.ok){if(data.code==='AUTH_REQUIRED')location.reload();throw Object.assign(new Error(data.error||'本机服务暂时没有响应。'),{status:response.status,code:data.code});}
  if(data.garden&&state.data)state.data.garden=data.garden;
  if(data.economy)syncEconomy(data.economy);
  if(data.progress?.economy)state.economyReceivedAt=Date.now();
  return data;
}
function syncEconomy(e){if(state.data)state.data.progress.economy=e;if(state.battle)state.battle.progress.economy=e;state.economyReceivedAt=Date.now();}
function currentEconomy(){
  const e=state.data?.progress.economy;if(!e)return null;
  const elapsed=Math.max(0,Date.now()-(state.economyReceivedAt||Date.now()));
  const recovered=e.energy===50?0:Math.max(0,1+Math.floor((elapsed-e.nextIn)/e.interval));
  const energy=Math.min(50,e.energy+recovered);
  return {...e,energy,nextIn:energy===50?0:Math.max(0,e.nextIn+recovered*e.interval-elapsed),freeplayRemainingMs:e.unlimited?Number.MAX_SAFE_INTEGER:Math.max(0,e.freeplayRemainingMs-(e.freeplayActive?elapsed:0))};
}
function showCheckin(){modal(checkinView(currentEconomy().checkin,btn),'checkin-modal');}
async function collectCheckin(){if(walletBusy)return;walletBusy=true;try{const r=await api('checkin/claim',{});render();showCheckin();if(!r.duplicate){rewardSound(state.sound);toast('签到成功：'+checkinRewardLabel(r.reward));}}catch(e){toast(e.message);}finally{walletBusy=false;}}
let expiringFreeplay=false;
async function enforceFreeplayExpiry(){
  const e=currentEconomy();if(!state.data?.progress.freePlay||!e||e.unlimited||e.freeplayActive&&e.freeplayRemainingMs>0||expiringFreeplay||state.busy)return;
  expiringFreeplay=true;state.busy=true;++navigationVersion;
  try{state.data=await api('progress/freeplay',{enabled:false});state.battle=null;state.tutorialActive=false;state.page='adventure';selection=newSelection();hintSuggestion=null;closeModal();commitLocation('replace');toast('自由选关时间已到，已回到冒险地图。练习记录已保留。');}
  catch(e){toast(e.message);}finally{state.busy=false;expiringFreeplay=false;render();}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void enforceFreeplayExpiry();});
async function showShop(){return navigate('shop');}
function shop(){return shopView(currentEconomy(),state.data.shop,btn,state.shopFilter||'all');}
async function showEnergy(){const r=await api('economy');state.data.shop=r.shop;modal(energyView(currentEconomy(),btn),'energy-modal');}
function showGrowth(){modal(growthView(currentEconomy(),false)+(state.data.pendingCards?.length||state.data.pendingTopics?.length?btn('claim-cards','✦ 领取通关礼物','primary wide'):'')+btn('close-modal','继续冒险','secondary wide'),'growth-modal');}
let walletBusy=false;
async function walletAction(path,body,view='shop'){
  if(walletBusy)return;walletBusy=true;
  try{await api(path,body);render();if(view==='energy')await showEnergy();else await showShop();}catch(error){toast(error.message);}finally{walletBusy=false;}
}
function confirmRedemption(product){
  const p=diamondProducts(state.data.shop).find(p=>p.id===product);if(!p)return;
  const e=currentEconomy();
  if(e.diamonds<p.priceDiamonds){modal('<h2>还差一点点星光</h2><p>这份补给需要 '+p.priceDiamonds+' 钻石，你现在有 '+e.diamonds+' 钻石。</p><p>通过花园问答和签到可以获得钻石。</p>'+btn('nav','去禅净花园','primary wide','data-page="garden"')+btn('close-modal','回小铺逛逛','text-button'),'purchase-modal');return;}
  const key=Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
  modal('<h2>'+esc(p.name)+'</h2><p>'+esc(p.description)+'</p><p class="shop-price">'+gem()+p.priceDiamonds+' 钻石</p>'+btn('redeem-now','确认用钻石兑换','primary wide','data-product="'+p.id+'" data-key="'+key+'"')+btn('close-modal','再想一想','text-button'),'purchase-modal');
}
async function openQuiz(id){const r=await api('garden/quiz?id='+encodeURIComponent(id));modal(questionView(r.question,cardById(r.question.cardId),btn),'quiz-modal');}
async function submitQuiz(id){
  if(walletBusy)return;const selected=overlay.querySelector('[data-quiz-choice]:checked');if(!selected)return;walletBusy=true;
  try{const r=await api('garden/answer',{id,choice:Number(selected.value)});render();modal(resultView(r.result,btn),'quiz-modal');}catch(error){toast(error.message);}finally{walletBusy=false;}
}
function confirmExit(logoutOnly=false){modal('<span class="large-card-icon">'+icon('power')+'</span><h2>'+(logoutOnly?'退出当前账号？':'离开花园休息一会儿？')+'</h2><p>冒险进度和背包已经保存，正在使用的选关计时会暂停。</p>'+btn(logoutOnly?'logout-now':'exit-now',logoutOnly?'退出账号':'保存并退出','primary wide')+btn('close-modal','再陪芽芽一会儿','text-button'),'exit-modal');}
async function leaveGame(quit){await api('auth/logout',{});if(globalThis.gardenWindow||/LeanGarden\//.test(navigator.userAgent)){location.href=quit?'leangarden://exit':'leangarden://connection';setTimeout(()=>location.reload(),1500);}else location.reload();}
async function showAnswer(){
  if(state.busy)return;
  if(!state.battle.attempt.answerUnlocked){const e=currentEconomy();modal(`<h2>打开本局参考答案？</h2><p>消耗 1 张答案包，可以反复查看本局完整证明。仍需亲手出招，本局最高一颗星。</p><p>当前有 <b>${resourceCount(e,'answers')}</b> 张答案包。</p>${e.answers?btn('answer-now','消耗 1 张 · 查看完整答案','primary wide'):btn('shop','去商城查看答案包','primary wide')}${btn('close-modal','再想一想','text-button')}`,'answer-confirm');return;}
  return revealAnswer();
}
async function revealAnswer(){
  if(state.busy)return;state.busy=true;
  try{const b=state.battle,r=await api('level/answer',{level:b.level.id,revision:b.attempt.revision});b.attempt=r.attempt;hintSuggestion=null;render();modal(`<span class="eyebrow">REFERENCE PROOF</span><h2>这条花径的一种走法</h2><p class="answer-note">每一步都需要你亲手操作。也欢迎找到另一条正确的证明。</p><ol class="answer-steps">${r.solution.map(code=>`<li><pre class="proof-source">${esc(pretty(code))}</pre></li>`).join('')}</ol><p class="subtle">本局再次查看不再消耗答案包；回到起点也可继续查看。</p>${btn('close-modal','我来完成证明','primary wide')}`,'answer-modal');}catch(error){toast(error.message);}finally{state.busy=false;render();}
}
setInterval(()=>{void enforceFreeplayExpiry();const e=currentEconomy();if(!e||document.hidden)return;for(const value of document.querySelectorAll('[data-diamond-value]'))value.textContent=resourceCount(e,'diamonds');for(const time of document.querySelectorAll('[data-freeplay-time]'))time.textContent=formatTime(e.freeplayRemainingMs);const gardenClock=document.querySelector('[data-garden-countdown]');if(gardenClock&&state.data.garden)gardenClock.textContent=formatTime(state.data.garden.nextAt-(e.serverTime+Date.now()-(state.economyReceivedAt||Date.now())));for(const value of document.querySelectorAll('[data-energy-value]'))value.textContent=e.energy;const countdown=document.querySelector('.energy-countdown');if(countdown){const s=Math.ceil(e.nextIn/1000);countdown.textContent=e.energy===50?'活跃度已满，出发吧！':`下 1 点约在 ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} 后恢复`;document.querySelector('.energy-orb b').innerHTML=e.energy+'<small>/50</small>'; }},1000);
setInterval(()=>{if(state.data&&!document.hidden&&!state.busy){const before=JSON.stringify(state.data.garden);void api('economy').then(()=>{if(state.page==='garden'&&!overlay.innerHTML&&before!==JSON.stringify(state.data.garden))render();}).catch(()=>{});}},45000);
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3600);}
function sound(win=false) {
  if(!state.sound)return;
  try {
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume();
    const notes=win?[523.25,659.25,783.99,1046.5]:[523.25,659.25];
    notes.forEach((frequency,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain(),t=audioContext.currentTime+i*.11;o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+.26);});
  }catch{}
}
function nav(){const title={adventure:'冒险花径',mini:'谜题工坊',garden:'禅净花园',shop:'星钻小铺'}[state.page]||'证明花园';return '<header class="room-navigation">'+btn('nav',icon('back')+' 返回主页','room-back','data-page="home"')+'<span>'+title+'</span><small class="room-edition">LEAN GARDEN · v'+GAME_VERSION+'</small></header>';}
function topbar(){return `<header class="topbar room-topbar"><div class="greeting"><span class="desktop-greeting">${icon('sun')} 今天也适合种下一个新想法</span></div><div class="top-tools"><div class="room-resources" role="group" aria-label="冒险资源">${energyPill(currentEconomy())}${diamondPill(currentEconomy())}<span class="stat-pill gold" title="收集的星星">${icon('star')}<b>${state.data.progress.stars}</b></span><span class="stat-pill" title="已解锁的技能与定理">${icon('leaf')}<b>${state.data.progress.unlocked.length}</b></span></div><div class="room-actions" role="group" aria-label="声音与设置">${btn('music',`♫`,'icon-button music-button',`aria-label="${music.enabled?'关闭':'开启'}背景音乐" aria-pressed="${music.enabled}"`)}${btn('sound',icon(state.sound?'sound':'mute'),'icon-button',`aria-label="${state.sound?'关闭':'开启'}音效"`)}${btn('settings',icon('settings'),'icon-button','aria-label="设置"')}</div></div></header>`;}
function home(){return homeView({...state,data:{...state.data,progress:{...state.data.progress,economy:currentEconomy()}},musicEnabled:music.enabled},btn,nextLevel());}
function adventure(){const c=chapterById(state.chapter),ls=campaign().filter(l=>l.chapter===c.id),count=ls.filter(l=>l.result).length;const xs=[14,38,62,86],points=ls.map((l,i)=>({x:xs[Math.floor(i/4)%2?3-i%4:i%4],y:76+Math.floor(i/4)*148})),height=Math.ceil(ls.length/4)*148+80;let route='';points.forEach((p,i)=>{if(!i)route=`M ${p.x*10} ${p.y}`;else{const q=points[i-1];route+=Math.abs(q.y-p.y)<1?` L ${p.x*10} ${p.y}`:` C ${q.x*10} ${q.y+74} ${p.x*10} ${p.y-74} ${p.x*10} ${p.y}`;}});return `<div class="page-heading"><span class="eyebrow">THE ADVENTURE</span><h1>跟着花径，向前一点。</h1><p>走过的每一关，都会变成你口袋里的新本领。</p></div><div class="map-mode-bar"><p>${state.data.progress.freePlay?'自由选关：所有关卡开放，借用此前知识，练习成绩单独保存。':'按花径依次前进，或开启自由选关试玩。'}</p>${freeplaySwitch()}</div>${authorLinks()}<div class="chapter-tabs" role="tablist" aria-label="选择章节">${state.data.chapters.map(ch=>btn('chapter',`${icon(ch.icon)}<span><small>CHAPTER ${ch.number}</small>${ch.name}</span>`,`chapter-tab ${ch.id===c.id?'active':''}`,`data-chapter="${ch.id}" role="tab" aria-selected="${ch.id===c.id}" style="--world:${ch.color}"`)).join('')}</div><section class="map-panel ${c.id}" style="--world:${c.color}"><div class="map-heading">${scenery(c.id)}<div><span class="chapter-label">第 ${c.number} 章 · ${ls.length} 个证明</span><h2>${c.name}</h2><p>${c.subtitle}</p></div><div class="map-completion">${icon(c.icon)}<b>${count}<small> / ${ls.length}</small></b><span>冒险进度</span></div></div>${!ls[0].open?`<div class="map-lock">${icon('lock')} 完成「${chapterById(c.requires).name}」的 BOSS 后，这片花园就会开放。</div>`:''}<div class="level-map" style="height:${height}px"><svg class="map-path" viewBox="0 0 1000 ${height}" preserveAspectRatio="none" aria-hidden="true"><path d="${route}" class="path-edge"/><path d="${route}" class="path-fill"/><path d="${route}" class="path-dashes"/></svg>${Array.from({length:Math.ceil(ls.length/4)+1},(_,i)=>`<div class="map-decoration" style="top:${i*148+106}px;left:${i%2?6:90}%">${icon(i%3?'sprout':'mushroom')}</div>`).join('')}${ls.map((l,i)=>`<div class="map-stop ${l.open&&(!l.result||l.result.needsReproof)&&(!state.data.progress.freePlay||l.id===state.data.progress.lastLevel)?'current':''}" style="left:${points[i].x}%;top:${points[i].y}px">${l.open&&(!l.result||l.result.needsReproof)&&(!state.data.progress.freePlay||l.id===state.data.progress.lastLevel)?'<span class="you-are-here">从这里出发</span>':''}<button class="level-node ${l.result?'cleared':l.open?'open':'locked'} ${l.boss?'boss':l.miniBoss?'mini-boss':''}" data-action="level" data-level="${l.id}" aria-label="第 ${l.number} 关 ${esc(l.title)}${!l.open?'，尚未解锁':''}">${l.boss?ultimateEmblem():l.miniBoss?'<span class="boss-emblem">♛</span><b>'+l.number+'</b>':l.open?l.number:icon('lock')}</button><span class="node-name">${esc(l.title.replace('BOSS · ',''))}</span>${l.result?stars(l.result.stars)+(l.result.needsReproof?'<span class="reprove-label">&#37325;&#35777;&#39046;&#22870;</span>':''):`<span class="node-reward">${l.skills.length?`新卡 · ${esc(cardById(l.skills[0])?.id||'')}`:l.boss?'章节守卫':l.miniBoss?'精英守卫':'证明练习'}</span>`}</div>`).join('')}</div></section>`;}
function mini(){return `<div class="page-heading"><span class="eyebrow">A LITTLE EXTRA CHALLENGE</span><h1>玩玩小游戏</h1><p>只带上你已经拥有的卡牌，看看还能解开多少新谜题。</p></div><div class="mini-banner">${icon('game')}<div><b>熟悉的技能，全新的组合。</b><p>冒险中解锁的技能会自动带进副本。没有时间限制，随时可以撤销。</p></div></div><div class="challenge-grid">${state.data.levels.filter(l=>l.chapter==='m').map((l,i)=>`<article class="challenge-card ${l.open?'':'is-locked'}"><div class="challenge-top"><span class="challenge-number">0${i+1}</span><span class="pill">${l.difficulty}</span>${l.result?stars(l.result.stars):icon(l.open?'game':'lock')}</div><h2>${l.title}</h2><p class="challenge-goal">${esc(l.goal)}</p><div class="required-cards">${l.required.map(id=>`<span class="${state.data.progress.unlocked.includes(id)?'owned':''}">${icon(state.data.progress.unlocked.includes(id)?'check':'lock')}${esc(id)}</span>`).join('')}</div>${btn('level',`${l.open?'进入挑战':'查看解锁条件'}${icon(l.open?'arrow':'lock')}`,l.open?'primary':'secondary',`data-level="${l.id}"`)}</article>`).join('')}</div>`;}
function garden(){return '<div class="garden-room kind-'+(state.filter==='all'?'tactic':state.filter)+'">'+gardenView(state,btn)+'</div>';}
function battle(){return battleView({state,selection,cardById,chapterById,btn});}
function render(){if(state.story!==null){document.body.classList.remove('in-battle');document.body.classList.add('on-home');music.setScene('home');app.innerHTML=prologueView(state.story,btn);return;}document.body.classList.toggle('reduce-motion',!state.motion);document.body.classList.toggle('in-battle',state.page==='battle');document.body.classList.toggle('on-home',state.page==='home');if(!state.data)return;music.setScene(state.page==='loading'?state.chapter:state.page==='battle'?state.battle.level.chapter:state.page==='home'||state.page==='garden'?state.page:'map');app.innerHTML=state.page==='loading'?loadingView(state.chapter):state.page==='battle'?battle():state.page==='home'?home():`${nav()}<main class="main-shell room-shell">${topbar()}<div class="page-content">${({adventure,mini,garden,shop}[state.page]||home)()}</div></main>`;if(pendingNavigation&&!state.busy&&!revealing)queueMicrotask(flushNavigation);}
function modal(content,cls=''){modalReturnFocus=document.activeElement;overlay.innerHTML=`<div class="modal-backdrop"><section class="modal ${cls}" role="dialog" aria-modal="true" aria-label="花园对话框" tabindex="-1">${btn('close-modal',icon('close'),'modal-close icon-button','aria-label="关闭对话框"')}${content}</section></div>`;document.body.classList.add('modal-open');overlay.querySelector('.modal').focus();}
function closeModal(){if(revealing)return;overlay.innerHTML='';document.body.classList.remove('modal-open');if(modalReturnFocus?.isConnected)modalReturnFocus.focus();}
function cardInfo(id){const c=cardById(id),known=(state.page==='garden'&&state.data.progress.freePlay?state.data.progress.collectionUnlocked:state.data.progress.unlocked).includes(id);if(!c||!known){toast('这张知识卡还没有被发现。');return;}const guide=guideFor(c);modal(`${cardArt(id)}<span class="eyebrow">${kinds[c.kind]}</span><h2>${esc(c.name)}</h2><code class="card-id">${esc(c.id)}</code><p class="modal-description">${esc(guide.brief)}</p><pre class="example-code">${esc(guide.formula)}</pre><details class="card-details"><summary>详细说明</summary><p>${esc(c.description)}</p><pre>${esc(pretty(c.example))}</pre></details><div class="unlock-note">${icon(known?'check':'lock')}${known?'已收进你的卡册':'沿着冒险花径，通关后就会遇见它'}</div>${btn('close-modal','记住啦','primary wide')}`,'card-modal illustrated-card kind-'+c.kind);}
async function refreshData(){state.data=await api('bootstrap');}
function finishStory(){
  state.data.progress.prologueSeen=true;state.story=null;
  const route=afterStory;afterStory=null;render();
  // Reading a story must never depend on a successful progress write.
  void api('onboarding/seen',{},{signal:AbortSignal.timeout(8000)}).catch(()=>toast('已进入花园。序章记录暂未保存，刷新后可能再次出现。'));
  if(route?.page==='battle')return enterLevel(route.level,{historyMode:'none'});
}
async function enterLevel(id,{historyMode='push',scroll=0}={}){
  if(state.busy)return;const level=state.data.levels.find(l=>l.id===id);
  if(!level?.open){toast('先完成前面的关卡，或在首页开启自由选关。');if(historyMode==='none'){state.page=level?.chapter==='m'?'mini':'adventure';state.chapter=level?.chapter==='m'?'n':level?.chapter||'n';commitLocation('replace');render();}return;}
  state.tutorialActive=false;const previousPage=state.page;if(historyMode!=='none')rememberScroll();state.busy=true;
  const request=api('level/start',{level:id}).then(value=>({value}),error=>({error}));
  try{await transitionStart(state.motion);if(level.chapter!=='m')state.chapter=level.chapter;state.page='loading';closeModal();render();window.scrollTo({top:0,behavior:'instant'});transitionEnd();
    const result=await request;if(result.error)throw result.error;const b=result.value;state.battle=b;state.data.progress=b.progress;state.data.pendingCards=b.introductions;state.data.pendingTopics=b.pendingTopics;selection=newSelection();hintSuggestion=null;state.page='battle';state.error=null;commitLocation(historyMode);
  }catch(e){state.page=previousPage;toast(e.message);if(e.code==='ENERGY_EMPTY')queueMicrotask(()=>showEnergy());if(e.code==='FREEPLAY_EMPTY')queueMicrotask(()=>showShop());if(historyMode==='none')commitLocation('replace');}
  finally{state.busy=false;render();window.scrollTo({top:scroll,behavior:'instant'});transitionEnd();}
}
async function move(endpoint,action){
  if(state.busy)return;if(endpoint==='step'&&(state.battle.introductions?.length||state.battle.pendingTopics?.length)){toast('还有通关礼物待领取，点击上方「领取新卡」认识它。');return;}
  const b=state.battle,payload=typeof action==='object'?action:{action},chosen=payload.rewrite||payload.apply,skill=payload.rewrite?'rw':payload.apply?'apply':payload.induction?'induction':payload.witness?'use':b.actions.find(a=>a.id===action)?.skill;
  const repo=skill==='apply'?b.applyRepository:b.repository,evidence=chosen?repo.entries.find(e=>e.id===chosen.entry):null;
  state.busy=true;state.error=null;closeModal();
  const animation=endpoint==='step'?spellCast({skill,evidence,target:chosen?.target||b.actions.find(a=>a.id===action)?.effectTarget||'goal',direction:chosen?.direction,motion:state.motion,sound:state.sound,level:currentEconomy().growth.level,card:evidence?.cardId?cardById(evidence.cardId):null}):Promise.resolve();render();
  try{const [result]=await Promise.all([api('level/'+endpoint,{level:b.level.id,revision:b.attempt.revision,...payload}),animation]);
    if(result.rejected){state.battle.attempt=result.attempt;state.error=result;}else{state.battle=result;state.data.progress=result.progress;state.data.pendingCards=result.introductions;state.data.pendingTopics=result.pendingTopics;if(['rw','apply'].includes(skill))selection=newSelection();else{selection.entry=null;selection.phase='draw';selection.witness='';selection.matches=[];selection.prepared=false;}hintSuggestion=null;if(result.complete)sound(true);}
    state.busy=false;render();if(result.rejected)damageEffect({motion:state.motion,sound:state.sound});
    if(result.complete){if(state.tutorialActive&&['n01','n02','n03'].includes(b.level.id)){await api('tutorial/seen',{level:b.level.id,version:7});state.tutorialActive=false;}await refreshData();if(result.introductions?.length||result.pendingTopics?.length)showUnlock();else victory();}
  }catch(e){state.busy=false;if(e.status>=400&&e.status<500&&endpoint==='step'){state.error={error:e.message,details:e.message,explanation:{title:'这一步还不能使用'}};render();damageEffect({motion:state.motion,sound:state.sound});}else{render();toast(e.message);}}
}
function victory(){const b=state.battle,current=state.data.levels.find(l=>l.id===b.level.id),next=state.data.levels.find(l=>l.chapter===b.level.chapter&&l.number===b.level.number+1),reward=b.newCards||[];modal(`<div class="victory-garden">${mascot()}<span>${icon('star')}</span><span>${icon('flower')}</span></div><span class="eyebrow">PROOF COMPLETE</span><h2>${b.progress.freePlay?'自由练习，证明完成！':b.level.boss?'守卫通过，你做到了！':'一个新证明，开花啦！'}</h2>${stars(current?.result?.stars||b.progress.completed[b.level.id]?.stars||1)}<p>用了 ${b.attempt.steps.length} 张卡，完成了一个真正的 Lean 证明。</p>${b.experience?'<p class="experience-reward">+'+b.experience.xp+' EXP</p>'+(b.experience.after>b.experience.before?'<span class="level-up-badge">✦ 芽芽升级啦！Lv.'+b.experience.after+' · '+evolution(b.experience.after).name+'</span>':''):''}<div class="verification-seal">${icon('shield')} Lean 已验证 · 所有目标完成</div>${reward.length?`<div class="reward-preview"><span>已收下的新伙伴</span>${reward.map(id=>`<div>${cardArt(id)}<b>${cardById(id)?.name}</b><code>${esc(id)}</code></div>`).join('')}</div>`:''}${next?.open?btn('next',`下一关 ${icon('arrow')}`,'primary wide',`data-level="${next.id}"`):btn('leave','回到冒险地图','primary wide')}${btn('source','看看我刚刚写出的 Lean 证明','text-button')}`,'victory-modal');}
function qualitySettings(){return `<div class="settings-quality"><label for="settings-quality">画面清晰度</label><select id="settings-quality" data-setting-quality>${qualityChoices.map(([key,label])=>`<option value="${key}" ${readQuality()===key?'selected':''}>${label}</option>`).join('')}</select><p class="quality-status">当前使用${globalThis.__gardenAssets?.quality==='low'?'流畅省流':'清晰画面'}。默认最高画质，若有卡顿可手动改为流畅省流；应用后重新准备插图和音乐，进度保留。</p>${btn('quality-apply','应用清晰度并重新加载','primary',state.busy?'disabled':'')}${/LeanGarden\/|Electron\//.test(navigator.userAgent)?'<a class="text-button" href="leangarden://connection">连接设置 · 更换服务器</a>':''}</div>`;}
function settings(){const musicCredit=music.credit;modal(`<span class="eyebrow">MAKE YOURSELF AT HOME</span><h2>花园设置</h2><div class="account-setting"><b>${esc(state.data.account?.username||globalThis.__gardenAccount?.username||'花园旅人')}</b><small>${state.data.account?.role==='admin'?'花园管理员':'成绩与背包跟随当前账号保存'}</small>${btn('logout','退出账号 · 切换花园','text-button')}</div>${qualitySettings()}<div class="settings-checkin">${btn('checkin','🎁 七天签到','secondary wide')}</div><div class="settings-update">${btn('check-update','检查更新','secondary wide')}<p class="settings-update-status" role="status"></p></div>${authorLinks()}<div class="promo-downloads"><a class="secondary" href="/assets/promo/lean-garden-poster-v05.png" download>下载游戏海报</a><a class="secondary" href="/assets/promo/lean-garden-cover-v05.png" download>下载视频封面</a></div><div class="setting-row"><span>♫ 轻快的循环 BGM</span>${btn('music',music.enabled?'已开启':'已关闭',`toggle ${music.enabled?'on':''}`)}</div><div class="setting-row"><span>${icon('sound')} 魔法与拨轮音效</span>${btn('sound',state.sound?'已开启':'已关闭',`toggle ${state.sound?'on':''}`)}</div><div class="setting-row"><span>${icon('leaf')} 花园动画</span>${btn('motion',state.motion?'已开启':'已关闭',`toggle ${state.motion?'on':''}`)}</div><div class="engine-info"><span class="status-dot ${state.health?.ready?'':'pending'}"></span><div><b>${state.health?.ready?'本机证明引擎运行中':'证明引擎暂时未就绪'}</b><p>${esc(state.health?.version||'正在连接…')}</p><small>登录后，成绩与背包保存在当前花园服务器。</small></div></div><a class="secondary wide" href="/api/save/export" download>${icon('download')} 导出我的存档备份</a>${btn('story-replay','重看花园序章','text-button')}${btn('reset-confirm','重新开始整个冒险','text-button danger')}<p class="music-credit">BGM：<a href="${musicCredit.url}" target="_blank" rel="noopener">${musicCredit.title} — ${musicCredit.artist}</a><br>授权：<a href="${musicCredit.licenseUrl}" target="_blank" rel="noopener">${musicCredit.license}</a> · 本地循环播放</p><details class="music-credit"><summary>七个场景的音乐</summary>${musicTracks.map(t=>'<p><a href="'+t.url+'" target="_blank" rel="noopener">'+esc(t.title)+'</a> — Kevin MacLeod · CC BY 4.0</p>').join('')}</details><p class="settings-foot">证明花园 · v${GAME_VERSION}<br>原创卡通花园 · Lean 4 & Mathlib</p>`);}
function rememberScroll(){history.replaceState({...history.state,scroll:window.scrollY},'',location.href);}
function commitLocation(mode){if(mode==='none')return;const hash=routeFor(state.page,state.chapter,state.battle?.level.id);if(mode==='push'&&hash!==location.hash)history.pushState({scroll:0},'',hash);else history.replaceState({scroll:0},'',hash);observedHash=hash;}
let navigationVersion=0;
async function navigate(page,{historyMode='push',scroll=0,chapter}={}){
  if(state.busy)return;if(historyMode!=='none')rememberScroll();state.busy=true;closeModal();const token=++navigationVersion;
  let fresh=null;const request=api('bootstrap').then(data=>{fresh=data;return data;},error=>({error}));
  try{await transitionStart(state.motion);if(fresh)state.data=fresh;state.page=page;if(chapter)state.chapter=chapter;state.error=null;hintSuggestion=null;commitLocation(historyMode);}
  finally{state.busy=false;render();window.scrollTo({top:scroll,behavior:'instant'});transitionEnd();}
  request.then(data=>{if(token!==navigationVersion||state.page!==page||state.busy)return;if(data.error){toast('暂时使用已加载的地图，连接恢复后可继续。');return;}if(state.data!==data){const top=window.scrollY;state.data=data;render();window.scrollTo({top,behavior:'instant'});}});
}
function freeplaySwitch(){return btn('freeplay','<span class="switch-track" aria-hidden="true"><i></i></span>自由选关 · '+(state.data.progress.freePlay?'开':'关'),'stone-button freeplay-switch','role="switch" aria-checked="'+!!state.data.progress.freePlay+'"');}
async function toggleFreeplay(){if(state.busy)return;let needsShop=false;++navigationVersion;state.busy=true;try{state.data=await api('progress/freeplay',{enabled:!state.data.progress.freePlay});state.battle=null;selection=newSelection();state.page='adventure';closeModal();commitLocation('push');window.scrollTo({top:0,behavior:'instant'});}catch(e){toast(e.message);needsShop=e.code==='FREEPLAY_EMPTY';}finally{state.busy=false;render();}if(needsShop)return showShop();}

async function flushNavigation(){if(state.busy||revealing||!pendingNavigation||!state.data)return;const route=pendingNavigation;pendingNavigation=null;if(route.page==='battle')await enterLevel(route.level,{historyMode:'none',scroll:route.scroll});else await navigate(route.page,{historyMode:'none',chapter:route.chapter,scroll:route.scroll});}
function changedLocation(){if(location.hash===observedHash)return;observedHash=location.hash;pendingNavigation={...parseRoute(location.hash),scroll:history.state?.scroll||0};flushNavigation();}
async function showHint(){
  if(state.busy)return;if(currentEconomy().hints<1)return showShop();state.busy=true;render();
  try{const b=state.battle,result=await api('level/hint',{level:b.level.id,revision:b.attempt.revision});b.attempt=result.attempt;hintSuggestion=result.suggestion?{...result.suggestion,level:b.level.id,revision:b.attempt.revision}:null;
    modal(`${mascot()}<h2>芽芽的小提示</h2><p class="subtle">剩余提示 ${resourceCount(currentEconomy(),'hints')} 次；每点一次提示消耗 1 次。</p><p class="hint-content">${esc(pretty(result.hint))}</p>${result.steps?.length?'<ol class="hint-steps">'+result.steps.map(s=>'<li>'+esc(pretty(s))+'</li>').join('')+'</ol>':''}${result.suggestion?.formula?'<div class="hint-evidence"><b>'+esc(result.suggestion.name)+'</b><code>'+esc(pretty(result.suggestion.formula))+'</code></div>':''}<small class="subtle">提示不会替你出招。本次最高一颗星，重玩可重新挑战三星。</small>${result.canExpand?btn('hint','再具体一点','secondary wide'):''}${hintSuggestion?btn('prepare-hint','帮我选好这一步','primary wide'):''}${btn('close-modal','我来试试看','text-button')}`,'hint-modal');
  }catch(e){toast(e.message);}finally{state.busy=false;render();}
}
async function prepareHint(){
  if(!hintSuggestion||state.busy)return;const h=hintSuggestion,b=state.battle;if(h.level!==b.level.id||h.revision!==b.attempt.revision)return toast('证明已经变化，请重新查看提示。');
  selection={...newSelection(),...h,prepared:true,phase:'draw',entry:null};if(selection.mode==='once')selection.mode='nth';closeModal();render();$('.skill-controls')?.scrollIntoView({block:'start',behavior:'instant'});if(['rw','apply'].includes(h.skill)){selection.category=h.source==='hypothesis'?'hypothesis':h.category;openRepository();}else if(h.skill==='induction')openInduction();
}

function pendingCards(){return state.data.pendingCards||[];}
function showUnlock(){const topic=state.data.pendingTopics?.[0];if(topic)return showTopic(topic);const id=pendingCards()[0];if(!id){closeModal();if(state.page==='battle'&&state.battle.complete)victory();return;}const c=cardById(id);modal(`<div class="unlock-rays" aria-hidden="true"></div><div class="unlock-halo" aria-hidden="true"></div><div class="unlock-sparkles" aria-hidden="true">${Array.from({length:16},(_,i)=>'<i style="--i:'+i+'">✦</i>').join('')}</div><p class="unlock-caption">证明开花，发现一张新卡！</p><button class="reward-seed" data-action="reveal-card" data-card="${id}" aria-label="打开新卡 ${esc(c.name)}">${cardArt(id)}<b>${esc(c.name)}</b><code>${esc(id)}</code></button><p class="unlock-prompt">轻轻点它，看看新本领</p>`,'unlock-modal kind-'+c.kind);}
async function revealCard(id){if(revealing||id!==pendingCards()[0])return;revealing=true;rewardSound(state.sound);music.duck();const stage=overlay.querySelector('.unlock-modal'),seed=stage.querySelector('.reward-seed');stage.classList.add('revealing');stage.querySelector('.modal-close').hidden=true;const reduced=!state.motion||matchMedia('(prefers-reduced-motion: reduce)').matches;try{await seed.animate([{transform:'scale(1) rotate(-4deg)'},{transform:'scale(1.12) rotate(3deg)',offset:.3},{transform:'scale(1.8) rotate(0deg)'}],{duration:reduced?1:1900,easing:'cubic-bezier(.2,.65,.3,1)',fill:'forwards'}).finished;}finally{revealing=false;}const c=cardById(id),guide=guideFor(c);modal(`<span class="eyebrow">新${kinds[c.kind]} · ${pendingCards().length} 张待收藏</span>${cardArt(id)}<h2>${esc(c.name)}</h2><code class="card-id">${esc(id)}</code><p class="modal-description">${esc(guide.brief)}</p><pre class="example-code">${esc(guide.formula)}</pre>${btn('learn-card','收入卡册','primary wide','data-card="'+id+'"')}`,'reward-guide illustrated-card kind-'+c.kind);}
async function learnCard(id){if(state.busy)return;state.busy=true;try{const r=await api('cards/learn',{card:id});state.data.pendingCards=r.pendingCards;state.data.progress=r.progress;if(state.battle){state.battle.introductions=r.pendingCards;state.battle.progress=r.progress;}showUnlock();}catch(e){toast(e.message);}finally{state.busy=false;render();}}
function evidenceRepository(){return selection.skill==='apply'?state.battle.applyRepository:state.battle.repository;}
function openRepository(){selection.phase='draw';modal(repositoryView(evidenceRepository(),selection,btn),'evidence-modal revolver-modal');}
function openPreparation(){const repo=evidenceRepository(),entry=repo.entries.find(e=>e.id===selection.entry);if(!entry)return openRepository();selection.phase='prepare';const content=spellControls(selection,repo,btn,state.busy),existing=overlay.querySelector('.preparation-content');if(existing){existing.innerHTML=content;return;}modal('<div class="preparation-light" aria-hidden="true"><div class="preparation-aura"></div></div><div class="preparation-content">'+content+'</div>','preparation-modal kind-'+entry.kind);}
function drawFocused(entryId){const repo=evidenceRepository(),entries=wheelEntries(repo,selection),entry=entryId?entries.find(e=>e.id===entryId):entries[wheelIndex(entries,selection)];if(!entry)return;selection.entry=entry.id;selection.phase='prepare';render();openPreparation();drawEvidence(state.motion,state.sound);}
function spinWheel(delta){const entries=wheelEntries(evidenceRepository(),selection),old=wheelIndex(entries,selection),next=Math.max(0,Math.min(entries.length-1,old+delta));if(!entries.length||next===old)return;selection.drawIndices[selection.category]=next;updateWheel(overlay,entries,next,next-old,state.motion);wheelSound(state.sound);guided.update();}
function openInduction(){const vars=(state.battle.goals[0]?.hypotheses||[]).filter(h=>h.isNat&&!h.name.includes('✝')&&!h.name.includes('._@.'));modal('<div class="induction-tree">'+wizard(currentEconomy().growth.level)+'</div><span class="eyebrow">从一粒种子，到整片森林</span><h2>对哪个变量归纳？</h2><p class="modal-description">选一个自然数，先证明它是 0 的情况，再从 k 走到 succ k。</p><div class="induction-variables" role="group" aria-label="归纳变量">'+vars.map(h=>btn('induction-variable','<b>'+esc(h.name)+'</b><span>自然数 · '+esc(pretty(h.type))+'</span>','induction-variable '+(selection.variable===h.name?'selected':''),'data-variable="'+esc(h.name)+'" aria-pressed="'+(selection.variable===h.name)+'"')).join('')+'</div>'+(vars.length?'<div class="induction-branches"><span>🌱 起点：'+esc(selection.variable)+' = 0</span><span>🌿 下一步：k → succ k</span></div>':'<p class="empty-note">当前没有可以归纳的自然数变量。</p>')+btn('confirm-induction','开始归纳 · 展开两条花径','primary wide',vars.length?'':'disabled'),'induction-modal');}

let previewToken=0;
function showTopic(id){const t=topics[id];modal(`<div class="topic-confetti" aria-hidden="true">${Array.from({length:20},(_,i)=>'<i style="--i:'+i+'">✦</i>').join('')}</div><span class="eyebrow">一片新世界，开花啦</span><h2>恭喜你解锁了${t.name}！</h2>${cardArt(t.art)}<p class="modal-description">${t.text}</p><p>${t.formula}</p>${btn('learn-topic','收下新规则','primary wide','data-topic="'+id+'"')}`,'topic-celebration illustrated-card');rewardSound(state.sound);music.duck();}
async function learnTopic(id){if(state.busy)return;state.busy=true;try{const r=await api('topics/learn',{topic:id});state.data.pendingTopics=r.pendingTopics;if(state.battle)state.battle.pendingTopics=r.pendingTopics;showUnlock();}finally{state.busy=false;render();}}

document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-action]');if(!target||target.disabled)return;const action=target.dataset.action;
  try {
    if(action==='checkin')return showCheckin();
    if(action==='checkin-claim')return collectCheckin();
    if(action==='check-update')return checkWebUpdate(overlay.querySelector('.settings-update-status'));
    if(action==='shop')return showShop();
    if(action==='shop-category'){state.shopFilter=target.dataset.filter;return render();}
    if(action==='claim-trial')return walletAction('shop/claim-trial',{});
    if(action==='quiz-open')return openQuiz(target.dataset.quiz);
    if(action==='quiz-answer')return submitQuiz(target.dataset.quiz);
    if(action==='exit-game')return confirmExit();
    if(action==='logout')return confirmExit(true);
    if(action==='exit-now')return leaveGame(true);
    if(action==='logout-now')return leaveGame(false);
    if(action==='energy')return showEnergy();
    if(action==='growth')return showGrowth();
    if(action==='claim-beta')return walletAction('shop/claim-beta',{});
    if(action==='refill-energy')return walletAction('energy/refill',{},'energy');
    if(action==='buy-product')return confirmRedemption(target.dataset.product);
    if(action==='redeem-now')return walletAction('shop/redeem',{product:target.dataset.product,key:target.dataset.key});
    if(action==='answer')return showAnswer();
    if(action==='answer-now')return revealAnswer();
    if(action==='freeplay')return toggleFreeplay();
    if(action==='nav')return navigate(target.dataset.page);
    if(action==='chapter')return navigate('adventure',{chapter:target.dataset.chapter});
    if(action==='start-next')return enterLevel(nextLevel().id);
    if(action==='level'||action==='next')return enterLevel(target.dataset.level);
    if(action==='close-modal')return closeModal();
    if(action==='go-adventure')return navigate('adventure');
    if(action==='leave'){state.chapter=state.battle.level.chapter==='m'?state.chapter:state.battle.level.chapter;return navigate(state.battle.level.chapter==='m'?'mini':'adventure');}
    if(action==='filter'){state.filter=target.dataset.filter;return render();}
    if(action==='owned'){state.knownOnly=!state.knownOnly;return render();}
    if(action==='card-info')return cardInfo(target.dataset.card);
    if(action==='skill'){const id=target.dataset.skill,options=state.battle.actions.filter(a=>a.skill===id);if(state.busy)return;if((state.battle.introductions?.length||state.battle.pendingTopics?.length))return toast('请先领取上方的通关新卡。');const immediate=['rfl','constructor','left','right','ac_rfl','ring','omega','linarith'];if(immediate.includes(id)&&options.length===1)return move('step',options[0].id);selection={...newSelection(),skill:id};render();if(['rw','apply'].includes(id))return openRepository();if(id==='induction')return openInduction();$('.skill-controls')?.scrollIntoView({block:'center',behavior:'instant'});if(id==='use')$('[data-witness]')?.focus();return;}
    if(action==='pick-target'){if(selection.phase!=='target'||!selection.entry)return;if(selection.mode==='code'){const at=/\bat\s+([^\s]+)\s*$/.exec(selection.code)?.[1]||'goal';if(target.dataset.target!==at)return toast('请点选代码指定的'+(at==='goal'?'当前目标':'已知条件 '+at)+'。');}selection.target=target.dataset.target;selection.prepared=false;return move('step',{[selection.skill==='apply'?'apply':'rewrite']:{...selection}});}
    if(action==='open-evidence')return openRepository();
    if(action==='evidence-category'){selection.category=target.dataset.kind;selection.categoryChosen=true;selection.source=selection.category==='hypothesis'?'hypothesis':'warehouse';return openRepository();}
    if(action==='wheel-step')return spinWheel(Number(target.dataset.delta));
    if(action==='wheel-card'){if(Date.now()<suppressWheelClick)return;const entries=wheelEntries(evidenceRepository(),selection),index=wheelIndex(entries,selection),next=Number(target.dataset.index);return next===index?drawFocused(target.dataset.entry):spinWheel(next-index);}
    if(action==='draw-focused')return drawFocused();
    if(action==='flip-card')return flipCard(target.dataset.direction);
    if(action==='rewrite-mode'){const next={all:'nth',nth:'code',code:'all',once:'nth'}[selection.mode]||'all';if(next==='code')selection.code=rewriteEditorSource(selection,evidenceRepository().entries.find(e=>e.id===selection.entry));selection.mode=next;return openPreparation();}
    if(action==='arm-spell'){if(selection.mode==='code')selection.code=overlay.querySelector('[data-rewrite-code]')?.value||selection.code;closeModal();selection.phase='target';render();$('.proof-arena')?.scrollIntoView({block:'center',behavior:'instant'});return;}
    if(action==='prepare-spell')return openPreparation();
    if(action==='open-induction')return openInduction();
    if(action==='induction-variable'){selection.variable=target.dataset.variable;for(const button of overlay.querySelectorAll('[data-action="induction-variable"]')){button.classList.toggle('selected',button===target);button.setAttribute('aria-pressed',String(button===target));}overlay.querySelector('.induction-branches>span').textContent='🌱 起点：'+selection.variable+' = 0';return;}

    if(action==='cancel-spell'){selection=newSelection();return render();}
    if(action==='confirm-witness'){selection.witness=$('[data-witness]')?.value||selection.witness;return move('step',{witness:{expression:selection.witness}});}
    if(action==='tutorial-start'||action==='tutorial-replay'){if(state.busy)return;state.tutorialActive=true;selection=newSelection();closeModal();if(state.battle.complete)return move('reset');render();guided.update();return;}
    if(action==='story-next'){state.story++;return render();}
    if(action==='story-replay'){closeModal();state.story=0;return render();}
    if(action==='story-skip'||action==='story-finish')return finishStory();
    if(action==='learn-topic')return learnTopic(target.dataset.topic);
    if(action==='confirm-induction')return move('step',{induction:{variable:selection.variable}});
    if(action==='confirm-action')return move('step',selection.action);
    if(action==='claim-cards')return showUnlock();
    if(action==='reveal-card')return revealCard(target.dataset.card);
    if(action==='learn-card')return learnCard(target.dataset.card);
    if(action==='victory')return victory();
    if(action==='undo')return move('undo');
    if(action==='restart'){modal(`<span class="large-card-icon">${icon('refresh')}</span><h2>回到这一关的起点？</h2><p class="modal-description">会清空本次证明足迹。已经收集的星星和技能会保留。</p>${btn('restart-now','重新开始本关','primary wide')}${btn('close-modal','继续想一想','text-button')}`,'restart-modal');return;}
    if(action==='restart-now')return move('reset');
    if(action==='hint')return showHint();
    if(action==='prepare-hint')return prepareHint();
    if(action==='notation'){modal('<h2>读懂眼前的符号</h2>'+symbolGuide(state.battle.goals)+btn('close-modal','回到证明','primary wide'),'notation-modal');return;}
    if(action==='inspect-branch'){const index=Number(target.dataset.branch),g=state.battle.goals[index];if(!g)return;modal(`<h2>${esc(branchTitle(g,index))}</h2><p class="modal-description">${index?'这是稍后要证明的分支。先完成当前目标，它会自动接上。':'这是正在证明的分支。'}</p><dl>${g.hypotheses.map(h=>'<dt>'+esc(pretty(h.name))+'</dt><dd>'+esc(pretty(h.type))+'</dd>').join('')}</dl><pre class="preview-goal">${esc(pretty(g.target))}</pre>${btn('close-modal','回到当前证明','primary wide')}`,'branch-preview');return;}
    if(action==='source'){const b=state.battle;modal(`<span class="eyebrow">YOUR PROOF, IN LEAN</span><h2>你刚刚写下的证明</h2><p class="modal-description">每一次点卡，都会成为一行真实的 Lean。你已经在用证明语言思考了。</p><pre class="proof-source">${esc('by\n'+(b.proof.length?b.proof.map(s=>'  '+pretty(s).replaceAll('\n','\n  ')).join('\n'):'  -- 等待第一张卡'))}</pre>${b.complete?`<a class="primary wide" href="/api/proof/export?level=${b.level.id}" download>${icon('download')} 导出 .lean 证明</a>`:''}${btn('close-modal','回到花园','text-button')}`,'source-modal');return;}
    if(action==='error-detail'){modal(`<h2>Lean 的检查结果</h2><p class="modal-description">这一步未能完成。你可以换个目标、方向或证据再试一次。</p><pre class="proof-source">${esc(pretty(state.error.details))}</pre>${btn('close-modal','再试一张卡','primary wide')}`);return;}
    if(action==='dismiss-error'){state.error=null;return render();}
    if(action==='lesson-cards'){const owned=new Set(state.data.progress.unlocked),ids=[...new Set([...state.battle.actions.flatMap(a=>[a.skill,...(a.uses||[])]),...state.battle.repository.entries.map(e=>e.cardId),...state.battle.applyRepository.entries.map(e=>e.cardId)])].filter(id=>id&&owned.has(id));modal('<h2>随身知识卡册</h2><p class="modal-description">温习已经发现的伙伴，不影响本关星星。</p>'+Object.entries(kinds).map(([kind,label])=>{const list=ids.filter(id=>cardById(id)?.kind===kind);return list.length?'<h3 class="review-heading">'+label+'</h3><div class="review-cards">'+list.map(id=>btn('card-info',cardArt(id)+'<span>'+esc(cardById(id)?.name||id)+'</span><code>'+esc(id)+'</code>','review-card kind-'+kind,'data-card="'+id+'"')).join('')+'</div>':'';}).join(''));return;}
    if(action==='music'){music.toggle();render();if(overlay.innerHTML)settings();return;}
    if(action==='growth')return showGrowth();
    if(action==='settings')return settings();
    if(action==='quality-apply'){if(state.busy)return toast('等当前这一步检查完成后，再应用清晰度。');location.reload();return;}
    if(action==='sound'){state.sound=!state.sound;localStorage.setItem('garden-sound',state.sound?'on':'off');if(state.sound)sound();render();if(overlay.innerHTML)settings();return;}
    if(action==='motion'){state.motion=!state.motion;localStorage.setItem('garden-motion',state.motion?'on':'off');render();settings();return;}
    if(action==='reset-confirm'){modal(`<span class="large-card-icon">${icon('refresh')}</span><h2>重新开始整个冒险？</h2><p class="modal-description">这会清空当前浏览器的关卡进度、星星和技能。活跃度、商城背包和芽芽等级会保留，内测礼包不会重复发放。建议先导出存档备份。</p><a class="secondary wide" href="/api/save/export" download>先导出存档</a>${btn('reset-all','确认清空，重新出发','danger-button wide')}${btn('close-modal','保留我的花园','text-button')}`);return;}
    if(action==='reset-all'){state.data=await api('progress/reset',{confirm:'RESET'});state.page='home';state.battle=null;selection=newSelection();state.story=0;afterStory=null;commitLocation('replace');closeModal();return render();}
    if(action==='retry-boot')return boot();
  }catch(e){toast(e.message);}
});
function flipCard(direction){if(direction!==selection.direction)flipSound(state.sound,direction==='backward');selection.direction=direction;if(selection.mode==='code'){const field=overlay.querySelector('[data-rewrite-code]');selection.code=(field?.value||selection.code).replace(/\[\s*(?:←\s*)?/,direction==='backward'?'[← ':'[');if(field)field.value=selection.code;}$('.ritual-flipper')?.classList.toggle('flipped',direction==='backward');$('.flip-knob')?.classList.toggle('backward',direction==='backward');document.querySelectorAll('[data-action="flip-card"]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.direction===direction)));}
let flipStart=null,wheelStart=null,suppressWheelClick=0,lastWheelTime=0,wheelDelta=0;
document.addEventListener('wheel',event=>{if(!event.target.closest('.wheel-window')||!guided.allowed(event.target))return;event.preventDefault();wheelDelta+=event.deltaY;if(Math.abs(wheelDelta)<18||Date.now()-lastWheelTime<100)return;spinWheel(Math.sign(wheelDelta));wheelDelta=0;lastWheelTime=Date.now();},{passive:false});
document.addEventListener('pointerdown',event=>{const wheel=event.target.closest('.wheel-window');if(!wheel||!guided.allowed(event.target))return;wheelStart={y:event.clientY,id:event.pointerId,wheel};});
document.addEventListener('pointermove',event=>{if(!wheelStart||wheelStart.id!==event.pointerId)return;const delta=wheelStart.y-event.clientY;if(Math.abs(delta)>30){spinWheel(Math.sign(delta));wheelStart.y=event.clientY;suppressWheelClick=Date.now()+350;}});
document.addEventListener('pointerup',()=>{wheelStart=null;});document.addEventListener('pointercancel',()=>{wheelStart=null;flipStart=null;});
document.addEventListener('keydown',event=>{if(!event.target.closest('.wheel-window')||!guided.allowed(event.target))return;if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const entries=wheelEntries(evidenceRepository(),selection),index=wheelIndex(entries,selection);spinWheel(event.key==='Home'?-index:event.key==='End'?entries.length-index-1:event.key==='ArrowDown'?1:-1);}});
document.addEventListener('pointerdown',event=>{if(event.target.closest('.flip-slider'))flipStart={x:event.clientX,id:event.pointerId};});
document.addEventListener('pointerup',event=>{if(!flipStart||flipStart.id!==event.pointerId)return;const delta=event.clientX-flipStart.x;flipStart=null;if(Math.abs(delta)>18)flipCard(delta>0?'backward':'forward');});
document.addEventListener('input',event=>{if(event.target.matches('[data-witness]'))selection.witness=event.target.value;if(event.target.matches('[data-rewrite-code]'))selection.code=event.target.value;});
document.addEventListener('change',event=>{if(event.target.matches('[data-quiz-choice]')){overlay.querySelector('[data-action="quiz-answer"]').disabled=false;return;}if(event.target.matches('[data-setting-quality]')){saveQuality(event.target.value);$('.quality-status').textContent='选择已保存。点击下方按钮应用新的清晰度，当前进度会保留。';return;}const occurrence=event.target.dataset.occurrence;if(occurrence){const n=Number(occurrence);selection.occurrences=event.target.checked?[...new Set([...selection.occurrences,n])]:selection.occurrences.filter(x=>x!==n);return openPreparation();}const key=event.target.dataset.control;if(!key)return;selection[key]=event.target.value;render();selection.prepared=false;});
document.addEventListener('keydown',event=>{
  if(!overlay.innerHTML)return;
  if(event.key==='Escape'){closeModal();return;}
  if(event.key==='Tab'){const focusable=[...overlay.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')];if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===overlay.querySelector('.modal'))){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
});
overlay.addEventListener('click',event=>{if(event.target.classList.contains('modal-backdrop'))closeModal();});
window.addEventListener('popstate',changedLocation);
window.addEventListener('hashchange',changedLocation);
async function boot(){try{await refreshData();const route=parseRoute(location.hash);state.chapter=route.chapter||state.data.levels.find(l=>l.id===state.data.progress.lastLevel&&l.chapter!=='m')?.chapter||'n';state.page=route.page==='battle'?'home':route.page;if(!state.data.progress.prologueSeen){state.story=0;afterStory=route;}render();if(route.page==='battle'&&state.story===null)await enterLevel(route.level,{historyMode:'none'});else if(state.story===null)commitLocation('replace');api('health').then(h=>{state.health=h;render();if(!h.ready)toast(h.message);}).catch(()=>toast('证明服务暂时没有响应，请确认本机服务正在运行。'));}catch(e){app.innerHTML=`<div class="boot">${mascot()}<h1>花园还在休息</h1><p>${esc(e.message)}</p>${btn('retry-boot','重新连接','primary')}</div>`;}}
boot();

let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(state.page==='battle'&&!state.busy&&!document.activeElement?.matches('input,textarea,select'))render();},120);});
