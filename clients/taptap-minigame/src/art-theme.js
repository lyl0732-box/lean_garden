const {colors}=require('./canvas-ui.js');
const disclosure=require('../ai-disclosure.json');
const kindNames={tactic:'技能',definition:'定义',theorem:'定理',axiom:'公理'};
const kindColors={tactic:'#718f50',definition:'#5d94ae',theorem:'#9370ad',axiom:'#bf884f'};
const stages=[1,3,5,8,11,14,18,22];
const stageFor=level=>Math.max(0,stages.filter(n=>level>=n).length-1);

function toolbar(game,x,y,w){
  const u=game.ui,e=game.economy,compact=w<500,tool=compact?37:42,gap=7;
  u.box(x,y,76,37,'#fff4d9','#b7a369',20);u.text('ϟ',x+11,y+5,24,'#8a783d','left',true);u.text(e.energy+'/50',x+34,y+11,12,'#776c44','left',true);u.hit('page','shop',x,y,76,37);
  const right=x+w,tools=[['checkin',null,'trophy'],['page','settings','settings'],['sound',null,game.platform.sound?'music':'musicOff']];
  for(let i=0;i<tools.length;i++){const [id,value,icon]=tools[i],tx=right-(i+1)*tool-i*gap;u.button(id,'',tx,y,tool,37,{value,light:true});u.glyph(icon,tx+(tool-23)/2,y+6,23,true);}
  const gx=right-tools.length*(tool+gap)-67;u.box(gx,y,62,37,'#e2f3f2','#8eb4bb',19);u.glyph('diamond',gx+7,y+8,22,true);u.text(e.unlimited?'∞':e.diamonds,gx+33,y+11,12,'#527f8e','left',true);u.hit('page','shop',gx,y,62,37);
}

function door(game,key,x,y,w,h){
  const u=game.ui,art=u.art.home[key],texts={adventure:['一张卡 · 一次新发现','打开地图，沿着花径出发'],mini:['花园里的特别谜题','带上已经学会的本领'],garden:['每一份知识，都开成花','技能 · 定义 · 定理 · 公理']},large=h>=100;
  u.wood(art.background,x,y,w,h);
  const size=Math.min(59,h*.56),ix=x+Math.max(16,w*.045),iy=y+(h-size)/2;
  u.image(art.emblem,ix,iy,size,size);
  const tx=ix+size+15,tw=w-(tx-x)-37;
  const labelH=Math.min(41,h*.32),labelY=y+(h-labelH)/2;
  if(large)u.text(texts[key][0],tx,y+Math.max(14,h*.17),9,'#f3edc9');
  u.image(art.label,tx,labelY-1,tw,labelH);
  if(h>=90)u.text(texts[key][1],tx,labelY+labelH+5,10,'#f1e9c1');
  u.glyph('arrow',x+w-32,y+h/2-10,20);u.hit('page',key==='adventure'?'map':key,x,y,w,h);
}

function companion(game,x,y,w,h,{growth=false}={}){
  const u=game.ui,e=game.economy,index=stageFor(e.growth.level),bob=Math.sin(Date.now()/650)*2;
  u.ctx.save();u.ctx.fillStyle='#e4f5ae40';u.ctx.beginPath();u.ctx.ellipse(x+w/2,y+h-9,w*.38,10,0,0,Math.PI*2);u.ctx.fill();u.ctx.restore();
  const pictureH=growth?h-58:h-12;u.image(game.assets.yaya[index],x,y+bob,w,pictureH);
  if(growth){u.box(x+4,y+h-60,w-8,57,'#fff8dded','#afbc86',13);u.text('Lv.'+e.growth.level+' · 芽芽',x+w/2,y+h-51,12,colors.ink,'center',true);u.box(x+15,y+h-30,w-30,6,'#d7e1bd',null,3);u.box(x+15,y+h-30,Math.max(3,(w-30)*e.growth.current/e.growth.required),6,'#9b7cb6',null,3);u.text(e.growth.current+' / '+e.growth.required+' EXP',x+w/2,y+h-19,9,colors.muted,'center');}
  else u.text('Lv.'+e.growth.level+' · 点我看成长',x+w/2,y+h-6,9,'#fff5c5','center');
  u.hit('about',null,x,y,w,h);
}

