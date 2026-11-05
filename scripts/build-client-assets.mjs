import {readFile,writeFile,mkdir,copyFile,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export async function buildClientAssets({publicRoot='public',bundleDir='clients/bundled'}={}){
  const root=path.resolve(publicRoot),bundle=path.resolve(bundleDir);
  const preload=JSON.parse(await readFile(path.join(root,'assets/preload-manifest.json'),'utf8'));
  const urls=[...new Set(['/index.html','/assets/favicon.svg','/assets/preload-manifest.json',...preload.common.map(a=>a.url),...preload.media.map(a=>a.url)])];
  await mkdir(path.join(bundle,'blobs'),{recursive:true});const assets=[];
  const mimes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.mp3':'audio/mpeg','.json':'application/json; charset=utf-8'};
  for(const url of urls){
    const file=path.join(root,url),bytes=await readFile(file),sha256=createHash('sha256').update(bytes).digest('hex');
    assets.push({url,bytes:bytes.length,sha256,mime:mimes[path.extname(file)]||'application/octet-stream'});
    await copyFile(file,path.join(bundle,'blobs',sha256));
  }
  const manifest={schema:1,nativeABI:1,revision:JSON.parse(await readFile('package.json','utf8')).version,assets};
  const json=JSON.stringify(manifest,null,2);
  await writeFile(path.join(root,'client-manifest.json'),json);await writeFile(path.join(bundle,'manifest.json'),json);
  // Only remove individual obsolete hash blobs in this verified bundle folder.
  // Client caches are never pruned while an active game could still use them.
  const live=new Set(assets.map(a=>a.sha256)),blobDir=path.join(bundle,'blobs');
  for(const item of await readdir(blobDir,{withFileTypes:true}))if(item.isFile()&&/^[a-f0-9]{64}$/.test(item.name)&&!live.has(item.name))await unlink(path.join(blobDir,item.name));
  console.log(`Client bundle: ${assets.length} resources, ${(assets.reduce((n,a)=>n+a.bytes,0)/1048576).toFixed(1)} MiB; both quality settings included.`);
  return {bundle,manifest};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildClientAssets();
