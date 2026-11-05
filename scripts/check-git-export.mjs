import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';

// Inspect the exact staged bytes, not just the working tree. Never print secrets.
const git=(...args)=>execFileSync('git',args,{windowsHide:true,maxBuffer:64*1024*1024});
const paths=git('ls-files','-z').toString('utf8').split('\0').filter(Boolean);
if(!paths.length)throw Error('Stage the source files before checking the export.');
const blocked=/(^|\/)(?:\.private|\.signing|node_modules|\.gradle|\.lake|\.scratch|artifacts|dist|data|logs|任务清单|__pycache__)(?:\/|$)|^clients\/bundled\/|^public\/(?:downloads\/|assets\/optimized\/)|(?:^|\/)\.env(?:\.|$)|\.(?:pem|key|jks|keystore|p12|pfx|apk|exe|pyc)$/i;
const patterns=[/-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/,/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/,/\bgithub_pat_[A-Za-z0-9_]{40,}\b/,/\bAKIA[0-9A-Z]{16}\b/];
const privateValues=[];
try{privateValues.push((await readFile('deploy/.private/appwin-security-key.txt','utf8')).trim());}catch{}
try{const signing=JSON.parse(await readFile('clients/android/.signing/local.json','utf8'));if(signing.password)privateValues.push(signing.password);}catch{}
const errors=[],files=[];
for(const file of paths){
  if(blocked.test(file)){errors.push({file,reason:'private or generated path'});continue;}
  const bytes=git('show',':'+file);
  if(bytes.length>50*1000*1000)errors.push({file,reason:'oversized source file'});
  const text=bytes.toString('utf8');
  if(patterns.some(p=>p.test(text))||privateValues.filter(s=>s.length>=8).some(s=>text.includes(s)))errors.push({file,reason:'possible credential; value redacted'});
  files.push({path:file,bytes:bytes.length});
}
const report={date:new Date().toISOString(),files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),largest:[...files].sort((a,b)=>b.bytes-a.bytes).slice(0,10),errors};
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/github-export-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
