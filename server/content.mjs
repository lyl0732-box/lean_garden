import { add, act, rw, intro, use, split, levels, cards, chapters, commonActions } from './curriculum.mjs';
import './advanced.mjs';
import { prepareLessons } from './lessons.mjs';
import { prepareExperience } from './experience.mjs';
import { prepareRevision4 } from './revision4.mjs';
import { prepareRevision5 } from './revision5.mjs';
import { prepareRevision6 } from './revision6.mjs';
import { prepareRevision7 } from './revision7.mjs';
import { prepareRevision9 } from './revision9.mjs';
import {preparePlan9} from './plan9.mjs';

add('m','藤蔓连锁','(a b c d : Nat) (h1 : a=b) (h2 : b=c) (h3 : c=d) : a+a=d+d','用三条等式，让两条藤蔓相遇','只用改写，把 a 一路替换成 d。一次 rw 可能只改写一个出现位置，需要观察目标。',[],[rw('用 h1：a→b','h1'),rw('用 h2：b→c','h2'),rw('用 h3：c→d','h3')],['rw [h1,h2,h3]'],{required:['rw'],difficulty:'入门挑战'});
// Keep the solution made of the same atomic buttons offered to players.
levels.at(-1).solution=['rw [h1]','rw [h2]','rw [h3]'];
add('m','双重归纳回廊','(n : Nat) : 0+(0+n)=n','0+(0+n)=n','挑战：用已经掌握的左零定理，或者归纳思路抵达终点。',[],[rw('消去一层左零','Nat.zero_add','zero_add')],['rw [Nat.zero_add]','rw [Nat.zero_add]'],{required:['rw','zero_add'],difficulty:'自然数挑战'});
add('m','蘑菇迷宫','(P Q R : Prop) (h : P ∧ (Q ∨ R)) : (P∧Q) ∨ (P∧R)','P∧(Q∨R) → (P∧Q)∨(P∧R)','先拆外层合取，再处理内层析取的两个分支。每个分支选择正确的出口。',[],[split('h','⟨hp, hor⟩','取出 P 与 Q∨R'),split('hor','hq | hr','按 Q / R 分成两个分支')],['rcases h with ⟨hp, hor⟩','rcases hor with hq | hr','left','constructor','assumption','assumption','right','constructor','assumption','assumption'],{required:['rcases','constructor','left','right','assumption'],difficulty:'逻辑挑战'});
add('m','量词快递员','(P Q : Nat → Prop) (h : ∀ n, P n → Q n) (hex : ∃ n, P n) : ∃ n, Q n','把存在的 P 见证，送到 Q 的终点','取出存在见证 n，把全称蕴含用在 n 上，然后完成 Q n。',[],[split('hex','⟨n, hn⟩','打开存在包裹'),use('n'),act('apply','把全称规则用在 n 上','apply h n')],['rcases hex with ⟨n, hn⟩','use n','apply h n','assumption'],{required:['rcases','use','apply','assumption','intro'],difficulty:'逻辑进阶'});
add('m','三叶不等式','(x y z : ℝ) : x*y+y*z+z*x ≤ x^2+y^2+z^2','xy+yz+zx ≤ x²+y²+z²','三个两两差的平方相加，会发生什么？先收集非负证据，再组合。',[],[act('have','收集三片非负平方叶','have hxy := sq_nonneg (x-y)\nhave hyz := sq_nonneg (y-z)\nhave hzx := sq_nonneg (z-x)','square_nonneg'),act('nlinarith','组合三条平方非负','nlinarith')],['have hxy := sq_nonneg (x-y)\nhave hyz := sq_nonneg (y-z)\nhave hzx := sq_nonneg (z-x)','nlinarith'],{required:['have','nlinarith','square_nonneg'],difficulty:'代数挑战'});
add('m','三把余数锁',': ∃ x : ℤ, Garden.Congruent 3 x 2 ∧ Garden.Congruent 5 x 3 ∧ Garden.Congruent 7 x 2','找 x，模 3 余 2、模 5 余 3、模 7 余 2','用你学到的同余与见证技能破解三把锁。候选值是 8、23、38，选好后逐个验证。',[],[use('8'),use('23'),use('38'),act('norm_num','按同余定义验证数字','norm_num [Garden.Congruent]','mod')],['use 23','norm_num [Garden.Congruent]'],{required:['use','norm_num','mod'],difficulty:'数论挑战'});

