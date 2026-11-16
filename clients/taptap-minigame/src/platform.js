const config = require('../config.js');

class Platform {
  constructor(tap) {
    this.tap = tap;
    this.server = config.server.replace(/\/+$/, '');
    this.cookie = this.read('session', '');
    this.sound = this.read('sound', true);
    this.quality = this.read('quality', 'high');
    this.images = new Map();
    this.scene = '';
    this.track = null;
    this.visible = true;
    if (tap.onHide) tap.onHide(() => { this.visible = false; if (this.track) this.track.pause(); if(this.onSuspend)this.onSuspend(); });
    if (tap.onShow) tap.onShow(() => { this.visible = true; if (this.track && this.sound) this.track.play(); if(this.onResume)this.onResume(); });
  }
  read(key, fallback) { try { const value = this.tap.getStorageSync('lean-garden-' + key); return value === '' || value == null ? fallback : value; } catch { return fallback; } }
  save(key, value) { try { this.tap.setStorageSync('lean-garden-' + key, value); } catch {} }
  async request(route, body) {
    if (!/^(?:auth|bootstrap|level|progress|cards|topics|garden|economy|shop|energy|onboarding|tutorial|checkin|presence)(?:[/?]|$)/.test(route)) throw Error('没有这个游戏接口。');
    return new Promise((resolve, reject) => this.tap.request({
      url: this.server + '/api/' + route,
      method: body === undefined ? 'GET' : 'POST',
      header: { 'content-type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}) },
      data: body,
      timeout: 120000,
      success: response => {
        const headers = response.header || {}, raw = response.cookies || headers['Set-Cookie'] || headers['set-cookie'];
        if (raw) {
          const jar = new Map(this.cookie.split(/;\s*/).filter(Boolean).map(s => { const at=s.indexOf('='); return [s.slice(0,at),s.slice(at+1)]; }));
          for (const value of Array.isArray(raw) ? raw : String(raw).split(/,(?=\s*[\w-]+=)/)) {
            const part=value.split(';')[0], at=part.indexOf('='); if(at>0) {const name=part.slice(0,at).trim(); if(name.startsWith('garden_'))jar.set(name,part.slice(at+1));}
          }
          this.cookie = Array.from(jar, ([key,value]) => key+'='+value).join('; ');
          this.save('session', this.cookie);
        }
        let data = response.data;
        try { if (typeof data === 'string') data=JSON.parse(data); } catch { reject(Error('服务器响应异常，请稍后重试。')); return; }
        if (!data || response.statusCode < 200 || response.statusCode >= 300) {
          const error=Object.assign(Error(data && data.error || '花园暂时无法连接。'), { code:data && data.code, status:response.statusCode });
          if(error.status===401){this.cookie='';this.save('session','');}
          reject(error);
        } else resolve(data);
      },
      fail: error => reject(Error('网络连接失败，请重试。' + (error.errMsg || '')))
    }));
  }
  image(file) {
    if (this.images.has(file)) return this.images.get(file);
    const image=this.tap.createImage(), entry={image,ready:false};
    image.onload=()=>{entry.ready=true;};image.onerror=()=>{entry.failed=true;};
    image.src=file;this.images.set(file,entry);return entry;
  }
  music(scene, tracks) {
    if(this.scene===scene)return;
    this.scene=scene;
    if(this.track){this.track.stop();this.track.destroy();this.track=null;}
    if(!this.tap.createInnerAudioContext||!tracks[scene])return;
    try{this.track=this.tap.createInnerAudioContext();this.track.src=tracks[scene];this.track.loop=true;this.track.volume=.4;if(this.sound&&this.visible)this.track.play();}catch{}
  }
  toggleSound(){this.sound=!this.sound;this.save('sound',this.sound);if(this.track){if(this.sound)this.track.play();else this.track.pause();}}
  prompt(title, placeholder, value='') {
    return new Promise(resolve=>this.tap.showModal({title,content:value,editable:true,placeholderText:placeholder,confirmText:'确定',cancelText:'取消',success:r=>resolve(r.confirm?String(r.content||''):null),fail:()=>resolve(null)}));
  }
  confirm(title, content) {
    return new Promise(resolve=>this.tap.showModal({title,content,confirmText:'确定',cancelText:'取消',success:r=>resolve(!!r.confirm),fail:()=>resolve(false)}));
  }
  destroy(){if(this.track){this.track.stop();this.track.destroy();}this.images.clear();}
}
module.exports={Platform};
