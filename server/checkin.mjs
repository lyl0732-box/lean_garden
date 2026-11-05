// Daily rewards use the server's calendar in China, shared by every device.
export const checkinRewards=Object.freeze([
  {day:1,item:'diamonds',quantity:30,label:'30 钻石',icon:'💎'},
  {day:2,item:'hints',quantity:5,label:'5 次提示',icon:'💡'},
  {day:3,item:'diamonds',quantity:50,label:'50 钻石',icon:'💎'},
  {day:4,item:'answers',quantity:1,label:'1 张答案包',icon:'📜'},
  {day:5,item:'adSkips',quantity:1,label:'1 张免广告券',icon:'🎟'},
  {day:6,item:'answers',quantity:2,label:'2 张答案包',icon:'📜'},
  {day:7,item:'diamonds',quantity:300,label:'300 钻石',icon:'💎'}
]);
const dayAt=now=>new Date(now+8*3600000).toISOString().slice(0,10);
export function checkinSummary(owner,now=Date.now()){
  const today=dayAt(now),yesterday=dayAt(now-86400000),record=owner.economy.checkin;
  const claimed=record?.lastDay===today;
  const consecutive=claimed||record?.lastDay===yesterday;
  const previous=consecutive?record.day:0;
  const day=claimed?previous:previous>=7?1:previous+1;
  return {today,claimed,day,completed:claimed?day:day-1,rewards:checkinRewards};
}
export function claimCheckin(owner,now=Date.now()){
  const state=checkinSummary(owner,now),reward=checkinRewards[state.day-1];
  if(state.claimed)return {duplicate:true,checkin:state};
  owner.economy[reward.item]+=reward.quantity;
  owner.economy.checkin={lastDay:state.today,day:state.day};
  return {duplicate:false,reward,checkin:checkinSummary(owner,now)};
}
