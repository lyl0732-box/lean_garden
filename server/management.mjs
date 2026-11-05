import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,appendFile,lstat,unlink,chmod,mkdir} from 'node:fs/promises';
import {dataDir,exclusive,save} from './store.mjs';
import {managedAccounts,managedAccount,accountProfile,setAccountRole,resetAccountPassword} from './accounts.mjs';
import {economySummary,attachBenefits,freeplayRemaining,ENERGY_MAX,ENERGY_INTERVAL} from './economy.mjs';
import {ONLINE_MS} from './presence.mjs';

const fail=(status,message)=>Object.assign(new Error(message),{status});
const limits={diamonds:1e9,adSkips:1e6,hints:1e6,answers:1e6,energy:ENERGY_MAX,xp:1e8,freeplayMs:315360000000};
const flags=['betaClaimed','trialClaimed','firstRecharge'];
const tag=owner=>createHash('sha256').update(JSON.stringify(owner.economy)).digest('hex');
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
async function bodyOf(req){let bytes=0,parts=[];for await(const part of req){bytes+=part.length;if(bytes>8192)throw fail(413,'请求过大。');parts.push(part);}try{return JSON.parse(Buffer.concat(parts).toString('utf8')||'{}');}catch{throw fail(400,'请求格式错误。');}}
export class SystemMetrics{
  previous=null;
  sampleCPU(){const values=os.cpus(),total=values.reduce((n,c)=>n+Object.values(c.times).reduce((s,v)=>s+v,0),0),idle=values.reduce((n,c)=>n+c.times.idle,0),previous=this.previous;this.previous={total,idle};return {cores:values.length,percent:previous&&total>previous.total?Math.max(0,Math.min(100,100*(1-(idle-previous.idle)/(total-previous.total)))):null};}
  async snapshot(){
    const cpu=this.sampleCPU();let total=os.totalmem(),available=os.freemem();
    if(process.platform==='linux'){const text=await readFile('/proc/meminfo','utf8'),number=name=>Number(new RegExp('^'+name+':\\s+(\\d+)','m').exec(text)?.[1])*1024;total=number('MemTotal');available=number('MemAvailable');}
    return {hostname:os.hostname(),platform:os.platform(),uptimeSeconds:os.uptime(),cpu,load:os.loadavg(),memory:{totalBytes:total,availableBytes:available,usedBytes:total-available,percent:100*(1-available/total)},gameProcess:{pid:process.pid,rssBytes:process.memoryUsage().rss},sampledAt:Date.now()};
  }
}
export function createManagement({presence,metrics=new SystemMetrics(),auditFile=path.join(dataDir,'admin-audit.jsonl')}){
  async function audit(action,account,detail){try{await appendFile(auditFile,JSON.stringify({at:new Date().toISOString(),operator:'local-ssh-console',action,userId:account.id,username:account.username,...detail})+'\n',{mode:0o600});return null;}catch{console.error('Management audit could not be written.');return '操作已保存，但审计日志写入失败，请检查服务器磁盘。';}}
  function userRow(a,online,now){const owner=accountProfile(a),live=online.get(a.id),e=owner?.economy;
    if(!e)return {...a,online:!!live,devices:live?.devices||0,lastSeenAt:presence.lastSeen.get(a.id)||null,hasProfile:false};
    attachBenefits(owner,a);const effective=economySummary(owner,now),energy=Math.min(ENERGY_MAX,e.energy+Math.floor(Math.max(0,now-e.energyAt)/ENERGY_INTERVAL));
    return {...a,online:!!live,devices:live?.devices||0,lastSeenAt:presence.lastSeen.get(a.id)||null,hasProfile:true,completed:Object.keys(owner.completed||{}).length,stars:Object.values(owner.completed||{}).reduce((n,r)=>n+(r.stars||0),0),lastLevel:owner.lastLevel,freePlay:!!owner.freePlay,unlimited:a.role==='admin',level:effective.growth.level,walletTag:tag(owner),wallet:{diamonds:e.diamonds,adSkips:e.adSkips,hints:e.hints,answers:e.answers,energy,xp:e.xp,freeplayMs:freeplayRemaining(e,now),betaClaimed:e.betaClaimed,trialClaimed:e.trialClaimed,firstRecharge:e.firstRecharge}};
  }
  return async(req,res)=>{
    try{
      const url=new URL(req.url,'http://local-management'),now=Date.now();
      if(req.method==='GET'&&url.pathname==='/snapshot'){
        const online=presence.online(now),users=managedAccounts().map(a=>userRow(a,online,now)).sort((a,b)=>a.username.localeCompare(b.username,'zh-CN'));
        return json(res,200,{server:await metrics.snapshot(),totalUsers:users.length,onlineUsers:users.filter(u=>u.online).length,onlineWindowMs:ONLINE_MS,users});
      }
      if(req.method!=='POST')throw fail(404,'没有这个管理接口。');
      const match=/^\/users\/([a-f0-9-]{36})\/(wallet|role|password)$/.exec(url.pathname);if(!match)throw fail(404,'没有这个管理接口。');
      const account=managedAccount(match[1]);if(!account)throw fail(404,'用户不存在。');const body=await bodyOf(req),action=match[2];let result;
      if(action==='wallet'){
        const owner=accountProfile(account);if(!owner)throw fail(409,'这个账号还没有游戏存档，请先登录一次游戏。');
        const values=body.values;if(!values||typeof values!=='object'||Array.isArray(values)||!Object.keys(values).length)throw fail(400,'请选择需要修改的参数。');
        for(const [key,value]of Object.entries(values)){if(Object.hasOwn(limits,key)){if(!Number.isSafeInteger(value)||value<0||value>limits[key])throw fail(400,key+' 超出允许范围。');}else if(flags.includes(key)){if(typeof value!=='boolean')throw fail(400,key+' 必须是勾选状态。');}else throw fail(400,'不支持修改这个参数：'+key);}
        result=await exclusive(owner,async()=>{
          if(typeof body.expectedTag!=='string'||body.expectedTag!==tag(owner))throw fail(409,'玩家的背包刚发生了变化。请刷新此用户后重新填写，避免覆盖正在进行的操作。');
          const before=structuredClone(owner.economy),e=owner.economy;Object.assign(e,values);
          if('energy'in values)e.energyAt=Date.now();if('freeplayMs'in values)e.freeplayStartedAt=owner.freePlay?Date.now():null;
          try{await save();}catch(error){owner.economy=before;throw error;}
          return {ok:true};
        });
        result.auditWarning=await audit('wallet',account,{values});
      }else if(action==='role'){
        await setAccountRole(account.id,body.role);const owner=accountProfile(account);if(owner)attachBenefits(owner,account);result={ok:true,auditWarning:await audit('role',account,{role:body.role})};
      }else{
        result=await resetAccountPassword(account.id,body.password);
        result.auditWarning=await audit('password-reset',account,{revokedSessions:result.revokedSessions});
      }
      return json(res,200,result);
    }catch(error){if(!error.status)console.error('Management request failed:',error.message);return json(res,error.status||500,{error:error.status?error.message:'管理操作失败，请检查服务器日志。'});}
  };
}
export async function startManagement(socketPath,options){
  await mkdir(path.dirname(socketPath),{recursive:true});
  const existing=await lstat(socketPath).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(existing){if(!existing.isSocket())throw Error('Management socket path is occupied by a non-socket file.');
    const active=await new Promise(resolve=>{const r=http.get({socketPath,path:'/snapshot'},res=>{res.resume();resolve(true);});r.setTimeout(1000,()=>{r.destroy();resolve(true);});r.on('error',()=>resolve(false));});
    if(active)throw Error('Management socket already active.');await unlink(socketPath);
  }
  const server=http.createServer(createManagement(options));await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(socketPath,resolve);});await chmod(socketPath,0o600);return server;
}
