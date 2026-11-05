// Original synthesized reward fanfare, timed to the 1.9 second card bloom.
let context;
function shortTone(frequencies,volume=.04,type='sine'){
  try{context ||= new(window.AudioContext||window.webkitAudioContext)();context.resume();const now=context.currentTime;frequencies.forEach((f,i)=>{const o=context.createOscillator(),g=context.createGain(),t=now+i*.065;o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.65,t+.24);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.28);o.connect(g);g.connect(context.destination);o.start(t);o.stop(t+.3);});}catch{}
}
export function drawSound(enabled=true){if(enabled)shortTone([330,495,660,990],.065,'triangle');}
export function wheelSound(enabled=true){
  if(!enabled)return;
  try{context ||= new(window.AudioContext||window.webkitAudioContext)();context.resume();const t=context.currentTime;
    const noise=context.createBuffer(1,Math.ceil(context.sampleRate*.055),context.sampleRate),data=noise.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*8);
    for(const delay of [0,.035]){const src=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();src.buffer=noise;filter.type='highpass';filter.frequency.value=1700;gain.gain.value=.24;src.connect(filter);filter.connect(gain);gain.connect(context.destination);src.start(t+delay);}
    [620,1740,2610].forEach((f,i)=>{const o=context.createOscillator(),g=context.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.065/(i+1),t);g.gain.exponentialRampToValueAtTime(.0001,t+.09);o.connect(g);g.connect(context.destination);o.start(t);o.stop(t+.1);});
  }catch{}
}
export function flipSound(enabled=true,backward=false){if(enabled)shortTone(backward?[720,540,360]:[360,540,720],.06,'triangle');}
export function castSound(enabled=true,kind='tactic'){
  if(!enabled)return;
  try{context ||= new(window.AudioContext||window.webkitAudioContext)();context.resume();const now=context.currentTime;
    const bus=context.createGain(),compressor=context.createDynamicsCompressor();bus.gain.value=.65;bus.connect(compressor);compressor.connect(context.destination);
    const tone=(f,t,d,v,type='sine',to=f)=>{const o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(to,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(bus);o.start(t);o.stop(t+d+.02);};
    const noise=(t,d,frequency,volume)=>{const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*d),context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;const source=context.createBufferSource(),filter=context.createBiquadFilter(),g=context.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(frequency,t);filter.frequency.exponentialRampToValueAtTime(frequency*.3,t+d);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(volume,t+.035);g.gain.exponentialRampToValueAtTime(.0001,t+d);source.connect(filter);filter.connect(g);g.connect(bus);source.start(t);};
    tone(220,now,.4,.13,'triangle',880);noise(now,.4,1500,.22);
    const hit=now+(kind==='tactic'?.65:1.1);
    if(kind==='theorem'){tone(125,hit,.45,.32,'sine',42);noise(hit,.6,700,.55);tone(460,hit,.5,.13,'sawtooth',95);}
    else if(kind==='axiom'){[261.63,329.63,392,523.25,783.99].forEach((f,i)=>tone(f,hit+i*.045,.8,.13,'triangle'));noise(hit,.6,5000,.18);}
    else if(kind==='definition'){[880,1320,1760,1175].forEach((f,i)=>tone(f,hit+i*.055,.3,.11,'sine',f*.65));noise(hit,.6,2400,.33);}
    else if(kind==='hypothesis'){for(let i=0;i<5;i++){noise(now+.6+i*.085,.12,3200,.35);tone(160+i*90,now+.6+i*.085,.1,.13,'sawtooth',800);}}
    else{tone(523,hit,.4,.16,'triangle');tone(1046,hit+.07,.45,.1);noise(hit,.25,1800,.16);}
    setTimeout(()=>{bus.disconnect();compressor.disconnect();},3000);
  }catch{}
}
export function errorSound(enabled=true){if(enabled)shortTone([190,140,95],.045,'triangle');}
export function rewardSound(enabled=true){
  if(!enabled)return;
  try{context ||= new(window.AudioContext||window.webkitAudioContext)();context.resume();const now=context.currentTime;
    const tone=(frequency,t,length,volume,type='sine')=>{const o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.setValueAtTime(frequency,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(g);g.connect(context.destination);o.start(t);o.stop(t+length+.02);};
    [0,.38,.76,1.16].forEach((offset,i)=>{const t=now+offset,base=[130.81,164.81,196,261.63][i];[1,2.01,2.76,4.07,5.43].forEach((ratio,j)=>tone(base*ratio,t,1.4-j*.16,.055/(j+1)));tone(58,t,.42,.075,'triangle');});
    [523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,now+1.65+i*.07,1.2,.035));
  }catch{}
}