function utilities(game,x,y,w,{compact=false}={}){
  const u=game.ui,e=game.economy,h=compact?32:36;
  u.button('freeplay',game.state.data.progress.freePlay?'自由选关 · 开':'自由选关 · 关',x,y,w,h,{light:true,size:11});
  const gap=8,bw=(w-gap)/2;u.button('page','星钻小铺',x,y+h+8,bw,h,{value:'shop',color:'#ac8853',size:11});u.button('reset-progress','重置进度',x+bw+gap,y+h+8,bw,h,{light:true,size:11});
  if(e.freeplayRemainingMs>0)u.text('选关额度 '+Math.ceil(e.freeplayRemainingMs/60000)+' 分钟',x+w/2,y+h*2+21,9,'#fff6d9','center');
}

function home(game){
  const u=game.ui,w=u.w,h=u.h,top=u.top+16,bottom=h-u.bottom,data=game.state.data;
  const c=u.ctx;c.save();const light=c.createLinearGradient(0,0,0,h);light.addColorStop(0,'#d0efd250');light.addColorStop(.45,'#426a2820');light.addColorStop(1,'#193a1cdd');c.fillStyle=light;c.fillRect(0,0,w,h);c.fillStyle='#fff7cc22';for(let i=0;i<4;i++){c.beginPath();c.moveTo(w*.38+i*32,-10);c.lineTo(-130+i*170,h*.52);c.lineTo(-50+i*180,h*.52);c.closePath();c.fill();}c.restore();
  toolbar(game,16,top,w-32);
  if(w<600){
    const titleH=Math.min(148,Math.max(100,h*.17)),titleY=top+53,utilitiesH=94,chapterH=46,footerH=47;
    u.image(u.art.home.title,25,titleY,w-50,titleH);
    const doorY=titleY+titleH+9,tail=bottom-footerH-chapterH-utilitiesH-15,doorGap=13,doorH=(tail-doorY-doorGap*2)/3;
    ['adventure','mini','garden'].forEach((key,i)=>door(game,key,20,doorY+i*(doorH+doorGap),w-40,doorH));
    companion(game,22,tail+11,95,91);utilities(game,142,tail+17,w-166,{compact:h<760});
    const cy=bottom-footerH-chapterH+2,cw=(w-46)/2;
    data.chapters.filter(c=>c.id!=='m').forEach((ch,i)=>{const x=23+(i%2)*(cw+7),y=cy+Math.floor(i/2)*22;u.glyph(ch.icon||['seed','tree','water','temple'][i],x,y,17);const total=data.levels.filter(l=>l.chapter===ch.id),done=total.filter(l=>l.result).length;u.text(ch.name,x+23,y+3,10,'#fff6d3');u.text(done+'/'+total.length,x+cw-5,y+3,9,'#e1eac7','right');});
  }else{
    const leftW=w*.43,titleH=Math.min(130,(bottom-top)*.24);u.image(u.art.home.title,25,top+53,leftW-35,titleH);
    const utilitiesY=bottom-136,heroY=top+titleH+62,heroH=Math.max(68,utilitiesY-heroY-12);companion(game,65,heroY,leftW-110,heroH,{growth:heroH>=160});utilities(game,37,utilitiesY,leftW-59,{compact:true});
    const x=leftW+14,dw=w-x-22,dy=top+57,gap=15,dh=(bottom-70-dy-gap*2)/3;
    ['adventure','mini','garden'].forEach((key,i)=>door(game,key,x,dy+i*(dh+gap),dw,dh));
  }
  const aiY=bottom-43,noticeW=Math.min(w-36,370);u.box((w-noticeW)/2,aiY,noticeW,32,'#fff9e8f2','#d5bc7d',12);u.text(disclosure.label,(w-noticeW)/2+13,aiY+10,11,'#725a2f','left',true);u.text(disclosure.short,(w-noticeW)/2+94,aiY+10,11,colors.ink);
  u.scroll=0;u.maxScroll=0;
}

