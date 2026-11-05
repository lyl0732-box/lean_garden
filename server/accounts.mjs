import {mkdir,readFile,writeFile,rename,copyFile} from 'node:fs/promises';
import {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import path from 'node:path';import {promisify} from 'node:util';
import {dataDir,getProfile,profileById,legacyProfile,save} from './store.mjs';
import {usernameValue,passwordValue} from '../public/account-rules.js';

const derive=promisify(scrypt),file=path.join(dataDir,'accounts.json'),SESSION_MS=30*86400000;
const cost={N:131072,r:8,p:1,maxmem:256*1048576},fail=(status,message,code)=>Object.assign(new Error(message),{status,code});
let db,writes=Promise.resolve(),lock=Promise.resolve(),hashing=0;const hashWaiters=[],attempts=new Map();
const tokenHash=value=>createHash('sha256').update(value).digest('hex');
export function sessionId(cookie=''){const token=/(?:^|;\s*)garden_session=([a-f0-9]{64})(?:;|$)/.exec(cookie)?.[1];return token?tokenHash(token):null;}
export function activeSession(id,now=Date.now()){const s=db.sessions[id];return s&&s.kind!=='remember'&&s.expires>now?s.accountId:null;}
export const managedAccounts=()=>Object.values(db.accounts).map(({id,username,role,profileId,created,lastLoginAt})=>({id,username,role,profileId,created,lastLoginAt:lastLoginAt||null}));
export const managedAccount=id=>db.accounts[id]||null;
export async function setAccountRole(id,role){
  if(!['player','admin'].includes(role))throw fail(400,'角色只能是普通玩家或管理员。');
  return serial(async()=>{const a=db.accounts[id];if(!a)throw fail(404,'用户不存在。');const old=a.role;a.role=role;try{await persist();}catch(e){a.role=old;throw e;}return publicAccount(a);});
}
export async function resetAccountPassword(id,password){
  try{passwordValue(password);}catch(e){throw fail(400,e.message);}if(!db.accounts[id])throw fail(404,'用户不存在。');
  const salt=randomBytes(16).toString('hex'),hash=(await passwordHash(password,salt)).toString('hex');
  return serial(async()=>{const a=db.accounts[id];if(!a)throw fail(404,'用户不存在。');const before={salt:a.salt,passwordHash:a.passwordHash,recoveryHint:a.recoveryHint},revoked=[];
    Object.assign(a,{salt,passwordHash:hash,recoveryHint:''});for(const [key,s]of Object.entries(db.sessions))if(s.accountId===id){revoked.push([key,s]);delete db.sessions[key];}
    try{await persist();}catch(e){Object.assign(a,before);for(const [key,s]of revoked)db.sessions[key]=s;throw e;}
    return {ok:true,revokedSessions:revoked.length};});
}
async function serial(fn){const work=lock.catch(()=>{}).then(fn);lock=work;return work;}
async function persist(){const json=JSON.stringify(db,null,2);const work=writes.catch(()=>{}).then(async()=>{await writeFile(file+'.tmp',json);await copyFile(file,file+'.bak').catch(e=>{if(e.code!=='ENOENT')throw e;});await rename(file+'.tmp',file);});writes=work;return work;}
async function passwordHash(password,salt){
  if(hashing>=2)await new Promise(resolve=>hashWaiters.push(resolve));hashing++;
  try{return await derive(password,salt,64,cost);}finally{hashing--;hashWaiters.shift()?.();}
}
export async function initAccounts(){
  await mkdir(dataDir,{recursive:true});
  try{db=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw new Error('账号文件无法读取，原文件已保留。');db={version:1,accounts:{},sessions:{}};}
  if(db.version!==1||!db.accounts||!db.sessions)throw new Error('账号文件格式不受支持。');
  let changed=false;for(const [key,session]of Object.entries(db.sessions))if(session.expires<=Date.now()){delete db.sessions[key];changed=true;}
  if(changed)await persist();
}
const accountByName=name=>Object.values(db.accounts).find(a=>a.usernameKey===name.toLocaleLowerCase('en-US'));
const bound=profileId=>Object.values(db.accounts).some(a=>a.profileId===profileId);
export const publicAccount=account=>({username:account.username,role:account.role});
export function sessionAccount(cookie='',now=Date.now()){
  const token=/(?:^|;\s*)garden_session=([a-f0-9]{64})(?:;|$)/.exec(cookie)?.[1];if(!token)return null;
  const session=db.sessions[tokenHash(token)];if(!session||session.kind==='remember'||session.expires<=now)return null;
  const account=db.accounts[session.accountId];return account?.profileId&&profileById(account.profileId)?account:null;
}
export function accountProfile(account){return profileById(account.profileId);}
export function rememberedAccount(cookie='',now=Date.now()){
  const token=/(?:^|;\s*)garden_remember=([a-f0-9]{64})(?:;|$)/.exec(cookie)?.[1],s=token&&db.sessions[tokenHash(token)];
  return s?.kind==='remember'&&s.expires>now?db.accounts[s.accountId]||null:null;
}
export async function resumeRemembered(cookie=''){
  const account=rememberedAccount(cookie);if(!account)throw fail(401,'已记住的登录已过期，请重新输入密码。');
  return serial(async()=>{if(rememberedAccount(cookie)!==account)throw fail(401,'登录凭据已被撤销，请重新输入密码。');const token=randomBytes(32).toString('hex');account.lastLoginAt=new Date().toISOString();db.sessions[tokenHash(token)]={accountId:account.id,created:Date.now(),expires:Date.now()+SESSION_MS};await persist();return {account,token};});
}
export async function rememberAccount(account,cookie='',enabled=false){
  return serial(async()=>{const old=/(?:^|;\s*)garden_remember=([a-f0-9]{64})(?:;|$)/.exec(cookie)?.[1];if(old)delete db.sessions[tokenHash(old)];let token=null;
    if(enabled){token=randomBytes(32).toString('hex');db.sessions[tokenHash(token)]={accountId:account.id,kind:'remember',created:Date.now(),expires:Date.now()+SESSION_MS};}await persist();return token;});
}
export function rememberCookie(token,secure=false){return `garden_remember=${token||''}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token?SESSION_MS/1000:0}${secure?'; Secure':''}`;}
export function legacyPreview(cookie=''){
  const profile=legacyProfile(cookie);if(!profile||bound(profile.id))return null;
  return {completed:Object.keys(profile.completed||{}).length,stars:Object.values(profile.completed||{}).reduce((n,r)=>n+r.stars,0)};
}
function adoptProfile(account,cookie,adopt=true){
  if(account.profileId)return profileById(account.profileId);
  const legacy=adopt&&legacyProfile(cookie),profile=legacy&&!bound(legacy.id)?legacy:getProfile('').profile;
  account.profileId=profile.id;return profile;
}
export async function createAccount({username,password,recoveryHint='',role='player',cookie='',adoptLegacy=true,profile=false}){
  const name=usernameValue(username);passwordValue(password);
  if(typeof recoveryHint!=='string'||new TextEncoder().encode(recoveryHint).length>240)throw fail(400,'密码提示词最多 240 字节，请不要把密码直接写进去。');
  if(recoveryHint&&recoveryHint.includes(password))throw fail(400,'提示词不能直接包含密码，请换一个能帮助你回忆的线索。');
  if(accountByName(name))throw fail(409,'这个用户名已经被使用，请换一个。','USERNAME_TAKEN');
  const salt=randomBytes(16).toString('hex'),hash=(await passwordHash(password,salt)).toString('hex');
  return serial(async()=>{
    if(accountByName(name))throw fail(409,'这个用户名已经被使用，请换一个。','USERNAME_TAKEN');
    const account={id:randomUUID(),username:name,usernameKey:name.toLocaleLowerCase('en-US'),role,salt,passwordHash:hash,passwordAlgorithm:'scrypt-N131072-r8-p1',recoveryHint:recoveryHint.trim(),profileId:null,created:new Date().toISOString()};
    db.accounts[account.id]=account;if(profile){adoptProfile(account,cookie,adoptLegacy);await save();}await persist();return account;
  });
}
function checkRate(key,now){
  const record=attempts.get(key);if(record&&record.until>now&&record.count>=8)throw fail(429,'尝试次数较多，请稍后再登录。','LOGIN_RATE_LIMIT');
  if(attempts.size>5000)for(const [id,r]of attempts)if(r.until<now)attempts.delete(id);
}
export async function login({username,password,cookie='',adoptLegacy=true,peer='local'},now=Date.now()){
  let name;try{name=usernameValue(username);passwordValue(password);}catch{throw fail(401,'用户名或密码不正确。','LOGIN_INVALID');}
  const key=peer+'|'+name.toLocaleLowerCase('en-US');checkRate(key,now);
  const account=accountByName(name),salt=account?.salt||'00000000000000000000000000000000',candidate=await passwordHash(password,salt);
  const expected=Buffer.from(account?.passwordHash||'00'.repeat(64),'hex');
  if(!account||candidate.length!==expected.length||!timingSafeEqual(candidate,expected)){
    const old=attempts.get(key),record=old&&old.until>now?old:{count:0,until:now+300000};record.count++;attempts.set(key,record);throw fail(401,'用户名或密码不正确。','LOGIN_INVALID');
  }
  attempts.delete(key);const verifiedHash=account.passwordHash;
  return serial(async()=>{if(account.passwordHash!==verifiedHash)throw fail(401,'密码已更新，请重新登录。','LOGIN_INVALID');adoptProfile(account,cookie,adoptLegacy);await save();account.lastLoginAt=new Date(now).toISOString();const token=randomBytes(32).toString('hex');db.sessions[tokenHash(token)]={accountId:account.id,created:now,expires:now+SESSION_MS};await persist();return {account,token};});
}
export async function register(body){
  let account;try{account=await createAccount({...body,role:'player',profile:true});}catch(error){if(error.status)throw error;throw fail(400,error.message);}
  return login({...body,username:account.username});
}
export async function logout(cookie=''){
  const token=/(?:^|;\s*)garden_session=([a-f0-9]{64})(?:;|$)/.exec(cookie)?.[1];if(token)delete db.sessions[tokenHash(token)];await persist();
}
export function passwordHint(raw){let account;try{account=accountByName(usernameValue(raw));}catch{}return account?.recoveryHint||'没有可用的提示词。请再想一想，或联系花园管理员。';}
export function sessionCookie(token,secure=false,persistent=true){return `garden_session=${token}; Path=/; HttpOnly; SameSite=Strict${persistent?'; Max-Age='+SESSION_MS/1000:''}${secure?'; Secure':''}`;}
export async function seedAdmin(username,password){const existing=accountByName(username);if(existing){if(existing.role!=='admin')throw new Error('同名账号已经存在，未更改其权限。');return {created:false,username:existing.username};}const a=await createAccount({username,password,role:'admin'});return {created:true,username:a.username};}
