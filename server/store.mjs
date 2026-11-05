import { mkdir, readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { root } from './lean.mjs';
import legacy from './legacy-v1.json' with { type:'json' };
import legacyV2 from './legacy-v2.json' with {type:'json'};
import legacyV3 from './legacy-v3.json' with {type:'json'};
import {campaign,byId,cards} from './content.mjs';
import {migrateChallengeV7} from './revision7.mjs';
import {migrateRevision9} from './revision9.mjs';
import {migrateEconomy} from './economy.mjs';

export const dataDir=process.env.GARDEN_DATA_DIR || path.join(root,'data');
const file=path.join(dataDir,'progress.json');
let database;
let writes=Promise.resolve();
const locks=new Map();
const oldStep=(id,step)=>typeof step==='object'?step.code:legacyV3[id]?.actions?.[step]||legacyV2[id]?.actions?.[step]||legacyV2.n01.actions?.[step];
export async function initStore() {
  await mkdir(dataDir,{recursive:true});
  try { database=JSON.parse(await readFile(file,'utf8')); }
  catch(error) {
    if(error.code!=='ENOENT') throw new Error(`存档无法读取，已保留原文件：${error.message}`);
    database={version:1,profiles:{}};
  }
  if(database.version!==1||!database.profiles) throw new Error('存档格式不受支持；原文件已保留。');
  let migrated=false;
  for(const profile of Object.values(database.profiles)) {
    if(migrateChallengeV7(profile))migrated=true;
    if(migrateRevision9(profile))migrated=true;
    if(migrateEconomy(profile,campaign))migrated=true;
    profile.introduced ||= [];
    if(profile.rulesVersion>=4){
      // Common buttons were not part of the per-level v3 snapshot. Recover them
      // from the original stored steps as well as from the common v2 table.
      if(profile.legacyAttemptsV3)for(const [id,result]of Object.entries(profile.completed)){
        if(result.proofVersion===4||!result.steps?.length||result.proof?.length>=result.steps.length)continue;
        const recovered=result.steps.map(s=>oldStep(id,s));
        if(recovered.every(Boolean)){result.proof=recovered;migrated=true;}
      }
      continue;
    }
    if(profile.rulesVersion<3){
    if(profile.rulesVersion!==2){
    profile.legacyAttempts=structuredClone(profile.attempts);
    for(const [id,result] of Object.entries(profile.completed))
      result.proof ||= result.steps.map(step=>legacy[id]?.[step]).filter(Boolean);
    for(const [id,attempt] of Object.entries(profile.attempts)) {
      attempt.steps=attempt.steps.map(step=>({kind:'migrated',code:legacy[id]?.[step]?.replace(/^rw\b/,'rewrite')})).filter(s=>s.code);
      if(['n03','n04','n05'].includes(id))attempt.steps=[];
      attempt.revision++;
    }
    profile.rulesVersion=2;
    }
    profile.legacyAttemptsV2=structuredClone(profile.attempts);
    profile.legacyUnlocked=[...new Set((profile.visited||[]).flatMap(id=>byId.get(id)?.skills||[]))];
    const oldCode=(id,step)=>typeof step==='object'?step.code:legacyV2[id]?.actions?.[step];
    for(const [id,result] of Object.entries(profile.completed))result.proof ||= result.steps.map(s=>oldCode(id,s)).filter(Boolean);
    for(const [id,attempt] of Object.entries(profile.attempts)){
      attempt.steps=attempt.steps.map(s=>({kind:'migrated',code:oldCode(id,s)})).filter(s=>s.code);
      attempt.revision++;
    }
    profile.introduced=[...new Set(['rfl',...profile.introduced])].filter(id=>!['exact','assumption'].includes(id));
    profile.rulesVersion=3;
    }
    profile.legacyAttemptsV3=structuredClone(profile.attempts);
    for(const [id,result] of Object.entries(profile.completed)){
      result.statement ||= legacyV3[id]?.statement || byId.get(id)?.statement;
      result.proof ||= result.steps.map(s=>oldStep(id,s)).filter(Boolean);
      result.needsReproof=!!byId.get(id)?.reproveV4;
    }
    for(const attempt of Object.values(profile.attempts)){attempt.steps=[];attempt.revision++;}
    profile.topicsLearned=[];
    profile.introduced=profile.introduced.filter(id=>cards.some(c=>c.id===id&&c.kind!=='theorem'));
    profile.rulesVersion=4;
    migrated=true;
  }
  if(migrated)await save();
}
export function getProfile(cookie='') {
  const id=/(?:^|;\s*)garden_profile=([a-f0-9]{48})(?:;|$)/.exec(cookie)?.[1];
  if(id&&database.profiles[id]) return {profile:database.profiles[id],fresh:false};
  const token=randomBytes(24).toString('hex');
  const profile={id:token,created:new Date().toISOString(),visited:[],completed:{},attempts:{},lastLevel:'n01',introduced:['rfl'],topicsLearned:[],rulesVersion:4,challengeVersion:7,curriculumVersion:9};
  migrateEconomy(profile);
  database.profiles[token]=profile;
  return {profile,fresh:true};
}
export function profileById(id){return database.profiles[id]||null;}
export function legacyProfile(cookie=''){
  const id=/(?:^|;\s*)garden_profile=([a-f0-9]{48})(?:;|$)/.exec(cookie)?.[1];
  return id?profileById(id):null;
}
export async function save() {
  const snapshot=JSON.stringify(database,null,2);
  const operation=writes.catch(()=>{}).then(async()=>{
    await writeFile(file+'.tmp',snapshot);
    await copyFile(file,file+'.bak').catch(error=>{if(error.code!=='ENOENT') throw error;});
    await rename(file+'.tmp',file);
  });
  writes=operation;
  await operation;
}
export async function exclusive(profile,fn) {
  const previous=locks.get(profile.id)||Promise.resolve();
  const operation=previous.catch(()=>{}).then(fn);
  locks.set(profile.id,operation);
  try {return await operation;} finally {if(locks.get(profile.id)===operation)locks.delete(profile.id);}
}

