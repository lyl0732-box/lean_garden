package cn.leangarden.client;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import com.umeng.union.UMRewardAD;
import com.umeng.union.UMUnionSdk;
import com.umeng.union.api.UMAdConfig;
import com.umeng.union.api.UMUnionApi;
import java.util.Map;

/** Plays only the configured reward placement, after an explicit game click. */
final class RewardAds {
  interface Result {void complete(String status,String message);}
  private final Activity activity;
  private final Handler handler=new Handler(Looper.getMainLooper());
  private Task current;
  private final class Task {
    Result result; UMRewardAD ad; boolean shown,rewarded,finished;
    Runnable timeout;
    Task(Result result){this.result=result;}
  }
  RewardAds(Activity activity){this.activity=activity;}
  private void finish(Task task,String status,String message){
    if(task.finished)return;task.finished=true;handler.removeCallbacks(task.timeout);
    if(current==task)current=null;
    if(task.ad!=null)try{task.ad.destroy();}catch(RuntimeException ignored){}
    android.util.Log.i("GardenAds","result: "+status);
    task.result.complete(status,message);
  }
  void show(String sessionId,Result callback){
    if(current!=null){callback.complete("error","已有广告正在加载或播放。");return;}
    if(!UmengApplication.adsReady){callback.complete("error","广告组件正在准备中，请稍后重试。");return;}
    final Task task=new Task(callback);current=task;
    task.timeout=()->finish(task,"error",task.shown?"广告已超时，请稍后重试。":"广告加载超时，请检查网络后重试。");
    handler.postDelayed(task.timeout,45000);
    UMAdConfig config=new UMAdConfig.Builder().setSlotId("100015016").setUserId(sessionId).setCustomData(sessionId).build();
    android.util.Log.i("GardenAds","loading reward placement");
    try{UMUnionSdk.loadRewardAd(config,new UMUnionApi.AdRenderListener<UMRewardAD>(){
      @Override public void onSuccess(UMUnionApi.AdType type,UMRewardAD ad){}
      @Override public void onFailure(UMUnionApi.AdType type,String message){handler.post(()->finish(task,"error","广告暂未准备好："+safe(message)));}
      @Override public void onRenderFailure(UMUnionApi.AdType type,String message){handler.post(()->finish(task,"error","广告暂时无法显示："+safe(message)));}
      @Override public void onRenderSuccess(UMUnionApi.AdType type,UMRewardAD ad){handler.post(()->{
        if(task.finished){ad.destroy();return;}if(task.shown)return;
        if(activity.isFinishing()||activity.isDestroyed()){finish(task,"cancelled","已离开游戏。");return;}
        task.ad=ad;task.shown=true;handler.removeCallbacks(task.timeout);handler.postDelayed(task.timeout,600000);
        ad.disableShake();
        ad.setAdEventListener(new UMUnionApi.RewardAdListener(){
          @Override public void onReward(boolean valid,Map<String,Object> extra){handler.post(()->{if(!task.finished)task.rewarded|=valid;});}
          @Override public void onDismissed(){handler.postDelayed(()->finish(task,task.rewarded?"rewarded":"cancelled",task.rewarded?"广告已完成，正在确认奖励。":"本次广告未达到奖励条件。"),500);}
          @Override public void onExposed(){android.util.Log.i("GardenAds","reward ad displayed");}
          @Override public void onClicked(View view){}
          @Override public void onError(int code,String message){handler.post(()->finish(task,task.rewarded?"rewarded":"error","广告暂时不可用（"+code+"）。"));}
        });
        try{ad.show(activity);}catch(RuntimeException e){finish(task,"error","广告暂时无法打开，请稍后重试。");}
      });}
    });}catch(RuntimeException e){finish(task,"error","广告暂时无法加载，请稍后重试。");}
  }
  private static String safe(String value){return value==null?"请稍后重试。":value.substring(0,Math.min(value.length(),160));}
  void destroy(){if(current!=null)finish(current,"cancelled","已离开游戏。");}
}
