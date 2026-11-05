import {chooseQuality,preloadAssets} from './asset-cache.js';
import {connectionQuality,readQuality,saveQuality,qualityChoices} from './quality.js';
import {markClient} from './client-mode.js';
import {ensureAuthenticated} from './auth.js';
import {installFullscreen} from './fullscreen.js';

const app=document.getElementById('app');
let generation=0,controller,finishTimer,ready=false,choosing=false,entering=false;
const mb=n=>(n/1048576).toFixed(1);
markClient();const preference=connectionQuality();
installFullscreen(message=>{const toast=document.getElementById('toast');toast.textContent=message;toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),3500);});
await ensureAuthenticated();
app.innerHTML=`<main class="resource-boot" aria-label="准备游戏资源"><div class="resource-sprout" aria-hidden="true">❧</div><small>THE LEAN GARDEN</small><h1>让花园先准备好</h1><p>插图、卡片与七个场景的音乐，一次备齐。</p><div class="resource-meter" role="progressbar" aria-label="资源下载进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><b class="resource-percent">0%</b><span class="resource-status" role="status">正在清点花园里的伙伴…</span><label class="resource-quality">画面与下载 <select aria-label="资源画质">${qualityChoices.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><p class="resource-error" role="alert" hidden></p><button class="primary resource-retry" hidden>重新准备</button><button class="primary resource-enter" hidden>进入花园</button><small class="resource-note">下载中也能切换清晰度，手动选择会一直保留。</small></main>`;
const select=app.querySelector('select'),errorBox=app.querySelector('.resource-error'),retry=app.querySelector('.resource-retry'),enterButton=app.querySelector('.resource-enter');select.value=preference;
function queueEnter(){clearTimeout(finishTimer);if(ready&&!choosing&&!entering)finishTimer=setTimeout(enter,450);}
async function enter(){
  if(!ready||entering)return;entering=true;clearTimeout(finishTimer);
  try{await import('./app.js');}catch(error){entering=false;errorBox.textContent=error.message;errorBox.hidden=false;retry.hidden=false;}
}
select.addEventListener('pointerdown',()=>{choosing=true;clearTimeout(finishTimer);});
select.addEventListener('focus',()=>{choosing=true;clearTimeout(finishTimer);});
select.addEventListener('blur',()=>{choosing=false;queueEnter();});
select.addEventListener('change',()=>{saveQuality(select.value);choosing=false;void start();});
retry.addEventListener('click',()=>{void start();});enterButton.addEventListener('click',enter);

async function start(){
  const token=++generation;controller?.abort();controller=new AbortController();const signal=controller.signal;
  ready=false;clearTimeout(finishTimer);errorBox.hidden=true;retry.hidden=true;enterButton.hidden=true;
  app.querySelector('.resource-percent').textContent='0%';app.querySelector('.resource-meter').setAttribute('aria-valuenow','0');app.querySelector('.resource-meter i').style.width='0%';
  app.querySelector('.resource-status').textContent='正在按所选清晰度准备资源…';
  app.querySelector('.resource-note').textContent='下载中也能切换清晰度，手动选择会一直保留。';
  try{
    const response=await fetch('/assets/preload-manifest.json',{cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});
    if(!response.ok)throw new Error('暂时无法取得资源清单，请检查连接后重试。');const manifest=await response.json();
    const preference=readQuality(),quality=chooseQuality(navigator.connection,preference);
    const progress=p=>{
      if(token!==generation)return;
      const percent=Math.min(99,Math.floor(p.loaded/p.total*100));app.querySelector('.resource-meter').setAttribute('aria-valuenow',percent);app.querySelector('.resource-meter i').style.width=percent+'%';app.querySelector('.resource-percent').textContent=percent+'%';app.querySelector('.resource-status').textContent=`${mb(p.loaded)} / ${mb(p.total)} MB · ${p.completed} / ${p.count} 项 · ${p.quality==='low'?'流畅省流':'清晰画面'}`;if(p.sources.bundle||p.sources.update)app.querySelector('.resource-note').textContent=`正在读取本机资源 · 内置 ${p.sources.bundle} 项 · 已更新 ${p.sources.update} 项`;
    };
    await preloadAssets(manifest,quality,progress,{signal});
    if(token!==generation)return;ready=true;
    app.querySelector('.resource-meter').setAttribute('aria-valuenow','100');app.querySelector('.resource-meter i').style.width='100%';app.querySelector('.resource-percent').textContent='100%';app.querySelector('.resource-status').textContent='伙伴们准备好了，正在打开花园…';enterButton.hidden=false;queueEnter();
  }catch(error){
    if(signal.aborted||token!==generation)return;
    errorBox.textContent=error.name==='TimeoutError'?'连接等待较久，请确认服务可访问后重试。':error.message;errorBox.hidden=false;retry.hidden=false;
  }
}
void start();
