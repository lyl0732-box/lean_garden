package cn.leangarden.client;

import android.app.Activity;
import android.app.AlertDialog;
import com.taptap.sdk.core.TapTapRegion;
import com.taptap.sdk.core.TapTapSdk;
import com.taptap.sdk.core.TapTapSdkOptions;
import com.taptap.sdk.initializer.api.TapInitCallback;
import com.taptap.sdk.initializer.api.model.ScreenOrientation;
import com.taptap.sdk.license.TapTapLicense;
import com.taptap.sdk.license.TapTapLicenseCallback;
import org.json.JSONObject;
import java.io.*;

/** Included only in a configured --store build. Never treats missing keys as ownership. */
final class TapTapPurchaseGate {
  static void check(Activity activity,Runnable purchased){
    try{
      ByteArrayOutputStream bytes=new ByteArrayOutputStream();
      try(InputStream in=activity.getAssets().open("taptap-license.json")){byte[] data=new byte[4096];int n;while((n=in.read(data))!=-1)bytes.write(data,0,n);}
      JSONObject config=new JSONObject(bytes.toString("UTF-8"));
      TapTapSdkOptions options=new TapTapSdkOptions(config.getString("clientId"),config.getString("clientToken"),TapTapRegion.CN);
      options.setScreenOrientation(ScreenOrientation.PORTRAIT);options.setEnableLog(false);
      TapTapLicense.registerLicenseCallback(new TapTapLicenseCallback(){
        @Override public void onLicenseSuccess(){activity.runOnUiThread(()->{if(!activity.isFinishing()&&!activity.isDestroyed())purchased.run();});}
      });
      TapTapSdk.addInitCallback(new TapInitCallback(){
        @Override public void onInitSuccess(){TapTapSdk.removeInitCallback(this);if(!activity.isFinishing()&&!activity.isDestroyed())TapTapLicense.checkLicense(activity);}
        @Override public void onInitFail(int code,String message){TapTapSdk.removeInitCallback(this);if(!activity.isFinishing()&&!activity.isDestroyed())new AlertDialog.Builder(activity).setTitle("暂时无法验证购买资格").setMessage("请确认网络、TapTap 登录与游戏配置后重试。（"+code+"）").setPositiveButton("重试",(dialog,which)->check(activity,purchased)).setNegativeButton("退出",(dialog,which)->activity.finishAndRemoveTask()).setCancelable(false).show();}
      });
      TapTapSdk.init(activity,options);
    }catch(Exception error){new AlertDialog.Builder(activity).setTitle("买断版配置不完整").setMessage("请通过 TapTap 获取正确的安装包。").setPositiveButton("退出",(dialog,which)->activity.finishAndRemoveTask()).setCancelable(false).show();}
  }
}
