import test from 'node:test';import assert from 'node:assert/strict';
import {migrateEconomy,claimBeta,claimTrial,changeFreeplay,freeplayRemaining,requireFreeplayTime,creditDiamonds,buyWithDiamonds,products,economySummary} from '../server/economy.mjs';
import {refreshQuizzes,quizSummary,quizFor,answerQuiz,QUIZ_INTERVAL} from '../server/garden-quiz.mjs';
import {campaign} from '../server/content.mjs';import {configureCommerce,shopInfo,purchase,topup,startRewardAd,finishRewardAd} from '../server/commerce.mjs';
import {usernameValue,passwordValue} from '../public/account-rules.js';
const now=Date.UTC(2026,10,4,0),make=()=>{const p={id:'qa',completed:{}};migrateEconomy(p,[],now);return p;};
test('UTF-8 username limit, six-character passwords and the cash-only two-yuan voucher exception',async()=>{
  assert.equal(usernameValue('汉'.repeat(10)),'汉'.repeat(10));assert.throws(()=>usernameValue('汉'.repeat(11)));assert.equal(usernameValue('a'.repeat(30)).length,30);assert.throws(()=>usernameValue('a'.repeat(31)));assert.equal(passwordValue('123456'),'123456');assert.throws(()=>passwordValue('12345'));
  const p=make();creditDiamonds(p,10000,'qa-grant');const vouchers=products.find(x=>x.id==='adSkips10');assert.equal(vouchers.priceFen,200);assert.equal(vouchers.currency,'cash');assert.equal(vouchers.priceDiamonds,undefined);
  assert.throws(()=>buyWithDiamonds(p,{product:'adSkips10',key:'cash-cannot-diamonds-1'}),e=>e.code==='CASH_ONLY');assert.equal(p.economy.diamonds,10000);
  await assert.rejects(purchase(p,{product:'adSkips10',key:'cash-only-request-01'}),e=>e.code==='PAYMENT_UNAVAILABLE');await assert.rejects(topup(p,{package:'diamonds100',key:'topup-request-00001'}),e=>e.code==='PAYMENT_UNAVAILABLE');
  claimBeta(p);assert.equal(p.economy.adSkips,3);assert.throws(()=>claimBeta(p));assert.equal(shopInfo().topupMode,'disabled');
});
test('freeplay gift, purchase prices, pausing, stacking, expiry and idempotent diamond spending',()=>{
  const p=make();assert.throws(()=>changeFreeplay(p,true,now),e=>e.code==='FREEPLAY_EMPTY');claimTrial(p,now);assert.throws(()=>claimTrial(p,now));changeFreeplay(p,true,now);assert.equal(freeplayRemaining(p.economy,now+60000),540000);
  changeFreeplay(p,false,now+60000);assert.equal(freeplayRemaining(p.economy,now+900000),540000);creditDiamonds(p,900,'qa-grant');
  const one=buyWithDiamonds(p,{product:'freeplay10',key:'time-purchase-000001'});assert.equal(one.spent,200);assert.equal(p.economy.diamonds,700);assert.equal(buyWithDiamonds(p,{product:'freeplay10',key:'time-purchase-000001'}).duplicate,true);assert.equal(p.economy.diamonds,700);
  buyWithDiamonds(p,{product:'freeplay60',key:'hour-purchase-000001'});assert.equal(p.economy.diamonds,100);buyWithDiamonds(p,{product:'answer1',key:'answer-purchase-0001'});assert.equal(p.economy.answers,1);assert.equal(p.economy.diamonds,0);
  assert.throws(()=>buyWithDiamonds(p,{product:'hints10',key:'insufficient-request'}),e=>e.code==='DIAMONDS_EMPTY');changeFreeplay(p,true,now+1000000);assert.throws(()=>requireFreeplayTime(p,false,now+10000000));assert.throws(()=>requireFreeplayTime(p,true,now+10000000),e=>e.code==='FREEPLAY_EMPTY');
});
test('old gift migration removes only the excess free allowance and retains bought vouchers and proofs',()=>{
  const old={completed:{n01:{stars:3}},economy:{version:1,adSkips:15,betaClaimed:true,orders:[{product:'adSkips10'}],adClaims:[],energy:45,energyAt:now,hints:5,answers:0,xp:100,firstRecharge:false}};
  migrateEconomy(old,[],now);assert.equal(old.economy.adSkips,10);assert.equal(old.completed.n01.stars,3);assert.equal(old.economy.xp,100);assert.equal(migrateEconomy(old,[],now),false);
});
test('garden asks at five-hour intervals, uses only owned cards, caps at three and rewards exactly once',()=>{
  const p=make();p.completed=Object.fromEntries(campaign.filter(l=>l.chapter==='n'&&l.number<8).map(l=>[l.id,{proofVersion:4}]));
  assert.equal(refreshQuizzes(p,now+QUIZ_INTERVAL-1),false);assert.equal(quizSummary(p).pending.length,0);refreshQuizzes(p,now+QUIZ_INTERVAL);assert.equal(quizSummary(p).pending.length,3);
  const privateQ=p.economy.garden.questions[0],publicQ=quizFor(p,privateQ.id);assert.equal('correct'in publicQ,false);assert.ok(publicQ.reward>=10&&publicQ.reward<=50);
  const earned=answerQuiz(p,privateQ.id,privateQ.correct);assert.equal(earned.correct,true);assert.equal(p.economy.diamonds,privateQ.reward);assert.equal(answerQuiz(p,privateQ.id,0).duplicate,true);assert.equal(p.economy.diamonds,privateQ.reward);
  refreshQuizzes(p,now+100*QUIZ_INTERVAL);assert.equal(quizSummary(p).pending.length,3);assert.equal(new Set(quizSummary(p).pending.map(q=>q.cardId)).size,3);
  const wrong=p.economy.garden.questions[0],balance=p.economy.diamonds;answerQuiz(p,wrong.id,(wrong.correct+1)%4);assert.equal(p.economy.diamonds,balance);
});
test('ads require a verified session, grant 50 diamonds, stop at ten each China day and reject replay',async()=>{
  const p=make();let count=0;
  configureCommerce({ads:{async createSession(){return {id:'session'+(++count)};},async verifyReward({receipt}){return receipt?.signed?{id:receipt.id,sessionId:receipt.sessionId}:null;}}});
  try{
    for(let i=0;i<10;i++){const session=await startRewardAd(p,'diamonds',now),receipt={signed:true,id:'reward'+i,sessionId:session.id};assert.equal((await finishRewardAd(p,receipt,now)).earned,50);assert.equal((await finishRewardAd(p,receipt,now)).duplicate,true);}
    assert.equal(p.economy.diamonds,500);await assert.rejects(startRewardAd(p,'diamonds',now),e=>e.code==='AD_DAILY_LIMIT');assert.equal(economySummary(p,now).dailyAds.remaining,0);
    const tomorrow=now+86400000;assert.equal(economySummary(p,tomorrow).dailyAds.remaining,10);const session=await startRewardAd(p,'energy',tomorrow);p.economy.energy=0;await finishRewardAd(p,{signed:true,id:'reward-next-day',sessionId:session.id},tomorrow);assert.equal(p.economy.energy,50);assert.equal(p.economy.diamonds,550);
    await assert.rejects(finishRewardAd(p,{signed:false},tomorrow));
  }finally{configureCommerce();}
});
