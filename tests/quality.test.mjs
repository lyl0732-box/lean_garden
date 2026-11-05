import test from 'node:test';
import assert from 'node:assert/strict';
import {readQuality,saveQuality,connectionQuality,normalizeQuality} from '../public/quality.js';
import {preloadAssets} from '../public/asset-cache.js';

test('native quality handoff is persisted and removed without changing the game route',()=>{
  const data=new Map([['garden-asset-quality','low']]),saved={};
  const previous={localStorage:globalThis.localStorage,location:globalThis.location,history:globalThis.history};
  try{
    globalThis.localStorage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
    globalThis.location={href:'https://garden.example/?garden-quality=high&keep=yes#battle/n02'};
    globalThis.history={state:{scroll:17},replaceState:(state,_,url)=>{saved.state=state;globalThis.location.href=url;}};
    assert.equal(connectionQuality(),'high');assert.equal(readQuality(),'high');
    const url=new URL(location.href);assert.equal(url.hash,'#battle/n02');assert.equal(url.searchParams.get('keep'),'yes');assert.equal(url.searchParams.has('garden-quality'),false);assert.deepEqual(saved.state,{scroll:17});
    location.href='https://garden.example/?garden-quality=invalid#home';assert.equal(connectionQuality(),'high');
    assert.equal(saveQuality('low'),'low');assert.equal(readQuality(),'low');assert.equal(normalizeQuality('<script>'),'high');
    location.href='https://garden.example/?garden-quality=auto#home';assert.equal(connectionQuality(),'high');assert.equal(new URL(location.href).searchParams.has('garden-quality'),false);
    data.set('garden-asset-quality','auto');assert.equal(readQuality(),'high');data.delete('garden-asset-quality');assert.equal(readQuality(),'high');
  }finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

test('quality selection tolerates unavailable browser storage',()=>{
  const previous=globalThis.localStorage;
  try{globalThis.localStorage={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};assert.equal(readQuality(),'high');assert.equal(saveQuality('high'),'high');}
  finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('cancelled downloads cannot replace the current asset set',async()=>{
  const previousFetch=globalThis.fetch,previousAssets=globalThis.__gardenAssets,existing={quality:'high',urls:new Map()};
  globalThis.__gardenAssets=existing;const controller=new AbortController();let started;
  const didStart=new Promise(resolve=>started=resolve);
  try{
    globalThis.fetch=(_url,{signal})=>new Promise((resolve,reject)=>{started();signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});
    const loading=preloadAssets({common:[{id:'/test.js',url:'/test.js',sha256:'a'.repeat(64),bytes:1,type:'script'}],media:[]},'low',()=>{},{signal:controller.signal});
    await didStart;controller.abort();await assert.rejects(loading,{name:'AbortError'});assert.equal(globalThis.__gardenAssets,existing);
  }finally{globalThis.fetch=previousFetch;if(previousAssets===undefined)delete globalThis.__gardenAssets;else globalThis.__gardenAssets=previousAssets;}
});
