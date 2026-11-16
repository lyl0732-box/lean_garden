import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { levels, chapters, cards, campaign, byId, canEnter, unlocked, actionsFor, publicLevel } from './content.mjs';
import { checkLean, sourceFor, root, engineHealth } from './lean.mjs';
import { initStore, getProfile, profileById, save, exclusive } from './store.mjs';
import { repository, selectedRewrite, selectedApply, selectedInduction, introductions } from './rewrite.mjs';
import { nextHint } from './hints.mjs';
import {activeProfile} from './freeplay.mjs';
import {explainLeanError} from './error-guide.mjs';
import {selectedWitness,actionTarget} from './witness.mjs';
import {economySummary,beginRun,awardRun,useHint,useAnswer,claimBeta,refillEnergy,claimTrial,changeFreeplay,requireFreeplayTime,attachBenefits,expireFreeplay} from './economy.mjs';
import {claimCheckin} from './checkin.mjs';
import {selectedRewriteCode} from './rewrite-code.mjs';
import {shopInfo,purchase,topup,startRewardAd,finishRewardAd,configureRewardAds} from './commerce.mjs';
import {configuredAppwin} from './appwin.mjs';
import {initAccounts,sessionAccount,accountProfile,publicAccount,legacyPreview,login,register,logout,passwordHint,sessionCookie,rememberedAccount,resumeRemembered,rememberAccount,rememberCookie} from './accounts.mjs';
import {refreshQuizzes,quizSummary,quizFor,answerQuiz} from './garden-quiz.mjs';
import {Presence} from './presence.mjs';
import {startManagement} from './management.mjs';
import {dataDir} from './store.mjs';

