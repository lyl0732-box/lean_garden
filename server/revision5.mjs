export function prepareRevision5(levels,cards){
  const lesson=levels.find(l=>l.id==='n06a');levels.splice(levels.indexOf(lesson),1);levels.splice(levels.findIndex(l=>l.id==='n05one'),0,lesson);
  levels.find(l=>l.id==='n05one').lesson='第一位小首领：证明 1 + 1 = 2。刚学会的 add_one_eq_succ 可以把加一换成后继，再用数字 2 的定义。';
  levels.find(l=>l.id==='n05one').miniBoss=true;
  for(const chapter of ['n','l','a','t','m'])levels.filter(l=>l.chapter===chapter).forEach((l,i)=>l.number=i+1);
  const order=new Map();let position=0;
  for(const level of levels.filter(l=>l.chapter!=='m'))for(const id of [...level.skills,...level.reward])if(!order.has(id))order.set(id,position++);
  cards.sort((a,b)=>(order.get(a.id)??999)-(order.get(b.id)??999));
  cards.forEach((card,i)=>card.order=i);
}
