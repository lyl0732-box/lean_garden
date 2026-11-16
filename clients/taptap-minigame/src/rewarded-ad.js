const config=require('../config.js');

// Only TapTap's official SDK is used here. Never grant a reward on load/show.
class RewardedAd {
  constructor(tap){this.tap=tap;this.ad=null;this.pending=null;this.loaded=false;}
  get configured(){return !!config.rewardedVideoAdUnitId&&typeof this.tap.createRewardedVideoAd==='function';}
  initialize(){
    if(this.ad)return;
    if(!this.configured)throw Error('TapTap 官方广告位尚未配置。');
    this.ad=this.tap.createRewardedVideoAd({adUnitId:config.rewardedVideoAdUnitId});
    this.close=result=>{this.loaded=false;this.finish(null,!!(result&&result.isEnded===true));};
    this.error=error=>{this.loaded=false;this.finish(Error('暂无广告，请稍后重试。'+(error.errMsg||'')));};
    this.load=()=>{this.loaded=true;};
    this.ad.onLoad(this.load);this.ad.onClose(this.close);this.ad.onError(this.error);
  }
  finish(error,ended){const pending=this.pending;if(!pending)return;this.pending=null;clearTimeout(pending.timer);if(error)pending.reject(error);else pending.resolve(ended);}
  async show(){
    if(this.pending)throw Error('已有广告正在播放。');
    this.initialize();
    return new Promise((resolve,reject)=>{
      this.pending={resolve,reject,timer:setTimeout(()=>this.finish(Error('广告等待超时，请重试。')),600000)};
      Promise.resolve().then(()=>this.ad.show()).catch(()=>this.ad.load().then(()=>this.ad.show())).catch(error=>this.finish(Error('广告暂时无法显示。'+(error.errMsg||''))));
    });
  }
  destroy(){this.finish(Error('游戏已退出。'));if(this.ad){if(this.ad.offLoad)this.ad.offLoad(this.load);if(this.ad.offClose)this.ad.offClose(this.close);if(this.ad.offError)this.ad.offError(this.error);}this.ad=null;}
}
module.exports={RewardedAd};
