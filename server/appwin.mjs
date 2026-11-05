import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';

export const APPWIN_SLOT='100015016';
const fail=(status,message,code)=>Object.assign(new Error(message),{status,code});
const equal=(a,b)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));

// Only this server receives the advertising platform's security key. The APK,
// browser and exported game saves never contain it or a provider signature.
export async function openAppwin({directory,securityKey='',now=Date.now}={}) {
  const file=path.join(directory,'appwin-rewards.json');
  let ledger;
  try{ledger=JSON.parse(await readFile(file,'utf8'));}
  catch(e){if(e.code!=='ENOENT')throw e;ledger={version:1,sessions:{},transactions:{}};}
  if(ledger.version!==1||!ledger.sessions||!ledger.transactions)throw Error('Invalid AppWin reward ledger');
  let queue=Promise.resolve();
  const exclusive=fn=>{const task=queue.then(fn);queue=task.catch(()=>{});return task;};
  async function persist(){await mkdir(directory,{recursive:true});await writeFile(file+'.tmp',JSON.stringify(ledger),{mode:0o600});await rename(file+'.tmp',file);}
  async function change(fn){const before=structuredClone(ledger);try{const value=fn();await persist();return value;}catch(e){ledger=before;throw e;}}
  const adapter={
    ready:!!securityKey.trim(),provider:'umeng-appwin',slotId:APPWIN_SLOT,
    async createSession({ownerId,purpose}) {
      if(!adapter.ready)throw fail(503,'广告奖励验证还在配置中，请稍后再试。','ADS_UNAVAILABLE');
      return exclusive(()=>change(()=>{
        const time=now();
        for(const [id,s] of Object.entries(ledger.sessions))if(!s.transaction&&s.expires<time)delete ledger.sessions[id];
        if(Object.values(ledger.sessions).filter(s=>s.ownerId===ownerId&&!s.transaction&&s.expires>time).length>=3)throw fail(429,'请先完成当前广告，或稍后再试。','AD_SESSION_LIMIT');
        const id=randomUUID();ledger.sessions[id]={ownerId,purpose,expires:time+600000};
        return {id,provider:'umeng-appwin',slotId:APPWIN_SLOT,expires:time+600000};
      }));
    },
    async verifyReward({ownerId,receipt}) {
      const session=ledger.sessions[receipt?.sessionId];
      if(!session||session.ownerId!==ownerId)throw fail(403,'这次广告不属于当前账号。','AD_RECEIPT_INVALID');
      if(!session.transaction)throw fail(409,'正在等待广告平台确认奖励。','AD_REWARD_PENDING');
      return {id:'appwin:'+session.transaction,sessionId:receipt.sessionId};
    },
    async acceptCallback(params,grant) {
      if(!adapter.ready)return false;
      for(const name of ['user_id','trans_id','sign'])if(params.getAll(name).length!==1)return false;
      const id=params.get('user_id'),transaction=params.get('trans_id'),sign=params.get('sign');
      if(!id||!transaction||transaction.length>256||/[\r\n\0]/.test(transaction)||!/^\w[\w-]{20,79}$/.test(id)||!/^([a-f0-9]{64})$/i.test(sign||''))return false;
      const expected=createHash('sha256').update(securityKey+':'+transaction).digest('hex');
      if(!equal(expected,sign.toLowerCase()))return false;
      const ownerId=await exclusive(async()=>{
        const session=ledger.sessions[id];
        if(!session||(!session.transaction&&session.expires<now()))return false;
        const extra=params.get('extra');if(extra&&extra!==id)return false;
        // A platform transaction can belong to exactly one session/account,
        // including after a restart. Never trust client "valid: true" flags.
        if(ledger.transactions[transaction]&&ledger.transactions[transaction]!==id)return false;
        if(session.transaction&&session.transaction!==transaction)return false;
        if(!session.transaction)await change(()=>{session.transaction=transaction;ledger.transactions[transaction]=id;});
        return session.ownerId;
      });
      if(!ownerId)return false;
      // Release the ledger lock before acquiring the profile lock. Starting
      // an ad already holds that profile lock and then writes this ledger.
      await grant(ownerId,id);
      return true;
    }
  };
  return adapter;
}

export async function configuredAppwin(directory) {
  let key=process.env.GARDEN_APPWIN_SECURITY_KEY?.trim()||'';
  if(!key){
    const files=process.env.GARDEN_APPWIN_SECURITY_KEY_FILE?[process.env.GARDEN_APPWIN_SECURITY_KEY_FILE]:[path.join(directory,'appwin-security-key.txt'),path.resolve('deploy/.private/appwin-security-key.txt')];
    for(const file of files)try{key=(await readFile(file,'utf8')).replace(/^\uFEFF/,'').trim();if(key)break;}catch(e){if(e.code!=='ENOENT')throw e;}
  }
  return openAppwin({directory,securityKey:key});
}
