export const GAME_VERSION='0.13.5';
export async function checkWebUpdate(status){
  if(/Android/i.test(navigator.userAgent)&&/LeanGardenAndroid\/1/.test(navigator.userAgent)){
    const native=/LeanGarden\/(\d+)\.(\d+)\./.exec(navigator.userAgent);
    if(native&&(Number(native[1])>0||Number(native[2])>=13)){status.textContent='正在打开安装包更新…';location.href='leangarden://update';return;}
    status.textContent='正在检查新版安卓安装包…';
    try{const r=await fetch('/android-release.json?check='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('安装包暂未发布');const m=await r.json();if(!/^\/downloads\/LeanGarden-[0-9.]+-local\.apk$/.test(m.url))throw Error('安装包地址不可用');status.textContent='当前安装版本较旧 · ';const link=document.createElement('a');link.className='text-button';link.href=m.url;link.download='';link.textContent='下载并安装 v'+m.versionName;status.append(link);}catch(e){status.textContent='检查失败：'+e.message;}return;
  }
  status.textContent='正在检查游戏更新…';
  try{const r=await fetch('/client-manifest.json?check='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('服务器暂时没有回应。');const m=await r.json();if(m.schema!==1||!m.revision)throw new Error('更新清单暂不可用。');
    if(m.revision===GAME_VERSION){status.textContent='已经是最新版本 · '+GAME_VERSION;return;}
    status.textContent='发现新版本 '+m.revision+' · ';const b=document.createElement('button');b.type='button';b.className='text-button';b.textContent='更新并重新加载';b.onclick=()=>location.reload();status.append(b);
  }catch(error){status.textContent='检查失败：'+error.message;}
}
