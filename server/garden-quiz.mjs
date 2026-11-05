import {randomInt,randomUUID} from 'node:crypto';
import {cards,unlocked,byId} from './content.mjs';import {creditDiamonds} from './economy.mjs';
export const QUIZ_INTERVAL=5*3600000;
const bank={
  rfl:['什么时候适合用 rfl 收尾？','等号两边的写法完全相同','看起来像一道加法题时','任意两个不同的式子之间','不知道下一步该怎么办时'],
  rw:['已知 h : a = b，正向 rw 的含义是什么？','把匹配的 a 换成 b','把所有等式都直接判为成立','必须把 b 换成 a','自动完成所有剩余证明'],
  induction:['自然数归纳通常需要完成哪两部分？','证明起点 0，并从 k 推到 succ k','只检查数字 1 和 2','只证明一个最大的自然数','把所有自然数都逐个列出来'],
  apply:['已有 P → Q，使用 apply 来证明 Q 后，通常还要证明什么？','前提 P','再证明一次 Q → P','任意一个与 P 无关的命题','不用证明任何前提'],
  intro:['目标是 P → Q，使用 intro 后会发生什么？','把 P 放进已知区，再证明 Q','直接把 Q 当作已知','删除所有已知条件','把 P 和 Q 交换位置'],
  constructor:['目标是 P ∧ Q，constructor 会怎样拆开它？','先证明 P，再证明 Q','只要任选一边成立','把 P 当成不成立','把两个目标都删掉'],
  rcases:['已知 h : P ∧ Q，拆包可以得到什么？','P 与 Q 各自的证据','P 不成立的证据','只有 P ∨ Q，没有其他信息','任意命题的证据'],
  use:['要证明“存在一个满足条件的对象”，use 的任务是什么？','选出一个具体见证，再验证条件','随便跳过条件','把所有对象一一证明相等','删除存在这个要求'],
  left:['面对目标 P ∨ Q，left 选择哪一边？','证明 P','证明 Q','同时假设 P 和 Q 都为假','证明 P = Q'],
  right:['面对目标 P ∨ Q，right 选择哪一边？','证明 Q','证明 P','证明两边都不成立','把析取改成乘法'],
  specialize:['已知 h : ∀ n, P n，把它 specialize 到 3 会得到什么？','关于 P 3 的证据','自动得到所有命题的证明','3 = 0','证明 P 3 不成立'],
  one_eq_succ_zero:['自然数 1 是谁的下一步？','0 的下一步','1 自己的下一步','2 的下一步','没有前一个起点'],
  two_eq_succ_one:['2 = succ 1 表示什么？','2 是 1 的下一步','2 与 1 是同一个数','succ 会把数字变成 0','2 是 3 的下一步'],
  three_eq_succ_two:['3 的后继定义是哪一句？','3 = succ 2','3 = succ 3','3 = succ 4','3 = 0'],
  four_eq_succ_three:['4 是哪一个自然数的下一步？','3','4','2','0'],
  add_zero:['a + 0 可以按定义改成什么？','a','0','succ a','a + a'],
  add_succ:['右侧加数从 b 走到 succ b，和会怎样变化？','从 a + b 走到 succ (a + b)','始终保持 a + b','立刻变成 0','把乘法改成加法'],
  add_one_eq_succ:['加一阶梯把 a + 1 连接到哪个式子？','succ a','a','0','a * a'],
  zero_add:['左零定理说的是哪一句？','0 + a = a','a + 0 = 0','0 + a = succ a','0 + a = a * a'],
  succ_ne:['零不是后继，意味着什么？','任何 succ n 都不等于 0','每个 succ n 都等于 0','只有 succ 0 等于 0','0 比所有自然数的后继都大'],
  succ_inj:['已知 succ a = succ b，可以推出什么？','a = b','a = 0','a = succ b','a ≠ b'],
  add_assoc:['加法结合律主要允许改变什么？','括号把哪两个数先放在一起','随意改变每个数的值','把加号换成乘号','删掉一个加数'],
  add_comm:['加法交换律允许怎样改写 a + b？','改成 b + a','改成 a * b','改成 a - b','改成 a + 0'],
  mul_zero:['零份 a 的总量是多少？','0','a','1','succ a'],
  mul_succ:['多一份 a，应该怎样表达？','a * succ b = a * b + a','a * succ b = a * b','a * succ b = a + b','a * succ b = 0'],
  zero_mul:['每份都是 0，取 n 份的总量是多少？','0','n','1','succ n'],
  square_nonneg:['实数 x 的平方总满足什么？','0 ≤ x ^ 2','x ^ 2 < 0','x ^ 2 = x','x ^ 2 = 1'],
  deriv_const:['常数函数的变化率是什么？','0','1','这个常数本身','随 x 任意变化'],
  deriv_id:['函数 y = x 在每一点的导数是多少？','1','0','x','x ^ 2'],
  rolle:['罗尔定理在满足连续、可导和两端同高等条件后保证什么？','中间某点的导数为 0','每个点的函数值都为 0','函数只能是一条直线','两个端点必须是同一点'],
  mvt:['拉格朗日中值定理连接哪两种斜率？','某点的瞬时斜率与整段的平均斜率','两个任意函数的斜率','函数值与零的距离','所有区间的长度'],
  crt:['中国剩余定理里的互素模数，帮助解决什么问题？','同时满足各自的余数条件','把所有余数都变成 0','保证两个模数相等','让每个整数都相等']
};
const shuffle=list=>{for(let i=list.length-1;i>0;i--){const j=randomInt(i+1);[list[i],list[j]]=[list[j],list[i]];}return list;};
function rewardFor(card){const level=byId.get(card.proofLevel||card.unlockLevel);return level?.boss?50:card.kind==='tactic'?10:card.kind!=='theorem'?20:level?.chapter==='n'?30:level?.chapter==='l'?40:50;}
function makeQuestion(card,known,now){
  const row=bank[card.id];let prompt,correct,distractors;
  if(row){[prompt,correct,...distractors]=row;}
  else{
    prompt=`下面哪条是「${card.name}」的规则？`;correct=card.formula||card.example;
    distractors=shuffle([...new Set(known.filter(c=>c.id!==card.id).map(c=>c.formula||c.example))].filter(x=>x&&x!==correct)).slice(0,3);
    for(const text of ['所有命题都可以无条件成立','不需要任何前提就能证明任何等式','这个规则只会删除当前目标'])if(distractors.length<3&&!distractors.includes(text))distractors.push(text);
  }
  const options=shuffle([correct,...distractors]);return {id:randomUUID(),cardId:card.id,prompt,options,correct:options.indexOf(correct),reward:rewardFor(card),created:now};
}
export function refreshQuizzes(owner,now=Date.now()){
  const garden=owner.economy.garden,known=cards.filter(c=>unlocked(owner).has(c.id)),ids=new Set(known.map(c=>c.id));let changed=false;
  const valid=garden.questions.filter(q=>ids.has(q.cardId));if(valid.length!==garden.questions.length){garden.questions=valid;changed=true;}
  if(now<garden.nextAt)return changed;
  const occupied=new Set(garden.questions.map(q=>q.cardId)),available=shuffle(known.filter(c=>!occupied.has(c.id)));
  while(garden.questions.length<3&&available.length)garden.questions.push(makeQuestion(available.pop(),known,now));
  garden.nextAt+= (Math.floor((now-garden.nextAt)/QUIZ_INTERVAL)+1)*QUIZ_INTERVAL;return true;
}
export function quizSummary(owner){const g=owner.economy.garden;return {nextAt:g.nextAt,pending:g.questions.map(({id,cardId,reward,created})=>({id,cardId,reward,created}))};}
export function quizFor(owner,id){const q=owner.economy.garden.questions.find(q=>q.id===id);if(!q)throw Object.assign(new Error('这朵花当前没有待回答的问题。'),{status:404});const {correct,...publicQuestion}=q;return publicQuestion;}
export function answerQuiz(owner,id,choice){
  const g=owner.economy.garden,prior=g.answers.find(a=>a.id===id);if(prior)return {...prior,duplicate:true};
  const q=g.questions.find(q=>q.id===id);if(!q)throw Object.assign(new Error('问题已经回答或不再有效。'),{status:409});
  if(!Number.isInteger(choice)||choice<0||choice>=q.options.length)throw Object.assign(new Error('请选择一个有效答案。'),{status:400});
  const correct=choice===q.correct,earned=correct?q.reward:0;if(correct)creditDiamonds(owner,earned,'quiz-'+q.id);
  const result={id:q.id,cardId:q.cardId,correct,correctChoice:q.correct,correctText:q.options[q.correct],earned};g.questions=g.questions.filter(x=>x.id!==id);g.answers.push(result);if(g.answers.length>60)g.answers.shift();return result;
}
