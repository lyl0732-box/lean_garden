export function chooseQuality(_connection,preference='high'){return preference==='low'?'low':'high';}
export const assetURL=source=>globalThis.__gardenAssets?.urls?.get(source)||source;

export async function preloadAssets(manifest,quality,onProgress=()=>{},{signal}={}){
  const assets=[...manifest.common,...manifest.media.filter(a=>a.quality===quality)],total=assets.reduce((sum,a)=>sum+a.bytes,0),loaded=new Map(),urls=new Map();
  let completed=0,cursor=0,cache;const sources={bundle:0,update:0,cache:0,network:0};
  try{if(globalThis.caches)cache=await caches.open('lean-garden-media-v1');}catch{}
  const report=()=>onProgress({loaded:[...loaded.values()].reduce((n,x)=>n+x,0),total,completed,count:assets.length,quality,sources:{...sources}});
  async function load(asset){
    signal?.throwIfAborted();
    const url=asset.url+'?v='+asset.sha256.slice(0,16);
    for(let attempt=0;attempt<3;attempt++){
      signal?.throwIfAborted();const controller=new AbortController();let timer;
      const touch=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(),30000);};
      try{
        loaded.set(asset.id,0);touch();const cached=await cache?.match(url);signal?.throwIfAborted();const response=cached||await fetch(url,{cache:'force-cache',signal:signal?AbortSignal.any([signal,controller.signal]):controller.signal});
        if(!response.ok)throw new Error('资源未能下载：'+asset.url);
        const chunks=[];let size=0;
        if(response.body){const reader=response.body.getReader();while(true){const {value,done}=await reader.read();if(done)break;touch();chunks.push(value);size+=value.byteLength;loaded.set(asset.id,size);report();}}
        else{const bytes=new Uint8Array(await response.arrayBuffer());chunks.push(bytes);size=bytes.byteLength;}
        signal?.throwIfAborted();if(size!==asset.bytes)throw new Error('资源下载不完整：'+asset.url);
        const blob=new Blob(chunks,{type:response.headers.get('Content-Type')||'application/octet-stream'});
        if(cache&&!cached)await cache.put(url,new Response(blob,{headers:{'Content-Type':blob.type}})).catch(()=>{});
        signal?.throwIfAborted();if(['image','audio'].includes(asset.type))urls.set(asset.id,URL.createObjectURL(blob));
        const source=cached?'cache':response.headers.get('X-Garden-Asset-Source')||'network';sources[source in sources?source:'network']++;
        loaded.set(asset.id,size);completed++;report();return;
      }catch(error){signal?.throwIfAborted();if(attempt===2)throw error;}finally{clearTimeout(timer);}
    }
  }
  try{
    const workers=await Promise.allSettled(Array.from({length:4},async()=>{while(cursor<assets.length){const asset=assets[cursor++];await load(asset);}}));
    const failure=workers.find(result=>result.status==='rejected');if(failure)throw failure.reason;
    await Promise.all(assets.filter(a=>a.type==='image').map(async asset=>{const img=new Image();img.src=urls.get(asset.id);try{await img.decode();}catch{throw new Error('有一张插图未能打开，请重新准备。');}}));
    signal?.throwIfAborted();const previous=globalThis.__gardenAssets;
    globalThis.__gardenAssets={urls,quality,total,files:assets.length,sources};
    document.documentElement.dataset.assetQuality=quality;
    document.documentElement.style.setProperty('--garden-world',`url("${assetURL('/assets/garden-world.png')}")`);
    document.documentElement.style.setProperty('--garden-prologue',`url("${assetURL('/assets/story/prologue-v06.png')}")`);
    if(previous)for(const url of previous.urls.values())URL.revokeObjectURL(url);
    return globalThis.__gardenAssets;
  }catch(error){for(const url of urls.values())URL.revokeObjectURL(url);throw error;}
}