function chapterBanner(game,ch,x,y,w,h=112){const u=game.ui;u.box(x,y,w,h,'#e8efd2','#a4b581',19);u.ctx.save();u.round(x+3,y+3,w-6,h-6,16);u.ctx.clip();u.image(u.art.scenes[ch.id]||u.art.scenes.n,x,y,w,h,true);u.ctx.fillStyle='#23452b35';u.ctx.fillRect(x,y,w,h);u.ctx.restore();u.text('ADVENTURE',x+17,y+15,8,'#fff3c4');u.heading(ch.name,x+17,y+36,25,'#fff8d7');const levels=game.state.data.levels.filter(l=>l.chapter===ch.id),completed=levels.filter(l=>l.result).length;u.text(completed+' / '+levels.length+' 个证明已绽放',x+18,y+h-24,11,'#fff8d7');}

function map(game){
  const u=game.ui,s=game.state,mini=s.page==='mini';u.header(mini?'玩玩小游戏':'冒险地图');let y=u.startContent();const levels=s.data.levels.filter(l=>l.chapter===(mini?'m':s.chapter));
  if(!mini){const chapters=s.data.chapters.filter(ch=>ch.id!=='m'),bw=(u.w-48)/2;chapters.forEach((ch,i)=>{const x=18+i%2*(bw+12),cy=y+Math.floor(i/2)*49;u.button('chapter',ch.name,x,cy,bw,40,{value:ch.id,selected:s.chapter===ch.id,color:ch.id===s.chapter?'#70854c':'#88956b',size:12});});y+=107;chapterBanner(game,chapters.find(c=>c.id===s.chapter)||chapters[0],18,y,u.w-36);y+=124;u.button('continue','继续冒险',18,y,bw,39,{color:'#a5854d',size:13});u.button('freeplay',s.data.progress.freePlay?'退出自由选关':'自由选关',30+bw,y,bw,39,{light:true,size:13});y+=61;}
  else{u.box(18,y,u.w-36,105,'#fff6ddee','#9ea879',18);u.image(game.assets.yaya[stageFor(game.economy.growth.level)],26,y+6,79,87);u.heading('花园里的特别谜题',113,y+18,21);u.para('只用已经掌握的卡牌，挑战另一条证明之路。',113,y+52,u.w-147,12,colors.muted,2);y+=123;}
  if(mini){for(const l of levels){const hh=130;u.wood(u.art.home.mini.background,18,y,u.w-36,hh);u.image(u.art.boss,29,y+25,76,76);u.heading(l.title,115,y+17,22,'#fff5cc');u.text(l.difficulty||'花园挑战',116,y+49,11,'#f0e6b9');u.button('start',l.open?'挑战谜题':'尚未解锁',u.w-132,y+79,95,34,{value:l.id,disabled:!l.open,light:true,size:12});y+=hh+18;}u.endContent(y);return;}
  const trailTop=y,step=99,points=levels.map((l,i)=>({l,x:u.w/2+Math.sin(i*1.08)*u.w*.23,y:trailTop+40+i*step})),c=u.ctx;
  if(points.length){c.save();c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle='#586b3f7a';c.lineWidth=28;c.stroke();c.strokeStyle='#dcd49d';c.lineWidth=22;c.stroke();c.setLineDash([2,12]);c.strokeStyle='#f9edbd';c.lineWidth=3;c.stroke();c.restore();}
  for(let i=0;i<points.length;i++){const {l,x, y:cy}=points[i],boss=l.boss||l.miniBoss,open=l.open,size=boss?78:59;if(cy+55<u.clipTop||cy-60>u.clipBottom)continue;
    if(boss){u.image(u.art.boss,x-size/2,cy-size/2,size,size);u.text(l.boss?'终章守卫':'小首领',x,cy-size/2-13,10,'#fff4bf','center',true);}
    else{c.save();c.shadowColor='#29452855';c.shadowOffsetY=5;c.beginPath();c.arc(x,cy,29,0,Math.PI*2);const gradient=c.createLinearGradient(x,cy-30,x,cy+30);gradient.addColorStop(0,open?'#acc667':'#b1b698');gradient.addColorStop(1,open?'#668347':'#8a9678');c.fillStyle=gradient;c.fill();c.shadowColor='transparent';c.strokeStyle=open?'#e9edba':'#d1d4bb';c.lineWidth=4;c.stroke();c.restore();if(open)u.heading(l.number,x,cy-13,27,'#fff7d4','center');else u.glyph('lock',x-13,cy-13,26);}
    const lx=x<u.w/2?x+43:x-179,ly=cy-20;u.box(lx,ly,137,45,'#fff8dff0',boss?'#c4a264':'#b5c39a',12);u.para(l.title,lx+10,ly+8,117,12,colors.ink,2);if(l.result)u.text('★'.repeat(l.result.stars),x,cy+34,13,'#ffed98','center',true);u.hit('start',l.id,Math.min(x-size/2,lx),cy-42,Math.max(x+size/2,lx+137)-Math.min(x-size/2,lx),85);if(!open)u.hits.pop();
  }
  u.endContent(trailTop+points.length*step+18);
}

