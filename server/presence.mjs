import {activeSession,sessionId} from './accounts.mjs';
export const ONLINE_MS=75000;
export class Presence{
  clients=new Map();lastSeen=new Map();
  heartbeat(account,cookie,body,now=Date.now()){
    if(typeof body.clientId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(body.clientId)||!['online','offline'].includes(body.state))throw Object.assign(new Error('在线心跳格式错误。'),{status:400});
    const sid=sessionId(cookie),key=sid+':'+body.clientId;
    if(body.state==='offline')this.clients.delete(key);
    else{this.clients.set(key,{accountId:account.id,sid,seen:now});this.lastSeen.set(account.id,now);}
    this.online(now);
  }
  online(now=Date.now()){
    const users=new Map();for(const [key,c]of this.clients){if(now-c.seen>ONLINE_MS||activeSession(c.sid,now)!==c.accountId){this.clients.delete(key);continue;}const entry=users.get(c.accountId)||{devices:0,lastSeen:0};entry.devices++;entry.lastSeen=Math.max(entry.lastSeen,c.seen);users.set(c.accountId,entry);}return users;
  }
}
