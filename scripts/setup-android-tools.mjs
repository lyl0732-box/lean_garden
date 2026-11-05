import {mkdir,readFile,writeFile,readdir,stat} from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {createWriteStream,createReadStream} from 'node:fs';import {pipeline} from 'node:stream/promises';import {Readable} from 'node:stream';import {spawn} from 'node:child_process';
const root=path.resolve('artifacts','android-tools');await mkdir(root,{recursive:true});
async function download(url,file,expected,algorithm){
  let exists=false;try{await stat(file);exists=true;}catch{}
  if(!exists){console.log('Downloading',path.basename(file));const r=await fetch(url,{signal:AbortSignal.timeout(600000)});if(!r.ok)throw new Error(url+' '+r.status);await pipeline(Readable.fromWeb(r.body),createWriteStream(file));}
  const hash=createHash(algorithm);for await(const chunk of createReadStream(file))hash.update(chunk);const actual=hash.digest('hex');if(actual!==expected)throw new Error('Checksum mismatch: '+file);return actual;
}
async function extract(zip,dir){await mkdir(dir,{recursive:true});const ps=s=>"'"+s.replaceAll("'","''")+"'";await new Promise((resolve,reject)=>{const p=spawn('powershell.exe',['-NoProfile','-Command',`Expand-Archive -LiteralPath ${ps(zip)} -DestinationPath ${ps(dir)} -Force`],{windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('close',c=>c===0?resolve():reject(new Error('Unzip failed')));});}
const metadata=await(await fetch('https://dl.google.com/android/repository/repository2-3.xml')).text();const items=[];
for(const [key,name]of [['build-tools;36.0.0','build-tools'],['platforms;android-36','platform']]){
  const pkg=metadata.match(new RegExp('<remotePackage path="'+key+'"[\\s\\S]*?</remotePackage>'))?.[0];if(!pkg)throw new Error('Missing package '+key);
  const archive=[...pkg.matchAll(/<archive>[\s\S]*?<\/archive>/g)].map(m=>m[0]).find(a=>!a.includes('<host-os>')||a.includes('<host-os>windows</host-os>'));
  const relative=archive.match(/<url>(.*?)<\/url>/)[1],hash=archive.match(/<checksum type="sha1">(.*?)<\/checksum>/)[1];items.push({name,url:'https://dl.google.com/android/repository/'+relative,expected:hash,algorithm:'sha1'});
}
const jdkURL='https://aka.ms/download-jdk/microsoft-jdk-21.0.13.0.2-windows-x64.zip';const jdkSum=(await(await fetch(jdkURL+'.sha256sum.txt')).text()).match(/[a-fA-F0-9]{64}/)?.[0].toLowerCase();if(!jdkSum)throw new Error('No official JDK SHA-256');items.push({name:'jdk',url:jdkURL,expected:jdkSum,algorithm:'sha256'});
for(const item of items){const zip=path.join(root,item.name+'.zip'),dir=path.join(root,item.name);await download(item.url,zip,item.expected,item.algorithm);if(!(await readdir(dir).catch(()=>[])).length)await extract(zip,dir);}
async function find(base,filename){const todo=[base];while(todo.length){const dir=todo.pop();for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())todo.push(p);else if(e.name===filename)return p;}}throw new Error('Missing '+filename);}
const tools={jdk:path.dirname(path.dirname(await find(path.join(root,'jdk'),'javac.exe'))),buildTools:path.dirname(await find(path.join(root,'build-tools'),'aapt2.exe')),androidJar:await find(path.join(root,'platform'),'android.jar'),sources:items};await writeFile(path.join(root,'tools.json'),JSON.stringify(tools,null,2));console.log('Android build tools ready; no global environment variables changed.');
