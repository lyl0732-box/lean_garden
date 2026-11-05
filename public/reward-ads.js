export function nativeRewardAdsAvailable(ua=globalThis.navigator?.userAgent||''){
  return /Android/i.test(ua)&&/LeanGardenAndroid\/1\b/.test(ua);
}
export function rewardAdOffer(shop){
  if(!nativeRewardAdsAvailable())return {available:false,label:'请使用新版安卓 APP',note:'奖励广告目前仅在新版安卓 APP 中开放。'};
  if(shop.adsStatus==='configuration_pending')return {available:false,label:'奖励广告配置中',note:'广告奖励验证正在配置，请稍后再来。'};
  return {available:!!shop.adsAvailable,label:shop.adsAvailable?'观看并领取 50 钻':'奖励广告暂未开放',note:shop.adsAvailable?'完成广告并经平台确认后到账；提前关闭不扣领取次数。':'广告暂未开放，不会扣次数或发放模拟奖励。'};
}
export function watchNativeReward(ad,{target=globalThis.window,timeout=650000}={}){
  if(!nativeRewardAdsAvailable())return Promise.reject(new Error('请使用新版安卓 APP 观看奖励广告。'));
  if(ad.provider!=='umeng-appwin'||ad.slotId!=='100015016'||!/^[a-zA-Z0-9-]{20,80}$/.test(ad.id||''))return Promise.reject(new Error('广告配置无效，请稍后重试。'));
  const request=crypto.randomUUID();
  return new Promise((resolve,reject)=>{
    let timer;
    const cleanup=()=>{clearTimeout(timer);target.removeEventListener('garden:reward-ad-result',receive);};
    const receive=event=>{if(event.detail?.request!==request)return;cleanup();resolve(event.detail);};
    target.addEventListener('garden:reward-ad-result',receive);
    timer=setTimeout(()=>{cleanup();reject(new Error('广告已超时，请稍后重试。'));},timeout);
    try{target.location.href='leangarden://reward-ad?request='+encodeURIComponent(request)+'&session='+encodeURIComponent(ad.id);}catch(error){cleanup();reject(error);}
  });
}
