package cn.leangarden.client;

import android.app.Application;
import com.umeng.commonsdk.UMConfigure;
import android.os.Bundle;
import com.umeng.umcrash.UMCrash;
import com.umeng.union.UMUnionSdk;

public class UmengApplication extends Application {
    public static volatile boolean adsReady=false;
    @Override
    public void onCreate() {
        super.onCreate();
        
        // 友盟统计SDK初始化
        UMConfigure.setLogEnabled(true);
        UMConfigure.preInit(this, "6aebec4f6545637cd636b15a", "direct");
        
        new Thread(new Runnable() {
            @Override
            public void run() {

        // APM性能监控配置（必须在UMConfigure.init之前调用）
        Bundle bundle = new Bundle();
        bundle.putBoolean(UMCrash.KEY_ENABLE_CRASH_JAVA, true);
        bundle.putBoolean(UMCrash.KEY_ENABLE_CRASH_NATIVE, true);
        bundle.putBoolean(UMCrash.KEY_ENABLE_ANR, true);
        bundle.putBoolean(UMCrash.KEY_ENABLE_PA, true);
        bundle.putBoolean(UMCrash.KEY_ENABLE_LAUNCH, true);
        bundle.putBoolean(UMCrash.KEY_ENABLE_MEM, true);
        bundle.putBoolean(UMCrash.KEY_ENABLE_NET, true);
        bundle.putBoolean(UMCrash.KEY_ENABLE_PAGE, true);
        bundle.putBoolean(UMCrash.KEY_ENABLE_POWER, true);
        bundle.putBoolean(UMCrash.KEY_ENABLE_CODE_LOG, true);
        bundle.putBoolean(UMCrash.KEY_ENABLE_MEMLEAK, true);
        bundle.putLong(UMCrash.KEY_PA_TIMEOUT_TIME, 2000L);
        UMCrash.initConfig(bundle);

                UMConfigure.init(
                    UmengApplication.this,
                    "6aebec4f6545637cd636b15a",
                    "direct",
                    UMConfigure.DEVICE_TYPE_PHONE,
                    null
                );
                try {
                    UMUnionSdk.setAdAutoLoadEnable(false);
                    UMUnionSdk.init(UmengApplication.this);
                    adsReady=true;
                } catch(RuntimeException error) {
                    android.util.Log.e("GardenAds","Advertising initialization failed",error);
                }
            }
        }).start();
    }
}
