import {readFile,readdir,stat} from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';
import {buildClientAssets} from './build-client-assets.mjs';
await buildClientAssets();
const client=path.resolve('clients/windows'),pkg=JSON.parse(await readFile(path.join(client,'package.json'),'utf8'));
const args=[path.join(client,'node_modules/electron-builder/cli.js'),'--win','nsis','--x64'];
// Reuse the exact pinned official Electron archive rather than fetching it again.
if(process.platform==='win32'&&process.env.LOCALAPPDATA){
  const cache=path.join(process.env.LOCALAPPDATA,'electron/Cache'),name=`electron-v${pkg.devDependencies.electron}-win32-x64.zip`;
  for(const dir of await readdir(cache,{withFileTypes:true}).catch(()=>[]))if(dir.isDirectory()){
    const file=path.join(cache,dir.name,name);if((await stat(file).catch(()=>null))?.size>1000000){args.push('--config.electronDist='+file);console.log('Using cached Electron '+pkg.devDependencies.electron);break;}
  }
}
await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd:client,windowsHide:true,stdio:'inherit'});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error('Windows packaging failed: '+code)));});
