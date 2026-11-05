import {isAndroidClient,markClient} from './client-mode.js';
import {icon} from './ui.js';

export function installFullscreen(notify){
  markClient();if(isAndroidClient())return;
  if(globalThis.__gardenFullscreenInstalled)return;globalThis.__gardenFullscreenInstalled=true;
  const button=document.createElement('button');button.id='fullscreen-toggle';button.className='fullscreen-toggle';button.type='button';document.body.append(button);
  const native=globalThis.gardenWindow;let nativeActive=false,busy=false;
  const htmlActive=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
  const active=()=>native?nativeActive:htmlActive();
  const update=()=>{button.innerHTML=icon(active()?'shrink':'expand')+'<span class="control-caption">'+(active()?'退出全屏':'全屏')+'</span>';button.setAttribute('aria-label',active()?'退出全屏':'进入全屏');button.setAttribute('aria-pressed',String(active()));button.title=active()?`退出全屏（${native?'F11':'Esc'}）`:'进入全屏';};
  const place=()=>{const home=document.querySelector('.home-toolbar'),host=home||document.querySelector('.battle-header')||document.querySelector('.room-actions')||document.querySelector('.top-tools')||document.querySelector('.account-tools');if(host){button.classList.add('toolbar-fullscreen');const before=home?.querySelector('[data-action="exit-game"]')||host.querySelector('[data-auth-exit]');if(button.parentNode!==host||before&&button.nextSibling!==before)host.insertBefore(button,before||null);}else{button.classList.remove('toolbar-fullscreen');if(button.parentNode!==document.body)document.body.append(button);}};
  new MutationObserver(place).observe(document.getElementById('app'),{childList:true,subtree:true});place();
  button.addEventListener('click',async()=>{
    if(busy)return;busy=true;
    try{
      if(native){if(htmlActive())await(document.exitFullscreen||document.webkitExitFullscreen).call(document);nativeActive=await native.toggle();}
      else if(active()){const exit=document.exitFullscreen||document.webkitExitFullscreen;await exit.call(document);}
      else{const enter=document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen;if(!enter){notify('当前浏览器不支持网页全屏，可使用浏览器的全屏或添加到主屏幕功能。');return;}await enter.call(document.documentElement);}
    }
    catch{notify(native?'暂时无法切换窗口全屏，可以按 F11 重试。':'浏览器未允许全屏，请再点一次，或使用浏览器的全屏功能。');}
    finally{busy=false;update();}
  });
  if(native){native.onChange(value=>{nativeActive=value;update();});void native.isFullscreen().then(value=>{nativeActive=value;update();}).catch(()=>{});}
  document.addEventListener('fullscreenchange',update);document.addEventListener('webkitfullscreenchange',update);update();
}
