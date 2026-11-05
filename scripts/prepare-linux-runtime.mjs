// Lean's x86_64 compiled proof objects are portable; the executable and shared
// libraries are Linux builds. A remote full-curriculum check is mandatory.
import {runtimeClosure} from '../deploy/runtime-closure.mjs';
import {execFileSync} from 'node:child_process';import {writeFile} from 'node:fs/promises';import path from 'node:path';
const env=JSON.parse(execFileSync('lake',['env','node','-e','process.stdout.write(JSON.stringify({LEAN_SYSROOT:process.env.LEAN_SYSROOT}))'],{cwd:'lean',encoding:'utf8',windowsHide:true}));
const closure=await runtimeClosure(path.resolve('lean'),env.LEAN_SYSROOT);
const entries=closure.files.map(file=>{const normalized=file.replaceAll('\\','/'),at=normalized.lastIndexOf('/lib/lean/');if(at<0)throw Error(file);return {file:path.resolve(file),target:'runtime/lib/lean/'+normalized.slice(at+10)};});
await writeFile('artifacts/linux-runtime-files.json',JSON.stringify(entries));await writeFile('artifacts/linux-runtime-modules.json',JSON.stringify(closure.modules));console.log(closure.modules.length,'modules,',Math.round(closure.bytes/1048576),'MiB');