function garden(game){
  const u=game.ui,s=game.state;u.header('禅净花园');let y=u.startContent();
  u.box(18,y,u.w-36,89,'#f7f4dcf5','#b9c998',18);u.image(game.assets.yaya[0],25,y+2,73,80);u.heading('每一份知识，都开成花',107,y+17,19);u.text('已经发现 '+game.known.size+' 张知识卡',108,y+48,12,colors.muted);y+=103;
  const bw=(u.w-52)/4;Object.entries(kindNames).forEach(([kind,label],i)=>u.button('garden-filter',label,16+i*(bw+6),y,bw,39,{value:kind,color:kindColors[kind],selected:s.filter===kind}));y+=51;
  const all=s.data.cards.filter(c=>c.kind===s.filter),known=all.filter(c=>game.known.has(c.id));u.text(known.length+' / '+all.length+' 已发现',21,y+11,12,'#fff7d5');u.button('known-only',s.knownOnly?'☑ 只看已发现':'☐ 只看已发现',u.w-168,y,147,34,{light:true,size:11});y+=49;
  const cards=all.filter(c=>!s.knownOnly||game.known.has(c.id)),columns=u.w>600?4:2,cw=(u.w-36-(columns-1)*14)/columns,ch=218;
  cards.forEach((card,i)=>{const x=18+(i%columns)*(cw+14),cy=y+Math.floor(i/columns)*(ch+22),found=game.known.has(card.id);if(cy+ch<u.clipTop||cy>u.clipBottom)return;u.card(x,cy,cw,ch,s.filter);
    if(found){u.box(x+10,cy+11,cw-20,111,'#fffce9','#d9d6b9',9);u.image(game.assets.cards[card.id]||game.assets.cards.unknown,x+13,cy+13,cw-26,107);u.heading(card.name,x+cw/2,cy+135,16,kindColors[s.filter],'center');u.text(card.id,x+cw/2,cy+160,10,colors.muted,'center');u.text(kindNames[s.filter]+' · 点击温习',x+cw/2,cy+188,11,kindColors[s.filter],'center');u.hit('card',card.id,x,cy,cw,ch);const quiz=s.data.garden.pending.find(q=>q.cardId===card.id);if(quiz)u.button('quiz','想考考你！ +'+quiz.reward+'钻',x+7,cy+7,cw-14,32,{value:quiz.id,size:10,color:'#ba9652'});}
    else{u.text('⊘',x+cw/2,cy+45,63,'#aab39a','center');u.heading('尚未发现',x+cw/2,cy+140,18,'#8d9b7b','center');u.text('旅途中再见',x+cw/2,cy+176,11,'#9fa88e','center');}
  });u.endContent(y+Math.ceil(cards.length/columns)*(ch+22));
}

module.exports={home,map,garden,stageFor,companion};
