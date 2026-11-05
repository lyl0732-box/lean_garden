import {mascot,icon,escapeHTML as esc} from './ui.js';
import {usernameValue,passwordValue} from './account-rules.js';
import {checkWebUpdate,GAME_VERSION} from './update-check.js';

async function request(path,body){const r=await fetch('/api/auth/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});const data=await r.json();if(!r.ok)throw new Error(data.error||'暂时无法连接花园。');return data;}
export async function ensureAuthenticated(){
  const app=document.getElementById('app');let status;
  try{status=await request('status');}catch(error){app.innerHTML=`<main class="account-screen"><div class="account-panel"><h1>花园暂时没连上</h1><p>${esc(error.message)}</p><button class="primary" data-auth-retry>重新连接</button></div></main>`;app.querySelector('[data-auth-retry]').onclick=()=>location.reload();throw error;}
  if(status.authenticated){globalThis.__gardenAccount=status.account;return status;}
  return new Promise(resolve=>{
    let mode='login',pending=false,name=status.remembered||localStorage.getItem('garden-login-name')||'',remember=!!status.remembered||localStorage.getItem('garden-login-remember')==='yes';
    function render(){
      app.innerHTML=`<main class="account-screen"><div class="account-tools"><button type="button" data-auth-update>\u68c0\u67e5\u66f4\u65b0</button><button type="button" data-auth-exit>\u9000\u51fa</button></div><div class="account-leaves" aria-hidden="true">❦</div><section class="account-panel"><header><small>THE LEAN GARDEN</small><div class="account-logo">${mascot()}<div><h1>证明花园</h1><p>把每一次发现，留在你的花园里。</p></div></div></header><div class="account-tabs" role="tablist"><button type="button" data-auth-mode="login" aria-selected="${mode==='login'}">登录花园</button><button type="button" data-auth-mode="register" aria-selected="${mode==='register'}">注册新账号</button></div>${status.remembered&&mode==='login'?'<div class="remembered-login"><span>'+esc(status.remembered)+' \u5df2\u8bb0\u4f4f</span><button type="button" class="secondary" data-auth-remember>\u514d\u8f93\u5bc6\u7801\u767b\u5f55</button></div>':''}<h2>${mode==='hint'?'找回记忆里的线索':mode==='register'?'从一颗新种子开始':'欢迎回到花园'}</h2><form class="account-form"><label>用户名 <small data-name-bytes>0 / 30 字节</small><input name="username" autocomplete="username" maxlength="30" required value="${esc(name)}" placeholder="给你的花园起个名字"></label>${mode!=='hint'?`<label>密码 <span class="account-password"><input name="password" type="password" autocomplete="${mode==='register'?'new-password':'current-password'}" minlength="6" maxlength="128" required placeholder="至少 6 个字符"><button type="button" data-password-peek aria-label="显示密码">${icon('eye')}</button></span></label>`:''}${mode==='register'?'<label>密码提示词 <small>可选，不要直接填写密码</small><input name="recoveryHint" maxlength="80" placeholder="留一句能帮助你回忆的线索"></label>':''}${mode!=='hint'&&status.legacy?`<label class="account-legacy"><input name="adoptLegacy" type="checkbox" checked><span>接续这台设备的原冒险 <small>${status.legacy.completed} 关 · ${status.legacy.stars} 颗星</small></span></label>`:''}${mode!=='hint'?'<label class="account-remember"><input name="remember" type="checkbox" '+(remember?'checked':'')+'><span>\u8bb0\u4f4f\u5bc6\u7801 \u00b7 \u4e0b\u6b21\u514d\u8f93</span></label>':''}<p class="account-update-status" role="status"></p><p class="account-error" role="alert" hidden></p><button type="submit" class="primary wide">${mode==='hint'?'看看我的提示词':mode==='register'?'注册并进入花园':'登录 · 进入花园'} ${icon('arrow')}</button></form>${mode==='login'?'<button class="text-button" type="button" data-auth-mode="hint">忘记密码？看看提示词</button>':''}<p class="account-footer">v${GAME_VERSION} · 同一个账号，可在你的网页与客户端继续冒险。</p></section></main>`;
      app.querySelector('[data-auth-update]').onclick=()=>checkWebUpdate(app.querySelector('.account-update-status'));
      app.querySelector('[data-auth-exit]').onclick=()=>{if(/LeanGarden\/|Electron\//.test(navigator.userAgent)){location.href='leangarden://exit';return;}app.querySelector('.account-panel').innerHTML='<h1>\u82b1\u56ed\u5df2\u4f11\u606f</h1><p>\u53ef\u4ee5\u5173\u95ed\u5f53\u524d\u6807\u7b7e\u9875\u3002</p><button class="primary" data-auth-back>\u8fd4\u56de\u767b\u5f55</button>';app.querySelector('[data-auth-back]').onclick=render;};
      app.querySelector('[data-auth-remember]')?.addEventListener('click',async event=>{if(pending)return;pending=true;event.currentTarget.disabled=true;try{const result=await request('remember',{});globalThis.__gardenAccount=result.account;resolve(result);}catch(error){const box=app.querySelector('.account-error');box.hidden=false;box.textContent=error.message;}finally{pending=false;}});
      const input=app.querySelector('[name="username"]'),counter=app.querySelector('[data-name-bytes]');
      app.querySelector('[name="remember"]')?.addEventListener('change',async event=>{
        remember=event.currentTarget.checked;localStorage.setItem('garden-login-remember',remember?'yes':'no');
        if(remember||!status.remembered||pending)return;pending=true;
        try{await request('logout',{forgetRemembered:true});status.remembered=null;app.querySelector('.remembered-login')?.remove();}
        catch(error){const box=app.querySelector('.account-error');box.textContent='未能清除记住的登录，请重新取消勾选。'+error.message;box.hidden=false;event.target.checked=true;remember=true;}
        finally{pending=false;}
      });
      const count=()=>{const n=new TextEncoder().encode(input.value.trim().normalize('NFC')).length;counter.textContent=n+' / 30 字节';counter.classList.toggle('over-limit',n>30);};count();input.addEventListener('input',count);
      for(const button of app.querySelectorAll('[data-auth-mode]'))button.onclick=()=>{if(pending)return;name=input.value;remember=app.querySelector('[name="remember"]')?.checked??remember;mode=button.dataset.authMode;render();};
      app.querySelector('[data-password-peek]')?.addEventListener('click',event=>{const field=app.querySelector('[name="password"]');field.type=field.type==='password'?'text':'password';event.currentTarget.setAttribute('aria-label',field.type==='password'?'显示密码':'隐藏密码');});
      app.querySelector('form').onsubmit=async event=>{
        event.preventDefault();if(pending)return;const errorBox=app.querySelector('.account-error'),button=event.currentTarget.querySelector('[type="submit"]');
        try{
          name=usernameValue(input.value);const values=new FormData(event.currentTarget);if(mode!=='hint')passwordValue(values.get('password'));
          pending=true;button.disabled=true;errorBox.hidden=true;remember=values.get('remember')==='on';
          const result=await request(mode==='hint'?'hint':mode,{username:name,password:values.get('password'),recoveryHint:values.get('recoveryHint')||'',remember,adoptLegacy:!status.legacy||values.get('adoptLegacy')==='on'});
          if(mode==='hint'){errorBox.textContent=result.hint;errorBox.hidden=false;errorBox.classList.add('is-hint');}
          else{localStorage.setItem('garden-login-name',name);localStorage.setItem('garden-login-remember',remember?'yes':'no');globalThis.__gardenAccount=result.account;resolve(result);}
        }catch(error){errorBox.textContent=error.message;errorBox.hidden=false;errorBox.classList.remove('is-hint');}
        finally{pending=false;button.disabled=false;}
      };
    }
    render();
  });
}
