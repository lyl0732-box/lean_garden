import {musicTracks,musicTracksByScene} from './music-tracks.js';
import {assetURL} from './asset-cache.js';
export {musicTracks};
export const musicCredit=musicTracks[0];
const sceneVolume=scene=>['n','l','a','t'].includes(scene)?.075:.14;
export class GardenMusic{
  constructor(){this.enabled=localStorage.getItem('garden-music')!=='off';this.scene='home';this.players=new Map();this.started=false;this.loops=0;this.generation=0;}
  get credit(){return musicTracksByScene[this.scene];}
  createPlayer(scene){
    if(this.players.has(scene))return this.players.get(scene);
    const audio=new Audio(assetURL(musicTracksByScene[scene].src));audio.loop=true;audio.preload='auto';audio.setAttribute('playsinline','');audio.volume=sceneVolume(scene);
    let gain;try{this.context ||= new(window.AudioContext||window.webkitAudioContext)();this.output ||= this.context.createGain();if(!this.connected){this.output.connect(this.context.destination);this.connected=true;}gain=this.context.createGain();gain.gain.value=0;this.context.createMediaElementSource(audio).connect(gain);gain.connect(this.output);audio.volume=1;}catch{}
    let last=0;audio.addEventListener('timeupdate',()=>{if(last>audio.duration-2&&audio.currentTime<2)this.loops++;last=audio.currentTime;});
    const p={audio,gain};this.players.set(scene,p);return p;
  }
  volume(p,value,duration=.8){if(p.gain){const t=this.context.currentTime;p.gain.gain.cancelScheduledValues(t);p.gain.gain.setValueAtTime(p.gain.gain.value,t);p.gain.gain.linearRampToValueAtTime(value,t+duration);}else p.audio.volume=value;}
  setScene(scene){if(!musicTracksByScene[scene])scene='map';if(scene===this.scene)return;this.scene=scene;this.generation++;this.audio=this.players.get(scene)?.audio||null;if(this.started)this.start();}
  async start(){
    this.started=true;if(!this.enabled||document.hidden)return false;
    const scene=this.scene,p=this.createPlayer(scene);this.audio=p.audio;const generation=this.generation;
    try{await Promise.all([this.context?.resume(),p.audio.paused?p.audio.play():Promise.resolve()]);
      if(generation!==this.generation||!this.enabled||document.hidden){if(scene!==this.scene||!this.enabled||document.hidden)p.audio.pause();return false;}
      this.volume(p,sceneVolume(scene));for(const [name,old]of this.players)if(name!==scene&&!old.audio.paused){this.volume(old,0);clearTimeout(old.pauseTimer);old.pauseTimer=setTimeout(()=>{if(name!==this.scene)old.audio.pause();},900);}return true;
    }catch{return false;}
  }
  duck(ms=2800){if(!this.output)return;const t=this.context.currentTime,g=this.output.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(.22,t+.07);g.setValueAtTime(.22,t+ms/1000);g.linearRampToValueAtTime(1,t+ms/1000+.4);}
  pause(){this.generation++;for(const p of this.players.values())p.audio.pause();this.context?.suspend().catch(()=>{});}
  toggle(){this.enabled=!this.enabled;localStorage.setItem('garden-music',this.enabled?'on':'off');if(this.enabled)this.start();else this.pause();return this.enabled;}
}
export const music=new GardenMusic();
document.addEventListener('pointerdown',()=>music.start(),{passive:true});document.addEventListener('keydown',()=>music.start());
document.addEventListener('visibilitychange',()=>document.hidden?music.pause():music.started&&music.start());
window.addEventListener('pagehide',()=>music.pause());window.addEventListener('pageshow',()=>music.started&&music.start());