prepareLessons(levels, cards);
prepareExperience(levels,cards,commonActions);
prepareRevision4(levels,cards,commonActions);
prepareRevision6(levels,cards);
prepareRevision5(levels,cards);
prepareRevision7(levels);
prepareRevision9(levels);
preparePlan9(levels,cards);
export const campaign = levels.filter(l=>l.chapter!=='m');
export const challenges = levels.filter(l=>l.chapter==='m');
export const byId = new Map(levels.map(l=>[l.id,l]));
for (const level of levels) {
  level.par = level.solution.length;
  level.reward ||= [];
  level.skills ||= [];
}
for (const card of cards) {
  const level = campaign.find(l=>l.skills.includes(card.id)||l.reward.includes(card.id));
  card.unlockLevel = level?.id || null;
  card.unlockOnClear = !!level?.reward.includes(card.id);
}
export function canEnter(profile, level) {
  if(profile.isPractice)return true;
  if (level.chapter==='m') return level.required.every(id=>unlocked(profile).has(id));
  const ch = chapters.find(c=>c.id===level.chapter);
  const prerequisite = ch.requires && campaign.findLast(l=>l.chapter===ch.requires);
  if (prerequisite && !profile.completed[prerequisite.id]) return false;
  if(profile.completed[level.id])return true;
  if (level.number===1) return true;
  const prev = campaign.find(l=>l.chapter===level.chapter&&l.number===level.number-1);
  return !!profile.completed[prev.id];
}
export function unlocked(profile) {
  if(profile.isPractice){
    const level=byId.get(profile.lastLevel)||campaign[0],index=campaign.indexOf(level);
    const prefix=level.chapter==='m'?campaign:campaign.slice(0,index).filter(l=>level.chapter==='t'?l.chapter!=='a':true);
    return unlocked({completed:Object.fromEntries(prefix.map(l=>[l.id,{proofVersion:4}]))});
  }
  const result = new Set(['rfl']);
  const grant=id=>{const c=cards.find(c=>c.id===id);if(c&&c.kind!=='theorem')result.add(id);};
  for(const id of profile.legacyUnlocked||[])grant(id);
  for (const id of Object.keys(profile.completed)) {
    const level=byId.get(id); if(level&&level.chapter!=='m') {
      level.skills.forEach(grant);
      level.reward.forEach(x=>{const c=cards.find(c=>c.id===x);if(c?.kind!=='theorem'||profile.completed[id].proofVersion===4)result.add(x);});
      const next=campaign.find(l=>l.chapter===level.chapter&&l.number===level.number+1);
      next?.skills.forEach(grant);
      if(level.boss)for(const ch of chapters.filter(c=>c.requires===level.chapter))campaign.find(l=>l.chapter===ch.id&&l.number===1)?.skills.forEach(grant);
    }
  }
  return result;
}
export function actionsFor(profile, level) {
  const known=unlocked(profile);
  const actions=[...level.actions,...commonActions];
  const seen=new Set();
  return actions.filter(a=>{
    if(!known.has(a.skill)||!a.uses.every(id=>known.has(id))||seen.has(a.code)) return false;
    seen.add(a.code); return true;
  });
}
export function publicLevel(level,profile) {
  const {solution,prelude,actions,statement,...info}=level;
  return {...info,open:canEnter(profile,level),result:profile.completed[level.id]||null,started:!!profile.attempts[level.id]?.steps.length};
}
export { levels, cards, chapters, commonActions };