const publicDir=path.join(root,'public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.ico':'image/x-icon','.mp3':'audio/mpeg','.apk':'application/vnd.android.package-archive'};
const fail=(status,message)=>Object.assign(new Error(message),{status});
const pendingTopics=profile=>profile.isPractice?[]:[...new Set(campaign.filter(l=>profile.completed[l.id]).flatMap(l=>l.discoveries||[]))].filter(id=>!(profile.topicsLearned||[]).includes(id));
const summary=profile=>({completed:profile.completed,unlocked:[...unlocked(profile)],collectionUnlocked:profile.collectionUnlocked,freePlay:!!profile.isPractice,prologueSeen:!!profile.prologueSeen,tutorials:profile.tutorials||[],guidedTutorials:profile.guidedTutorials||[],introduced:profile.introduced,lastLevel:profile.lastLevel,visited:profile.visited,economy:economySummary(profile),stars:Object.values(profile.completed).reduce((s,r)=>s+r.stars,0)});
function bootstrap(profile,account=null,owner=profile) {return {chapters,cards,levels:levels.map(l=>publicLevel(l,profile)),progress:summary(profile),account:account?publicAccount(account):null,shop:shopInfo(),garden:quizSummary(owner),pendingCards:introductions(profile),pendingTopics:pendingTopics(profile)};}
function attemptFor(profile,id) {return profile.attempts[id]||{steps:[],hints:0,mistakes:0,revision:0};}
function codesFor(level,steps) {
  const all=[...level.actions];
  // Steps contain authored actions or code rebuilt by our restricted selectors.
  const fake={visited:campaign.map(l=>l.id),completed:Object.fromEntries(campaign.map(l=>[l.id,{}]))};
  all.push(...actionsFor(fake,level));
  return steps.map(id=>{if(typeof id==='object'&&typeof id.code==='string')return id.code;const action=all.find(a=>a.id===id);if(!action&&level.id==='n13'&&id==='n13-1')return 'garden_strict_rw [Nat.add_comm b c]';if(!action)throw fail(400,'存档包含未知卡牌。');return action.code;});
}
function statePayload(level,profile,attempt,result) {
  const proof=codesFor(level,attempt.steps),repo=repository(profile,level,result.goals);
  const actions=actionsFor(profile,level).filter(a=>a.skill!=='use').map(a=>({...a,effectTarget:actionTarget(a,result.goals)}));
  if(unlocked(profile).has('use'))actions.push({id:'use-manual',skill:'use',label:'亲手构造见证',effectTarget:'goal'});
  for(const skill of ['rw','apply','induction'])if(unlocked(profile).has(skill)&&!actions.some(a=>a.skill===skill))actions.push({id:`${skill}-selector`,skill,label:'选择使用对象'});
  // Lean's strict rfl checks the current written equality, independently of
  // the reference route. Keep the legacy field empty for older clients.
  return {level:publicLevel(level,profile),attempt,proof,goals:result.goals,complete:result.complete,elapsed:result.elapsed,actions,repository:repo,applyRepository:repository(profile,level,result.goals,'apply'),introductions:introductions(profile),pendingTopics:pendingTopics(profile),requiredRewrites:[],progress:summary(profile)};
}
async function readBody(req) {
  let size=0; const chunks=[];
  for await (const chunk of req) {size+=chunk.length;if(size>16384)throw fail(413,'请求内容过大。');chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{throw fail(400,'请求格式不正确。');}
}
function send(res,status,value) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
const engineFailure=result=>{if(result.engineError)throw fail(503,'本机证明引擎暂时不可用。'+result.engineError.slice(0,220));};
function exportEconomy(owner){const e=structuredClone(owner.economy);e.garden.questions=e.garden.questions.map(({correct,...q})=>q);delete e.adSessions;return e;}

export async function createServer({allowGuestForTests=false,publicRoot,managementSocket=null,presence=new Presence(),rewardAds}={}) {
  await initStore();
  await initAccounts();
  if(rewardAds!==undefined)configureRewardAds(rewardAds);
  const publicDir=publicRoot?path.resolve(publicRoot):path.join(root,'public'),authRates=new Map();
  const management=managementSocket?await startManagement(managementSocket,{presence}):null;
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/api/ads/appwin/reward'){
        if(req.method!=='GET'||req.url.length>8192||!rewardAds?.ready)return send(res,200,{isValid:false});
        const isValid=await rewardAds.acceptCallback(url.searchParams,async(ownerId,sessionId)=>{
          const owner=profileById(ownerId);if(!owner)throw fail(404,'广告账号不存在。');
          await exclusive(owner,async()=>{await finishRewardAd(owner,{sessionId});await save();});
        });
        return send(res,200,{isValid});
      }
      if(url.pathname==='/api/health') return send(res,200,await engineHealth());
      if(url.pathname.startsWith('/api/')) {
        const origin=req.headers.origin;
        if(origin&&new URL(origin).host!==req.headers.host) throw fail(403,'请从游戏本身发起操作。');
        if(req.headers['sec-fetch-site']==='cross-site')throw fail(403,'请从游戏本身发起操作。');
        const account=sessionAccount(req.headers.cookie);
        if(req.method==='GET'&&url.pathname==='/api/auth/status')return send(res,200,{authenticated:!!account||allowGuestForTests,account:account?publicAccount(account):allowGuestForTests?{username:'测试旅人',role:'test'}:null,remembered:rememberedAccount(req.headers.cookie)?.username||null,legacy:account?null:legacyPreview(req.headers.cookie)});
        if(url.pathname.startsWith('/api/auth/')){
          if(req.method!=='POST')throw fail(404,'没有这个账号接口。');const body=await readBody(req),peer=req.socket.remoteAddress||'local',now=Date.now();
          const rate=authRates.get(peer);if(rate?.until>now&&rate.count>=100)throw fail(429,'请求较多，请稍后再试。');authRates.set(peer,{count:rate?.until>now?rate.count+1:1,until:rate?.until>now?rate.until:now+600000});
          if(url.pathname==='/api/auth/logout'){
            if(account){const owner=accountProfile(account);await exclusive(owner,async()=>{changeFreeplay(owner,false);await save();});}
            await logout(req.headers.cookie);const cookies=['garden_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'];if(body.forgetRemembered){await rememberAccount(account,req.headers.cookie,false);cookies.push(rememberCookie(null));}res.setHeader('Set-Cookie',cookies);return send(res,200,{ok:true});
          }
          if(url.pathname==='/api/auth/hint')return send(res,200,{hint:passwordHint(body.username)});
          if(!['/api/auth/register','/api/auth/login','/api/auth/remember'].includes(url.pathname))throw fail(404,'没有这个账号接口。');
          const credentials={username:body.username,password:body.password,recoveryHint:body.recoveryHint,adoptLegacy:body.adoptLegacy!==false,cookie:req.headers.cookie||'',peer};
          const result=await(url.pathname.endsWith('/remember')?resumeRemembered(req.headers.cookie):url.pathname.endsWith('/register')?register(credentials):login(credentials));
          const secure=!!req.socket.encrypted||req.headers['x-forwarded-proto']==='https',cookies=[sessionCookie(result.token,secure,body.remember!==false),'garden_profile=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'];
          if(typeof body.remember==='boolean')cookies.push(rememberCookie(await rememberAccount(result.account,req.headers.cookie,body.remember),secure));res.setHeader('Set-Cookie',cookies);return send(res,200,{authenticated:true,account:publicAccount(result.account)});
        }
        if(!account&&!allowGuestForTests)throw Object.assign(fail(401,'请先登录花园账号。'),{code:'AUTH_REQUIRED'});
        if(req.method==='POST'&&url.pathname==='/api/presence'){
          if(!account)throw fail(401,'请先登录。');presence.heartbeat(account,req.headers.cookie,await readBody(req));return send(res,200,{ok:true,account:publicAccount(account)});
        }
        let owner;
        if(account)owner=accountProfile(account);
        else{const guest=getProfile(req.headers.cookie);owner=guest.profile;if(guest.fresh){res.setHeader('Set-Cookie',`garden_profile=${owner.id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`);await save();}}
        attachBenefits(owner,account);
        await exclusive(owner,async()=>{if(expireFreeplay(owner))await save();});
        const profile=activeProfile(owner);if(refreshQuizzes(owner))await save();
        if(req.method==='GET'&&url.pathname==='/api/bootstrap') return send(res,200,bootstrap(profile,account,owner));
        if(req.method==='GET'&&url.pathname==='/api/economy')return send(res,200,{economy:economySummary(owner),shop:shopInfo(),garden:quizSummary(owner)});
        if(req.method==='GET'&&url.pathname==='/api/garden/quiz')return send(res,200,{question:quizFor(owner,url.searchParams.get('id'))});
        if(req.method==='GET'&&url.pathname==='/api/save/export') {
          res.setHeader('Content-Disposition','attachment; filename="lean-garden-save.json"');
          return send(res,200,{version:9,exported:new Date().toISOString(),account:account?publicAccount(account):null,...summary(owner),economy:exportEconomy(owner),legacyChallengesV6:owner.legacyChallengesV6,legacyLevelsV8:owner.legacyLevelsV8,topicsLearned:owner.topicsLearned,attempts:owner.attempts,practice:owner.practice,freePlay:!!owner.freePlay,legacyAttempts:owner.legacyAttempts,legacyAttemptsV2:owner.legacyAttemptsV2,legacyAttemptsV3:owner.legacyAttemptsV3});
        }
        if(req.method==='GET'&&url.pathname==='/api/proof/export') {
          const level=byId.get(url.searchParams.get('level'));
          if(!level||!profile.completed[level.id])throw fail(403,'先完成这个证明，再导出。');
          const record=profile.completed[level.id];
          const source=sourceFor({...level,statement:record.statement||level.statement},record.proof||codesFor(level,record.steps),false);
          res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':`attachment; filename="${level.id}.lean"`});return res.end(source);
        }
        if(req.method!=='POST')throw fail(404,'没有这个接口。');
        const body=await readBody(req);
        return await exclusive(owner,async()=>{
          attachBenefits(owner,account);
          if(expireFreeplay(owner))await save();
          const profile=activeProfile(owner);
          if(url.pathname==='/api/checkin/claim'){const result=claimCheckin(owner);await save();return send(res,200,{...result,economy:economySummary(owner)});}
          if(url.pathname==='/api/shop/claim-beta'){claimBeta(owner);await save();return send(res,200,{economy:economySummary(owner)});}
          if(url.pathname==='/api/shop/claim-trial'){claimTrial(owner);await save();return send(res,200,{economy:economySummary(owner)});}
          if(url.pathname==='/api/shop/purchase'){const receipt=await purchase(owner,body);await save();return send(res,200,{...receipt,economy:economySummary(owner)});}
          if(url.pathname==='/api/shop/topup'){const receipt=await topup(owner,body);await save();return send(res,200,{...receipt,economy:economySummary(owner)});}
          if(url.pathname==='/api/garden/answer'){const result=answerQuiz(owner,body.id,body.choice);await save();return send(res,200,{result,economy:economySummary(owner),garden:quizSummary(owner)});}
          if(url.pathname==='/api/energy/refill'){refillEnergy(owner);await save();return send(res,200,{economy:economySummary(owner)});}
          if(['/api/energy/ad/start','/api/ads/start'].includes(url.pathname)){const session=await startRewardAd(owner,url.pathname.startsWith('/api/energy')?'energy':'diamonds');await save();return send(res,200,session);}
          if(['/api/energy/ad/complete','/api/ads/complete'].includes(url.pathname)){const reward=await finishRewardAd(owner,body.receipt);await save();return send(res,200,{...reward,economy:economySummary(owner)});}
          if(url.pathname==='/api/onboarding/seen'){
            owner.prologueSeen=true;await save();return send(res,200,{ok:true});
          }
          if(url.pathname==='/api/tutorial/seen'){
            if(!['n01','n02','n03'].includes(body.level))throw fail(400,'没有这一关的新手教程。');
            owner.tutorials=[...new Set([...(owner.tutorials||[]),body.level])];
            if(body.version===7)owner.guidedTutorials=[...new Set([...(owner.guidedTutorials||[]),body.level])];
            await save();return send(res,200,{ok:true});
          }
          if(body.level&&body.practice!==undefined&&body.practice!==!!profile.isPractice)throw fail(409,'选关模式已在其他页面切换，请重新进入关卡。');
          if(url.pathname==='/api/progress/freeplay'){
            if(typeof body.enabled!=='boolean')throw fail(400,'请选择开启或关闭自由选关。');
            changeFreeplay(owner,body.enabled);const active=activeProfile(owner);await save();return send(res,200,bootstrap(active,account,owner));
          }
          if(url.pathname==='/api/progress/reset') {
            if(body.confirm!=='RESET')throw fail(400,'需要在设置中确认重置。');
            changeFreeplay(owner,false);owner.economy.garden.questions=[];owner.visited=[];owner.completed={};owner.attempts={};owner.introduced=['rfl'];owner.topicsLearned=[];owner.rulesVersion=4;owner.challengeVersion=7;owner.curriculumVersion=9;owner.prologueSeen=false;owner.tutorials=[];owner.guidedTutorials=[];delete owner.legacyChallengesV6;delete owner.legacyLevelsV8;delete owner.legacyAttempts;delete owner.legacyAttemptsV2;delete owner.legacyAttemptsV3;delete owner.legacyUnlocked;delete owner.practice;owner.freePlay=false;owner.lastLevel='n01';await save();return send(res,200,bootstrap(owner,account,owner));
          }
          if(url.pathname==='/api/cards/learn'){
            if(!introductions(profile).includes(body.card))throw fail(400,'这张卡当前不需要领取。');
            profile.introduced.push(body.card);await save();return send(res,200,{pendingCards:introductions(profile),progress:summary(profile)});
          }
          if(url.pathname==='/api/topics/learn'){
            if(!pendingTopics(profile).includes(body.topic))throw fail(400,'这个主题还没有解锁。');
            (profile.topicsLearned ||= []).push(body.topic);await save();return send(res,200,{pendingTopics:pendingTopics(profile)});
          }
          const level=byId.get(body.level);
          if(!level)throw fail(404,'找不到这个关卡。');
          if(!canEnter(profile,level))throw fail(403,'这个关卡还没有解锁。先完成前面的冒险，收集所需技能。');
          if(profile.isPractice){const old=profile.attempts[level.id],continuing=profile.lastLevel===level.id&&!!old?.run&&!old.rewarded;requireFreeplayTime(owner,continuing);profile.lastLevel=level.id;}
          const attempt=structuredClone(attemptFor(profile,level.id));
          if(url.pathname==='/api/level/start') {
            let result=await checkLean(level,codesFor(level,attempt.steps));engineFailure(result);
            // Preserve an old attempt in the archive and resume its longest valid prefix.
            if(!result.ok&&attempt.steps.some(s=>s?.kind==='migrated')) {
              while(!result.ok&&attempt.steps.length){attempt.steps.pop();result=await checkLean(level,codesFor(level,attempt.steps));engineFailure(result);}
              attempt.revision++;
            }
            if(!result.ok)throw fail(409,'关卡数据已变化，请重新开始本关。');
            if(!result.complete)beginRun(owner,attempt);
            if(!profile.visited.includes(level.id))profile.visited.push(level.id);
            profile.lastLevel=level.id;profile.attempts[level.id]=attempt;await save();
            return send(res,200,statePayload(level,profile,attempt,result));
          }
          if(!profile.visited.includes(level.id))throw fail(409,'请先进入关卡。');
          if(body.revision!==attempt.revision)throw fail(409,'另一个页面更新了本关，请重新进入以同步进度。');
          if(!attempt.run&&['/api/level/step','/api/level/hint','/api/level/answer'].includes(url.pathname))throw fail(409,'请重新进入关卡，登记本次冒险后再出招。');
          if(url.pathname==='/api/level/rewrite-preview'){
            const codes=codesFor(level,attempt.steps),current=await checkLean(level,codes);engineFailure(current);
            const selected=selectedRewrite(repository(profile,level,current.goals),{...body.rewrite,mode:'once'});
            if(!selected)throw fail(400,'请选择当前仓库中的证据和作用位置。');
            const result=await checkLean(level,[...codes,selected.code.replace('garden_strict_rw','garden_rewrite_matches')]);engineFailure(result);
            return send(res,200,{matches:result.matches||[],error:result.ok?null:result.errors?.[0],revision:attempt.revision});
          }
          if(url.pathname==='/api/level/learn') {
            if(!introductions(profile).includes(body.card))throw fail(400,'这张卡当前不需要介绍。');
            profile.introduced.push(body.card);await save();
            return send(res,200,{introductions:introductions(profile),progress:summary(profile)});
          }
          if(url.pathname==='/api/level/hint') {
            const codes=codesFor(level,attempt.steps);
            const current=await checkLean(level,codes);engineFailure(current);
            if(current.complete)throw fail(409,'本关已完成，不需要消耗提示。');
            useHint(owner);
            attempt.hints++;attempt.revision++;profile.attempts[level.id]=attempt;await save();
            return send(res,200,{...nextHint(profile,level,codes,current.goals,attempt.hints),attempt,economy:economySummary(owner)});
          }
          if(url.pathname==='/api/level/answer'){
            const current=await checkLean(level,codesFor(level,attempt.steps));engineFailure(current);
            if(current.complete)throw fail(409,'本关已完成，可以直接查看自己的证明。');
            const consumed=useAnswer(owner,attempt);if(consumed)attempt.revision++;
            profile.attempts[level.id]=attempt;await save();
            return send(res,200,{solution:level.solution,attempt,economy:economySummary(owner)});
          }
          if(url.pathname==='/api/level/reset') {
            if(profile.isPractice&&attempt.rewarded)requireFreeplayTime(owner,false);
            attempt.steps=[];attempt.mistakes=0;
            if(attempt.rewarded||!attempt.run)delete attempt.answerUnlocked;
            attempt.hints=attempt.answerUnlocked?1:0;
          }
          else if(url.pathname==='/api/level/undo') {
            if(!attempt.steps.length)throw fail(400,'已经回到起点了。');
            attempt.steps.pop();
          } else if(url.pathname==='/api/level/step') {
            if(introductions(profile).length||pendingTopics(profile).length)throw fail(409,'先认识新卡片，再开始使用。');
            if(attempt.steps.length>=100)throw fail(400,'已经尝试了很多步骤，撤销几步或重新开始吧。');
            if(body.rewrite||body.apply||body.induction||body.witness) {
              const current=await checkLean(level,codesFor(level,attempt.steps));engineFailure(current);
              let selected;
              if(body.witness){if(!unlocked(profile).has('use'))throw fail(403,'先解锁 use 技能。');try{selected=selectedWitness(current.goals,body.witness,unlocked(profile));}catch(error){throw fail(400,error.message);}}
              else selected=body.rewrite?(body.rewrite.mode==='code'?selectedRewriteCode(repository(profile,level,current.goals),body.rewrite,current.goals,unlocked(profile)):selectedRewrite(repository(profile,level,current.goals),body.rewrite)):body.apply?selectedApply(repository(profile,level,current.goals,'apply'),body.apply):unlocked(profile).has('induction')?selectedInduction(current.goals,body.induction):null;
              if(!selected)throw fail(403,'请选择已解锁的定理、有效方向和当前命题。');
              attempt.steps.push(selected);
            } else {
              const action=actionsFor(profile,level).find(a=>a.id===body.action);
              if(!action)throw fail(403,'这张卡尚未解锁，或不属于本关。');
              if(['rw','apply','induction','use'].includes(action.skill))throw fail(400,'请完成技能选择流程；use 的见证需要亲手填写。');
              attempt.steps.push(action.id);
            }
          } else throw fail(404,'没有这个接口。');
          const result={...await checkLean(level,codesFor(level,attempt.steps))};engineFailure(result);
          if(profile.isPractice&&expireFreeplay(owner)){await save();throw Object.assign(fail(403,'自由选关时间已到，已退出自由模式，练习记录已保留。'),{code:'FREEPLAY_EXPIRED'});}
          attempt.revision++;
          if(!result.ok) {
            if(url.pathname==='/api/level/step')attempt.steps.pop();
            attempt.mistakes++;
            profile.attempts[level.id]=attempt;await save();
            const details=result.errors?.join('\n').slice(0,4000)||'',explanation=explainLeanError(details);
            return send(res,200,{rejected:true,attempt,error:explanation.help,explanation,details});
          }
          const wasComplete=!!profile.completed[level.id];
          const oldUnlocked=unlocked(profile);
          if(url.pathname==='/api/level/reset'&&(attempt.rewarded||!attempt.run)){delete attempt.run;beginRun(owner,attempt);}
          if(url.pathname==='/api/level/undo'&&!attempt.run)beginRun(owner,attempt);
          const experience=result.complete?awardRun(owner,attempt,level):null;
          if(result.complete) {
            const stars=attempt.hints?1:attempt.mistakes||attempt.steps.length>level.par?2:3;
            const old=profile.completed[level.id];
            if(!old||stars>old.stars||(stars===old.stars&&attempt.steps.length<old.steps.length)||old.proofVersion!==4)profile.completed[level.id]={stars:Math.max(stars,old?.stars||0),steps:attempt.steps,proof:codesFor(level,attempt.steps),statement:level.statement,proofVersion:4,at:new Date().toISOString()};
          }
          profile.attempts[level.id]=attempt;await save();
          return send(res,200,{...statePayload(level,profile,attempt,result),experience,firstClear:result.complete&&!wasComplete,newCards:[...unlocked(profile)].filter(x=>!oldUnlocked.has(x))});
        });
      }
      if(req.method!=='GET'&&req.method!=='HEAD')throw fail(405,'不支持此请求。');
      let pathname;
      try{pathname=decodeURIComponent(url.pathname);}catch{throw fail(400,'路径格式错误。');}
      if(pathname.includes('\0'))throw fail(400,'路径格式错误。');
      const filename=path.resolve(publicDir,'.'+(pathname==='/'?'/index.html':pathname));
      if(!filename.startsWith(publicDir+path.sep))throw fail(403,'不能访问这个文件。');
      let data;
      try{data=await readFile(filename);}catch{throw fail(404,'找不到这个文件。');}
      if(path.extname(filename)==='.mp3'){
        const headers={'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Cache-Control':'public, max-age=86400'};
        if(req.headers.range){
          const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
          let start=match?.[1]?Number(match[1]):0,end=match?.[2]?Number(match[2]):data.length-1;
          if(match&&!match[1]&&match[2]){start=Math.max(0,data.length-Number(match[2]));end=data.length-1;}
          if(!match||start> end||start>=data.length||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)){res.writeHead(416,{'Content-Range':`bytes */${data.length}`});return res.end();}
          end=Math.min(end,data.length-1);res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});return res.end(req.method==='HEAD'?undefined:data.subarray(start,end+1));
        }
        res.writeHead(200,{...headers,'Content-Length':data.length});return res.end(req.method==='HEAD'?undefined:data);
      }
      res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':pathname.startsWith('/assets/')?'public, max-age=3600':'no-cache'});
      res.end(req.method==='HEAD'?undefined:data);
    } catch(error) {if(!res.headersSent)send(res,error.status||500,{error:error.status?error.message:'本机服务遇到问题，请稍后重试。',code:error.code});else res.end();if(!error.status)console.error(error);}
  });
  server.on('close',()=>management?.close());
  return server;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT||3210);
  const host=process.env.HOST||'127.0.0.1';
  const rewardAds=await configuredAppwin(dataDir);
  const server=await createServer({managementSocket:process.platform==='linux'?(process.env.GARDEN_ADMIN_SOCKET||path.join(dataDir,'admin.sock')):null,rewardAds});
  server.listen(port,host,()=>{
    console.log(`Lean Garden: http://localhost:${port}`);
    for(const codes of [[],['rfl']])checkLean(byId.get('n01'),codes).catch(error=>console.error('First-level warmup:',error.message));
    if(host==='0.0.0.0')for(const addresses of Object.values(networkInterfaces()))for(const entry of addresses||[])if(entry.family==='IPv4'&&!entry.internal)console.log(`LAN: http://${entry.address}:${port}`);
  });
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被占用。`:error);process.exitCode=1;});
}
