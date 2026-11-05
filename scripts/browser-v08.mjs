import {chromium} from 'file:///D:/claude-code/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

process.env.GARDEN_DATA_DIR=path.resolve('artifacts','browser-v08-'+Date.now());
const {createServer}=await import('../server/index.mjs');
const server=await createServer();
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
let context;
const checks=[],errors=[],timings=[],castResults=[],layouts=[];
try{
  context=await chromium.launchPersistentContext('C:/Users/Lenovo/.playwright-chrome-profile',{headless:true,channel:'chrome',viewport:{width:390,height:844},locale:'zh-CN'});
  await context.addInitScript(()=>{
    localStorage.setItem('garden-motion','on');
    localStorage.setItem('garden-sound','off');
    localStorage.setItem('garden-music','off');
    window.guideFrames=[];window.castTraces=[];
    function sample(){
      const guide=document.querySelector('#guided-tutorial');
      if(guide&&document.querySelector('.math-target'))window.guideFrames.push({t:performance.now(),lesson:document.querySelector('.battle-header h2')?.textContent.slice(0,2),step:guide.dataset.step,leaving:guide.classList.contains('is-leaving'),opacity:Number(getComputedStyle(guide).opacity)});
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
    const traces=new WeakMap(),original=CanvasRenderingContext2D.prototype.moveTo;
    CanvasRenderingContext2D.prototype.moveTo=function(x,y){
      const stage=this.canvas.closest('.spell-stage');
      if(stage){
        let trace=traces.get(stage);
        if(!trace){trace={kind:stage.className,target:stage.dataset.target,start:performance.now(),points:[]};traces.set(stage,trace);window.castTraces.push(trace);}
        const rect=stage.querySelector('.wand-tip')?.getBoundingClientRect();
        const card=stage.querySelector('.summoned-closeup')?.getBoundingClientRect();
        trace.points.push({t:performance.now()-trace.start,x,y,color:this.strokeStyle,wand:rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:null,card:card?{x:card.left+card.width/2,y:card.top+card.height/2}:null});
      }
      return original.call(this,x,y);
    };
  });
  const page=await context.newPage();await page.bringToFront();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  const action=id=>page.locator(`[data-action="${id}"]`);
  const idle=()=>page.waitForFunction(()=>!document.querySelector('#scene-transition,.spell-stage,.verifying'));
  const step=key=>page.waitForFunction(key=>document.querySelector('#guided-tutorial')?.dataset.step===key,key);
  const visible=()=>page.waitForFunction(()=>getComputedStyle(document.querySelector('#guided-tutorial')).opacity==='1');
  const record=text=>{checks.push(text);console.log(text);};
  async function teachingClick(selector,next){
    const start=await page.evaluate(()=>performance.now());await page.locator(selector).click();
    await page.waitForTimeout(1000);
    const early=await page.locator('#guided-tutorial').evaluate(el=>({step:el.dataset.step,opacity:Number(getComputedStyle(el).opacity)}));
    assert.notEqual(early.step,next);assert.ok(early.opacity<.01,JSON.stringify(early));
    await step(next);await visible();
    const first=await page.evaluate(({start,next})=>guideFrames.find(f=>f.t>=start&&f.step===next&&f.opacity>0),{start,next});
    const delay=first.t-start;assert.ok(delay>=1950&&delay<3100,JSON.stringify({next,delay}));
    timings.push({step:next,delayMs:delay});
  }
  async function automaticStep(next){
    await step(next);await visible();
    const timing=await page.evaluate(next=>{
      const index=guideFrames.findIndex(f=>f.step===next&&f.opacity>0);
      const before=guideFrames.slice(0,index);
      const start=before.findLast((f,i)=>f.leaving&&!before[i-1]?.leaving);
      return {step:next,delayMs:guideFrames[index].t-start.t};
    },next);
    assert.ok(timing.delayMs>=1950&&timing.delayMs<2800,JSON.stringify(timing));timings.push(timing);
  }
  async function go(id){const response=page.waitForResponse(r=>r.url().endsWith('/api/level/start'));await page.goto(base+'/#battle/'+id);await response;await idle();await page.locator('.battle-layout').waitFor();}
  async function rewards(){
    await page.locator('.unlock-modal,.topic-celebration,.victory-modal,.reward-guide').waitFor();
    for(let i=0;i<50;i++){
      if(await page.locator('.victory-modal').count())return;
      for(const id of ['learn-topic','reveal-card','learn-card'])if(await action(id).count()){
        await action(id).click({force:true});if(id==='reveal-card')await page.locator('.reward-guide').waitFor();break;
      }
      await page.waitForTimeout(200);
    }
    throw new Error('Rewards did not finish');
  }
  async function rfl(){const response=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));await page.locator('[data-skill="rfl"]').click();assert.equal((await(await response).json()).complete,true);await idle();await rewards();}
  async function cast(kind,guided=false){
    if(guided)await teachingClick('[data-action="arm-spell"]',(kind==='hypothesis'?'n02':'n03')+'-target');
    else await action('arm-spell').click();
    const response=page.waitForResponse(r=>r.url().endsWith('/api/level/step'));
    await page.locator('[data-action="pick-target"][data-target="goal"]').click({force:!guided});
    await page.locator('.spell-stage').waitFor();await page.waitForTimeout(980);
    assert.equal(await page.locator('.spell-actor:visible').count(),1);
    assert.equal(await page.locator('.wizard-guide:visible').count(),0);
    await page.screenshot({path:`artifacts/v08-cast-${kind}.png`});
    const result=await(await response).json();assert.ok(!result.rejected,JSON.stringify(result));await idle();
    const trace=await page.evaluate(()=>window.castTraces.at(-1));
    const color={definition:'#82e8ff',theorem:'#cf8cff',axiom:'#ffe28a',hypothesis:'#a0ff9d'}[kind];
    const fromWand=trace.points.filter(p=>p.wand&&Math.hypot(p.x-p.wand.x,p.y-p.wand.y)<2);
    assert.ok(fromWand.length>=10,JSON.stringify({kind,trace}));
    assert.ok(fromWand.every(p=>p.color===color),JSON.stringify({kind,colors:fromWand.map(p=>p.color)}));
    assert.ok(fromWand.some(p=>p.t>600),'The wand chain must remain through the target phase');
    assert.ok(Math.hypot(fromWand[0].x-fromWand.at(-1).x,fromWand[0].y-fromWand.at(-1).y)>5,'The chain must follow the moving wand');
    if(kind!=='hypothesis')assert.ok(trace.points.some(p=>p.card&&Math.hypot(p.x-p.card.x,p.y-p.card.y)<2),'The second link must start at the summoned card');
    castResults.push({kind,color,wandSamples:fromWand.length,cardToTarget:kind!=='hypothesis',actualTarget:result.goals[0]?.target});
    assert.equal(await page.locator('.spell-stage').count(),0);return result;
  }
  async function draw(skill,kind,term){
    await page.locator(`[data-skill="${skill}"]`).click();await page.locator(`[data-action="evidence-category"][data-kind="${kind}"]`).click();
    await page.locator('.wheel-window').focus();await page.keyboard.press('Home');
    for(let i=0;i<100;i++){
      if(await page.locator('.wheel-card.is-centered code').innerText()===term.replaceAll('Nat.succ','succ'))break;
      await page.keyboard.press('ArrowDown');if(i===99)throw new Error('Missing card '+term);
    }
    await action('draw-focused').click();await page.locator('.preparation-modal').waitFor();
  }

  await page.goto(base);await action('story-skip').click();await page.locator('.home-title').waitFor();
  await go('n01');await step('n01-rfl');await visible();
  const frames=await page.evaluate(()=>guideFrames),first=frames.find(f=>f.opacity>0);
  const delay=first.t-frames[0].t;
  assert.ok(delay>=1950&&delay<2800,JSON.stringify({delay,first:frames[0],visible:first}));
  assert.ok(frames.filter(f=>f.t-frames[0].t<1900).every(f=>f.opacity===0));
  assert.ok(frames.some(f=>f.opacity>0&&f.opacity<1));timings.push({level:'n01',delayMs:delay});
  await action('settings').click({force:true});assert.equal(await page.locator('.modal').count(),0);
  await rfl();record('The first mask waits 2 seconds, fades in, and still blocks unrelated controls; lesson 1 passes real Lean.');

  for(const [id,kind] of [['n02','hypothesis'],['n03','definition']]){
    await go(id);await step(id+'-rw');await visible();
    const frames=(await page.evaluate(()=>guideFrames)).filter(f=>f.lesson===id.slice(1)),first=frames.find(f=>f.opacity>0);
    assert.ok(first.t-frames[0].t>=1950);timings.push({level:id,delayMs:first.t-frames[0].t});
    await teachingClick('[data-skill="rw"]',id+'-category');
    assert.equal(await page.locator('.draw-categories [role="tab"]').count(),4);
    const speech=await page.locator('.tutorial-speech').innerText();for(const label of ['定理','公理','定义','已知命题'])assert.ok(speech.includes(label));
    assert.equal(await page.locator('.draw-categories [aria-selected="true"]').count(),1);
    assert.equal(await page.locator('[data-kind="theorem"]').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('.wheel-window').count(),1);
    assert.equal(await page.locator('.category-intro').count(),0);
    assert.equal(await action('draw-focused').count(),1);
    await page.locator('[data-kind="axiom"]').click({force:true});assert.equal(await page.locator('[data-kind="theorem"]').getAttribute('aria-selected'),'true');
    await page.locator('[data-kind="theorem"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-kind="theorem"]').getAttribute('aria-selected'),'true');
    if(id==='n03')for(const [width,height] of [[320,568],[768,1024],[390,844]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(350);
      const bounds=await page.evaluate(()=>{const a=document.querySelector('.tutorial-speech').getBoundingClientRect(),b=document.querySelector('[data-kind="definition"]').getBoundingClientRect();return{width:innerWidth,height:innerHeight,speechTop:a.top,speechBottom:a.bottom,buttonTop:b.top,buttonBottom:b.bottom,overlap:a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top};});
      assert.equal(bounds.overlap,false,JSON.stringify(bounds));assert.ok(bounds.buttonTop>=0&&bounds.buttonBottom<=height);assert.ok(bounds.speechTop>=0&&bounds.speechBottom<=height);layouts.push(bounds);
    }
    await page.screenshot({path:`artifacts/v08-category-${kind}.png`});
    await teachingClick(`[data-action="evidence-category"][data-kind="${kind}"]`,id+'-draw');
    assert.equal(await page.locator(`[data-kind="${kind}"]`).getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('.wheel-window').count(),1);
    await teachingClick('[data-action="draw-focused"]',id+(id==='n03'?'-backward':'-arm'));
    if(id==='n03'){
      await action('arm-spell').click({force:true});assert.equal(await page.locator('.ritual-flipper.flipped').count(),0);
      await teachingClick('[data-action="flip-card"][data-direction="backward"]','n03-arm');
      assert.equal(await page.locator('.ritual-flipper.flipped').count(),1);
      assert.equal(await page.locator('.ritual-face.back .ritual-formula').innerText(),'succ 0 = 1');
      await page.screenshot({path:'artifacts/v08-tutorial-flip.png'});
    }
    const result=await cast(kind,true);assert.equal(result.goals[0].target,id==='n02'?'b = b':'1 = 1');
    if(id==='n03')assert.ok(result.proof.some(code=>code.includes('←')));
    await automaticStep(id+'-rfl');await rfl();
  }
  const progress=await page.evaluate(async()=>(await(await fetch('/api/bootstrap')).json()).progress);
  assert.deepEqual(progress.guidedTutorials,['n01','n02','n03']);
  record('Repositories open directly on the theorem wheel; lessons 2 and 3 require manually switching to hypotheses and definitions, and both proofs pass Lean.');
  record('Every teaching phase waits 2 seconds before its mask fades in: skill, category, drawing, confirmation and target selection are checked separately.');
  record('Lesson 3 requires flipping the card backward: its reverse formula is succ 0 = 1, Lean receives the reverse rewrite and the target becomes 1 = 1 before rfl.');
  record('The longer category explanation and highlighted button remain separate and visible at phone and tablet sizes.');

  await page.goto(base+'/#home');await page.locator('.home-title').waitFor();await action('freeplay').click();await page.locator('.level-map').waitFor();await idle();
  await go('n13');await draw('rw','theorem','Nat.add_assoc');await cast('theorem');
  await go('n09');await draw('apply','axiom','Nat.succ.inj');await cast('axiom');
  record('Definition, theorem and axiom chains start at the moving wand, reach the summoned card and the actual target in blue, purple and gold; the green hypothesis chain still works.');

  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced=await page.evaluate(async()=>{const {spellCast}=await import('/effects.js');await spellCast({evidence:{kind:'definition'},sound:false});return document.querySelectorAll('.spell-stage').length;});
  assert.equal(reduced,0);await page.emulateMedia({reducedMotion:'no-preference'});
  const disabled=await page.evaluate(async()=>{const {spellCast}=await import('/effects.js');await spellCast({evidence:{kind:'theorem'},motion:false,sound:false});return document.querySelectorAll('.spell-stage').length;});assert.equal(disabled,0);
  record('Animation-off and system reduced-motion settings suppress casting effects; completed stages are removed.');
  assert.deepEqual(errors,[]);
  const report={date:new Date().toISOString(),checks,timings,castResults,layouts,errors,dataDirectory:process.env.GARDEN_DATA_DIR};
  await writeFile('artifacts/browser-v08-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({timings,castResults,errors}));
}catch(error){
  const details=await context?.pages().at(-1)?.evaluate(()=>({visibility:document.visibilityState,frames:window.guideFrames,traces:window.castTraces})).catch(()=>null);
  await writeFile('artifacts/browser-v08-failure.json',JSON.stringify({error:String(error),details},null,2));
  await context?.pages().at(-1)?.screenshot({path:'artifacts/v08-failure.png',fullPage:true}).catch(()=>{});throw error;
}finally{
  await context?.close();await new Promise(r=>server.close(r));
}
