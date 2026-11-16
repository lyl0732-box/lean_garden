import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const adSource=await readFile('clients/taptap-minigame/src/rewarded-ad.js','utf8');
function setup(unit='test-placement'){
  const events={},calls=[];
  const ad={onLoad:f=>events.load=f,onClose:f=>events.close=f,onError:f=>events.error=f,show:()=>{calls.push('show');return Promise.resolve();},load:()=>{calls.push('load');return Promise.resolve();}};
  const box={module:{exports:{}},require:()=>({rewardedVideoAdUnitId:unit}),setTimeout,clearTimeout,Promise,Error};vm.runInNewContext(adSource,box);
  return {instance:new box.module.exports.RewardedAd({createRewardedVideoAd:()=>{calls.push('create');return ad;}}),events,calls,ad};
}
test('TapTap placement remains disabled until configured; no SDK is initialized',async()=>{const {instance,calls}=setup('');assert.equal(instance.configured,false);await assert.rejects(instance.show(),/尚未配置/);assert.equal(calls.length,0);});
test('TapTap show/load never counts as a completed viewing',async()=>{const {instance,events,calls}=setup();let settled=false;const promise=instance.show().then(value=>{settled=true;return value;});await new Promise(r=>setImmediate(r));events.load();await new Promise(r=>setImmediate(r));assert.equal(settled,false);assert.deepEqual(calls,['create','show']);events.close({isEnded:true});assert.equal(await promise,true);instance.destroy();});
test('Incomplete, missing, and nonboolean close payloads do not qualify for a reward',async()=>{for(const value of [undefined,{}, {isEnded:false},{isEnded:'true'}]){const {instance,events}=setup();const promise=instance.show();events.close(value);assert.equal(await promise,false);instance.destroy();}});
test('Concurrent playback is rejected; duplicated close callbacks settle once',async()=>{const {instance,events,calls}=setup();let count=0;const first=instance.show().then(value=>{count++;return value;});await assert.rejects(instance.show(),/正在播放/);events.close({isEnded:true});events.close({isEnded:true});assert.equal(await first,true);assert.equal(count,1);assert.equal(calls.filter(c=>c==='create').length,1);instance.destroy();});
test('TapTap show failure retries load once and then reports failure',async()=>{const {instance,ad,calls}=setup();ad.show=()=>{calls.push('show');return Promise.reject(Error('no fill'));};await assert.rejects(instance.show(),/暂时无法显示/);assert.deepEqual(calls,['create','show','load','show']);instance.destroy();});
test('TapTap adapter preserves manual cookie sessions across requests',async()=>{
  const source=await readFile('clients/taptap-minigame/src/platform.js','utf8'),store=new Map(),requests=[];
  const box={module:{exports:{}},require:()=>({server:'https://example.test'}),Map,Set,Promise,Error};vm.runInNewContext(source,box);
  const tap={getStorageSync:k=>store.get(k),setStorageSync:(k,v)=>store.set(k,v),request:o=>{requests.push(o);o.success({statusCode:200,data:{ok:true},cookies:requests.length===1?['garden_session=abc; HttpOnly; Secure; Path=/','garden_profile=; Max-Age=0']:[]});}};
  const p=new box.module.exports.Platform(tap);await p.request('auth/login',{username:'test',password:'password'});await p.request('bootstrap');assert.match(requests[1].header.Cookie,/garden_session=abc/);assert.equal(new box.module.exports.Platform(tap).cookie,p.cookie);await assert.rejects(p.request('../../private'),/没有这个游戏接口/);
});
