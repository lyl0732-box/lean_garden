const fs=require('node:fs/promises'),path=require('node:path'),{createHash,randomUUID}=require('node:crypto');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function validateManifest(manifest){
  if(manifest?.schema!==1||manifest.nativeABI!==1||!Array.isArray(manifest.assets)||!manifest.assets.length||manifest.assets.length>1000)throw new Error('客户端资源清单不兼容，请更新安装包。');
  const seen=new Set();let total=0;
  for(const asset of manifest.assets){
    if(typeof asset.url!=='string'||!/^\/[a-zA-Z0-9_./-]+$/.test(asset.url)||asset.url.split('/').some(x=>x==='.'||x==='..')||seen.has(asset.url)||!/^\b[a-f0-9]{64}$/.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<0||asset.bytes>25*1048576||typeof asset.mime!=='string'||/[\r\n]/.test(asset.mime))throw new Error('资源清单格式不正确，已停止更新。');
    seen.add(asset.url);total+=asset.bytes;
  }
  if(total>250*1048576||!seen.has('/index.html')||!seen.has('/boot.js'))throw new Error('资源清单不完整或过大。');
  return manifest;
}
async function checked(file,asset){try{const bytes=await fs.readFile(file);return bytes.length===asset.bytes&&hash(bytes)===asset.sha256;}catch{return false;}}
async function prepareResources({origin,bundle,cache,fetcher=fetch,onProgress=()=>{}}){
  const response=await fetcher(origin+'/client-manifest.json',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('无法检查游戏更新，请确认服务器已升级并可访问。');
  const raw=await response.text();if(Buffer.byteLength(raw)>512*1024)throw new Error('资源清单过大。');const manifest=validateManifest(JSON.parse(raw));
  await fs.mkdir(path.join(cache,'blobs'),{recursive:true});
  const files=new Map(),stats={bundled:0,cached:0,downloaded:0,downloadBytes:0,total:manifest.assets.length,revision:manifest.revision};
  let cursor=0,failure;
  await Promise.all(Array.from({length:4},async()=>{
    while(!failure&&cursor<manifest.assets.length){
      const asset=manifest.assets[cursor++],built=path.join(bundle,'blobs',asset.sha256),saved=path.join(cache,'blobs',asset.sha256);let source,file;
      try{
        if(await checked(built,asset)){source='bundle';file=built;stats.bundled++;}
        else if(await checked(saved,asset)){source='update';file=saved;stats.cached++;}
        else{
          const response=await fetcher(origin+asset.url+'?v='+asset.sha256.slice(0,16),{redirect:'error',signal:AbortSignal.timeout(45000)});
          if(!response.ok)throw new Error('更新未能下载：'+asset.url);
          const reader=response.body.getReader(),chunks=[];let size=0;
          while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>asset.bytes){await reader.cancel();throw new Error('更新资源超出清单大小：'+asset.url);}chunks.push(value);}
          const bytes=Buffer.concat(chunks);if(bytes.length!==asset.bytes||hash(bytes)!==asset.sha256)throw new Error('更新校验失败：'+asset.url);
          const tmp=saved+'.'+randomUUID()+'.tmp';await fs.writeFile(tmp,bytes);await fs.rename(tmp,saved);source='update';file=saved;stats.downloaded++;stats.downloadBytes+=bytes.length;
        }
        files.set(asset.url,{...asset,file,source});onProgress({...stats,ready:files.size});
      }catch(error){failure=error;}
    }
  }));
  if(failure)throw failure;
  // Publish only after every resource has passed validation. Existing content
  // blobs are immutable, so a failed update cannot mix versions in a session.
  await fs.writeFile(path.join(cache,'last-check.json'),JSON.stringify({revision:manifest.revision,at:new Date().toISOString(),stats}));
  return {manifest,files,stats};
}
module.exports={prepareResources,validateManifest};
