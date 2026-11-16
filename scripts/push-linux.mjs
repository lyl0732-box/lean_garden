import {readFile,writeFile,mkdir,cp,stat} from 'node:fs/promises';import path from 'node:path';import {execFileSync,spawn} from 'node:child_process';import {createHash} from 'node:crypto';
const root=path.resolve('.'),config=JSON.parse(await readFile('deploy/linux-target.json','utf8')),version=JSON.parse(await readFile('package.json','utf8')).version;
const remote=config.user+'@'+config.host,key=path.resolve(config.key),hosts=path.resolve(config.knownHosts);
const options=['-i',key,'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+hosts,'-o','ConnectTimeout=15'];
const ssh=command=>execFileSync('ssh',[...options,remote,command],{encoding:'utf8',windowsHide:true,maxBuffer:4*1048576});
async function run(file,args){await new Promise((resolve,reject)=>{const p=spawn(file,args,{cwd:file==='lake'?path.join(root,'lean'):root,windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('exit',c=>c===0?resolve():reject(new Error(file+' exited '+c)));});}
if(!/^[a-zA-Z0-9.-]+$/.test(config.host)||!/^[a-zA-Z0-9_-]+$/.test(config.user)||config.root!=='/home/ubuntu/lean-garden')throw Error('Invalid Linux target');
if(!Number.isInteger(config.port)||config.port<1024||config.port>65535)throw Error('Invalid Linux service port');
await stat(key);let previous={files:[]};try{previous=JSON.parse(ssh('cat '+config.root+'/inventory.json 2>/dev/null || cat '+config.root+'/current/.manifest.json 2>/dev/null'));}catch{}
const old=new Map(previous.files.map(f=>[f.path,f.sha256])),client=JSON.parse(await readFile('public/client-manifest.json','utf8'));
const sources=new Map(client.assets.map(a=>['public'+a.url,'public'+a.url]));sources.set('public/client-manifest.json','public/client-manifest.json');sources.set('package.json','package.json');sources.set('scripts/create-admin.mjs','scripts/create-admin.mjs');
for(const name of ['lean-garden-cover-v05.png','lean-garden-poster-v05.png'])sources.set('public/assets/promo/'+name,'public/assets/promo/'+name);
try{const release=JSON.parse(await readFile('public/android-release.json','utf8'));if(release.schema!==1||!/^\/downloads\/LeanGarden-[0-9.]+-local\.apk$/.test(release.url))throw Error('Invalid Android release');const apk='public'+release.url,bytes=await readFile(apk);if(bytes.length!==release.bytes||createHash('sha256').update(bytes).digest('hex')!==release.sha256)throw Error('Android release checksum mismatch');sources.set('public/android-release.json','public/android-release.json');sources.set(apk,apk);}catch(e){if(e.code!=='ENOENT')throw e;}
const {readdir}=await import('node:fs/promises');for(const file of await readdir('server'))if(/\.(mjs|json)$/.test(file))sources.set('server/'+file,'server/'+file);
await run('lake',['build','Garden']);
for(const base of ['Garden','Garden/Strict'])for(const ext of ['.olean','.olean.private','.olean.server','.ir','.ir.sig']){const file='lean/.lake/build/lib/lean/'+base+ext;try{await stat(file);sources.set('runtime/lib/lean/'+base+ext,file);}catch{}}
const id='v'+version.replaceAll('.','-')+'-'+Date.now(),stage=path.join(root,'artifacts','linux-delta-'+id),payload=path.join(stage,'payload');await mkdir(payload,{recursive:true});const files=[],changed=[];
for(const [dest,source] of sources){const bytes=await readFile(source),sha256=createHash('sha256').update(bytes).digest('hex'),entry={path:dest,sha256,bytes:bytes.length};files.push(entry);if(old.get(dest)!==sha256){const target=path.join(payload,dest);await mkdir(path.dirname(target),{recursive:true});await cp(source,target);changed.push(dest);}}
const archive=path.join(stage,'delta.tar.gz'),list=path.join(stage,'files.txt');await writeFile(list,changed.join('\n')+'\n');
if(!changed.length){console.log('Already current. No files uploaded.');process.exit(0);}
await run(process.platform==='win32'?'C:/Windows/System32/tar.exe':'tar',['-czf',archive,'-C',payload,'-T',list]);
const report={revision:version,files,changedFiles:changed.length,uploadedBytes:(await stat(archive)).size};await writeFile(path.join(stage,'manifest.json'),JSON.stringify(report));
console.log('Uploading',changed.length,'changed files,',(report.uploadedBytes/1048576).toFixed(2),'MiB. Player data is excluded.');
const target=config.root+'/incoming/'+id;ssh('mkdir -p '+target);
await run('scp',[...options,archive,path.join(stage,'manifest.json'),'deploy/apply-update.py',remote+':'+target+'/']);
console.log(ssh('python3 '+target+'/apply-update.py '+id+' '+config.port));
await writeFile('artifacts/linux-last-push.json',JSON.stringify({...report,date:new Date().toISOString(),url:config.url},null,2));
console.log('Ready:',config.url);
