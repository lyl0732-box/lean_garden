import {cardArt} from './card-art.js';
import {escapeHTML as esc} from './ui.js';
import {castSound,errorSound,drawSound} from './sfx.js';
import {wizard,evidenceCard} from './spell-flow.js';
import {music} from './music.js';
import {evolution} from './yaya-forms.js';
const reduced=motion=>!motion||matchMedia('(prefers-reduced-motion: reduce)').matches;
const center=el=>{const r=el?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;};
const targetEl=target=>target==='goal'?document.querySelector('.target-area'):[...document.querySelectorAll('.hypothesis')].find(el=>el.dataset.target===target);
export function drawEvidence(motion=true,sound=true){
  drawSound(sound);music.duck(900);if(reduced(motion))return;
  document.querySelector('.ritual-card-space')?.animate([{opacity:0,transform:'translateY(75px) scale(.3) rotate(-18deg)',filter:'brightness(2.5)'},{opacity:1,transform:'translateY(-8px) scale(1.1) rotate(3deg)',filter:'brightness(1.3)',offset:.7},{opacity:1,transform:'translateY(0) scale(1) rotate(0)',filter:'brightness(1)'}],{duration:780,easing:'cubic-bezier(.2,.8,.25,1)'});
}
export function spellCast({skill='rfl',evidence=null,target='goal',direction='forward',motion=true,sound=true,level=1}={}){
  const rank=evolution(level).stage,power=1+rank*.16;
  const kind=evidence?.kind||'tactic',chain=kind==='hypothesis';music.duck(2200);castSound(sound,kind);
  if(reduced(motion))return Promise.resolve();
  const destination=targetEl(target)||document.querySelector('.target-area');destination?.scrollIntoView({block:'center',behavior:'instant'});
  const end=center(destination)||{x:innerWidth*.6,y:innerHeight*.45};
  const skillPoint=center(document.querySelector(`[data-skill="${CSS.escape(skill)}"]`))||{x:40,y:innerHeight*.5};
  const hyp=chain?[...document.querySelectorAll('.hypothesis')].find(el=>el.dataset.target===evidence.term.split(/[ .(]/)[0]):null;
  const hypothesis=center(hyp)||end;
  document.body.classList.add('casting-spell');
  const stage=document.createElement('div');stage.className='spell-stage spell-'+kind;stage.dataset.effect=chain?'chain':evidence?'summon':'cast';stage.dataset.target=target;stage.setAttribute('aria-hidden','true');
  const canvas=document.createElement('canvas'),ratio=Math.min(2,devicePixelRatio);canvas.width=innerWidth*ratio;canvas.height=innerHeight*ratio;stage.append(canvas);
  stage.dataset.evolution=String(rank+1);stage.style.setProperty('--spell-power',power);
  const actor=document.createElement('div');actor.className='spell-actor is-casting';actor.innerHTML=wizard(level);stage.append(actor);document.body.append(stage);
  const wand=center(actor.querySelector('.wand-tip'))||{x:innerWidth-50,y:innerHeight-150};
  const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);
  const color={theorem:'#cf8cff',axiom:'#ffe28a',definition:'#82e8ff',hypothesis:'#a0ff9d',tactic:'#d9f69b'}[kind];
  const closeup={x:Math.max(85,Math.min(innerWidth-85,innerWidth*.53)),y:Math.max(160,Math.min(innerHeight*.42,end.y-80))};
  const duration=evidence?1750:1100,impact=evidence?1120:660,start=performance.now();let frame,finished=false,shaken=false;
  actor.style.setProperty('--cast-duration',duration+'ms');
  const ghost=document.createElement('div');ghost.className='cast-card kind-tactic';ghost.innerHTML=cardArt(skill)+`<b>${esc(skill)}</b>`;ghost.style.left=skillPoint.x+'px';ghost.style.top=skillPoint.y+'px';stage.append(ghost);
  ghost.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.4) rotate(-18deg)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.2) rotate(9deg)',offset:.4},{opacity:0,transform:`translate(${wand.x-skillPoint.x-60}px,${wand.y-skillPoint.y-60}px) scale(.2) rotate(-20deg)`}],{duration:680,easing:'ease-out',fill:'both'});
  let summonedCard;
  if(evidence&&!chain){const card=document.createElement('div');summonedCard=card;card.className='summoned-closeup';card.innerHTML=evidenceCard(evidence,direction==='backward');card.style.left=closeup.x+'px';card.style.top=closeup.y+'px';stage.append(card);card.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.1) rotateY(-70deg) rotate(-18deg)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.08) rotateY(0) rotate(3deg)',offset:.4},{opacity:1,transform:'translate(-50%,-50%) scale(1) rotate(-3deg)',offset:.74},{opacity:0,transform:`translate(calc(-50% + ${end.x-closeup.x}px),calc(-50% + ${end.y-closeup.y}px)) scale(.12) rotate(20deg)`}],{delay:240,duration:1020,easing:'cubic-bezier(.2,.7,.25,1)',fill:'both'});}
  function beam(from,to,amount,jagged=false){ctx.beginPath();ctx.moveTo(from.x,from.y);for(let i=1;i<=18;i++){const t=i/18*amount,j=i<18?(jagged?(Math.random()-.5)*22:Math.sin(i*.6+performance.now()*.012)*9):0;ctx.lineTo(from.x+(to.x-from.x)*t+j,from.y+(to.y-from.y)*t+j);}ctx.stroke();}
  function draw(now){if(finished)return;const elapsed=now-start;ctx.clearRect(0,0,innerWidth,innerHeight);ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=16+rank*3;ctx.lineWidth=2.5+rank*.5;ctx.globalAlpha=Math.min(1,(duration-elapsed)/250);
    // Follow the animated wand so every evidence chain remains attached to 芽芽.
    const origin=center(actor.querySelector('.wand-tip'))||wand;
    if(chain&&elapsed>300){beam(origin,hypothesis,Math.min(1,(elapsed-300)/250),true);if(elapsed>600)beam(hypothesis,end,Math.min(1,(elapsed-600)/300),true);}
    else if(evidence&&elapsed>300){const source=center(summonedCard)||closeup;beam(origin,source,Math.min(1,(elapsed-300)/300));if(elapsed>870)beam(source,end,Math.min(1,(elapsed-870)/300));}
    else if(!evidence&&elapsed>300){beam(origin,end,Math.min(1,(elapsed-300)/300));}
    if(rank&&elapsed>250&&elapsed<impact){const t=(elapsed-250)/500;for(let i=0;i<rank*3;i++){const a=now*.002+i*Math.PI*2/(rank*3),r=18+(i%3)*9;ctx.beginPath();ctx.arc(origin.x+Math.cos(a)*r,origin.y+Math.sin(a)*r,1.5+(i%2),0,Math.PI*2);ctx.fill();}}
    if(elapsed>impact){const t=Math.min(1,(elapsed-impact)/(duration-impact)),radius=(25+t*75)*power;ctx.globalAlpha=1-t;
      if(!shaken&&['theorem','axiom'].includes(kind)){shaken=true;stage.dataset.shake='true';document.querySelector('#app')?.animate([{transform:'translate(0,0)'},{transform:'translate(-7px,4px)'},{transform:'translate(6px,-3px)'},{transform:'translate(-4px,2px)'},{transform:'translate(2px,-1px)'},{transform:'translate(0,0)'}],{duration:360});navigator.vibrate?.([25,20,40]);}
      if(kind==='axiom'){for(let i=0;i<20;i++){const a=i*Math.PI/10;ctx.lineWidth=i%2?2:6;ctx.beginPath();ctx.moveTo(end.x+Math.cos(a)*18,end.y+Math.sin(a)*18);ctx.lineTo(end.x+Math.cos(a)*radius*1.8,end.y+Math.sin(a)*radius*1.8);ctx.stroke();}}
      else if(kind==='definition'){for(let i=0;i<4;i++){ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(end.x,end.y,radius+i*12,radius*.45+i*7,t+i*.5,0,Math.PI*2);ctx.stroke();}}
      else if(kind==='theorem'){const gradient=ctx.createRadialGradient(end.x,end.y,0,end.x,end.y,radius);gradient.addColorStop(0,'#fff1ff');gradient.addColorStop(.3,'#d384ff');gradient.addColorStop(1,'#9145d900');ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(end.x,end.y,radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e9afff';ctx.lineWidth=8;ctx.beginPath();ctx.arc(end.x,end.y,radius*1.3,0,Math.PI*2);ctx.stroke();}
      else{ctx.beginPath();ctx.arc(end.x,end.y,radius,0,Math.PI*2);ctx.stroke();}
      if(rank>1){for(let i=0;i<Math.floor(rank/2);i++){ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(end.x,end.y,radius*(1.1+i*.18),radius*(.38+i*.08),now*.001+i,0,Math.PI*2);ctx.stroke();}}
      const particles=20+rank*6;for(let i=0;i<particles;i++){const a=i*Math.PI*2/particles,d=radius*(1+(i%4)*.17);ctx.fillStyle=color;ctx.beginPath();ctx.arc(end.x+Math.cos(a)*d,end.y+Math.sin(a)*d,(1-t)*(2+rank*.3)+1,0,Math.PI*2);ctx.fill();}
    }ctx.restore();if(elapsed<duration)frame=requestAnimationFrame(draw);
  }frame=requestAnimationFrame(draw);
  return new Promise(resolve=>setTimeout(()=>{finished=true;cancelAnimationFrame(frame);stage.remove();document.body.classList.remove('casting-spell');resolve();},duration+40));
}
export function damageEffect({motion=true,sound=true}={}){
  errorSound(sound);document.querySelector('.damage-vignette')?.remove();const el=document.createElement('div');el.className='damage-vignette'+(reduced(motion)?' reduced':'');el.setAttribute('aria-hidden','true');document.body.append(el);
  if(!reduced(motion))document.querySelector('.proof-arena')?.animate([{transform:'translateX(0)'},{transform:'translateX(-5px)'},{transform:'translateX(4px)'},{transform:'translateX(-2px)'},{transform:'translateX(0)'}],{duration:320});
  setTimeout(()=>el.remove(),reduced(motion)?220:650);
}
