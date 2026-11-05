import {cp,mkdir,readdir,stat,writeFile} from 'node:fs/promises';import path from 'node:path';
import {runtimeClosure} from './runtime-closure.mjs';
const target=path.resolve(process.argv[2]||'/runtime');
if(target==='/'||target===process.cwd())throw new Error('Unsafe runtime staging path');
let files=0,bytes=0;
async function copy(source,dest,filter=()=>true){
  await cp(source,dest,{recursive:true,filter:async p=>{const s=await stat(p);if(s.isDirectory())return true;if(!filter(p))return false;files++;bytes+=s.size;return true;}});
}
for(const p of ['server','public','package.json','scripts/create-admin.mjs','deploy/lean-env.json','deploy/runtime-smoke.mjs'])await copy('/opt/garden/'+p,path.join(target,'opt/garden',p),p=>!p.endsWith('.mp3')||p.includes('/optimized/'));
await copy('/opt/garden/artifacts/VerifiedCurriculum.lean',path.join(target,'opt/garden/deploy/VerifiedCurriculum.lean'));
await copy('/opt/lean/bin/lean',path.join(target,'opt/lean/bin/lean'));
await copy('/opt/lean/lib',path.join(target,'opt/lean/lib'),p=>/\.so(?:\.[\d.]+)?$/.test(p));
await copy('/opt/node/bin/node',path.join(target,'opt/node/bin/node'));
for(const p of ['LICENSE','LICENSES'])try{await copy('/opt/lean/'+p,path.join(target,'opt/lean',p));}catch(error){if(error.code!=='ENOENT')throw error;}
await copy('/opt/node/LICENSE',path.join(target,'opt/node/LICENSE'));
const libraries=['/opt/garden/lean/.lake/build/lib'];
for(const name of await readdir('/opt/garden/lean/.lake/packages'))libraries.push('/opt/garden/lean/.lake/packages/'+name+'/.lake/build/lib');
for(const lib of libraries)try{await copy(lib,path.join(target,lib),p=>/\.so(?:\.[\d.]+)?$/.test(p));}catch(error){if(error.code!=='ENOENT')throw error;}
const closure=await runtimeClosure('/opt/garden/lean','/opt/lean');
for(const file of closure.files)await copy(file,path.join(target,file));
// Include every upstream license while excluding Git, source, C objects and static archives.
for(const name of await readdir('/opt/garden/lean/.lake/packages'))for(const file of await readdir('/opt/garden/lean/.lake/packages/'+name))if(/^(LICENSE|COPYING|NOTICE)/i.test(file))await copy('/opt/garden/lean/.lake/packages/'+name+'/'+file,path.join(target,'opt/garden/licenses',name,file));
await mkdir(path.join(target,'opt/garden/deploy'),{recursive:true});await writeFile(path.join(target,'opt/garden/deploy/runtime-size.json'),JSON.stringify({modules:closure.modules.length,files,bytes,GiB:bytes/2**30},null,2));console.log('Reduced runtime:',files,'files,',Math.round(bytes/2**20),'MiB');
