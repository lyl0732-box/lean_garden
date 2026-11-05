import {readFile,readdir,stat,access} from 'node:fs/promises';import path from 'node:path';
const exists=async file=>{try{await access(file);return true;}catch{return false;}};
function stripComments(text){let result='',depth=0;for(let i=0;i<text.length;i++){if(text.slice(i,i+2)==='/-'){depth++;i++;result+='  ';}else if(depth&&text.slice(i,i+2)==='-/'){depth--;i++;result+='  ';}else if(!depth&&text.slice(i,i+2)==='--'){while(i<text.length&&text[i]!=='\n'){result+=' ';i++;}result+='\n';}else result+=depth&&text[i]!=='\n'?' ':text[i];}return result;}
export async function runtimeClosure(project,sysroot){
  const roots=[{source:project,compiled:path.join(project,'.lake/build/lib/lean')}];
  for(const name of await readdir(path.join(project,'.lake/packages')))roots.push({source:path.join(project,'.lake/packages',name),compiled:path.join(project,'.lake/packages',name,'.lake/build/lib/lean')});
  roots.push({source:path.join(sysroot,'src/lean'),compiled:path.join(sysroot,'lib/lean')},{source:path.join(sysroot,'src/lean/lake'),compiled:path.join(sysroot,'lib/lean')});
  const pending=['Garden','Init'],seen=new Set(),files=[],modules=[];let bytes=0;
  while(pending.length){
    const name=pending.pop();if(seen.has(name))continue;seen.add(name);const modulePath=name.replaceAll('.',path.sep);let entry;
    for(const root of roots)if(await exists(path.join(root.source,modulePath+'.lean'))){entry=root;break;}
    if(!entry)throw new Error('Cannot resolve imported module '+name);
    const text=stripComments(await readFile(path.join(entry.source,modulePath+'.lean'),'utf8'));
    // Imports belong to the module header. Later quoted widget JavaScript can
    // also contain the word "import", and must never become a Lean dependency.
    for(const raw of text.split(/\r?\n/)){
      const line=raw.trim();if(!line||line==='module'||line==='prelude')continue;
      const match=/^(?:(?:public|private|meta)\s+)*import\s+(.+)$/.exec(line);if(!match)break;
      for(const imported of match[1].trim().split(/\s+/))if(imported!=='all'&&/^[A-Za-z_][A-Za-z0-9_'.]*$/.test(imported))pending.push(imported);
    }
    const base=path.join(entry.compiled,modulePath);let found=false;
    for(const extension of ['.olean','.olean.private','.olean.server','.ir','.ir.sig']){const file=base+extension;if(await exists(file)){const size=(await stat(file)).size;files.push(file);bytes+=size;if(extension==='.olean')found=true;}}
    if(!found)throw new Error('Missing compiled module '+name);modules.push(name);
  }
  return{modules,files,bytes};
}
