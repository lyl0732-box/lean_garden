package cn.leangarden.client;

import android.app.*;
import android.content.*;
import android.content.pm.*;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.*;

final class AppUpdates {
  private final Activity activity;
  private final java.util.concurrent.ExecutorService worker=java.util.concurrent.Executors.newSingleThreadExecutor();
  private boolean busy=false,awaitingPermission=false;
  AppUpdates(Activity a){activity=a;}
  String version(){try{return activity.getPackageManager().getPackageInfo(activity.getPackageName(),0).versionName;}catch(Exception e){return "未知";}}
  private long code(PackageInfo p){return Build.VERSION.SDK_INT>=28?p.getLongVersionCode():p.versionCode;}
  private long installedCode()throws Exception{return code(activity.getPackageManager().getPackageInfo(activity.getPackageName(),0));}
  private boolean alive(){return !activity.isFinishing()&&!activity.isDestroyed();}
  private void error(Exception e){activity.runOnUiThread(()->{busy=false;if(alive())new AlertDialog.Builder(activity).setTitle("安装包更新暂未完成").setMessage(e.getMessage()).setPositiveButton("知道了",null).show();});}
  private HttpURLConnection connect(String url)throws Exception{HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();c.setConnectTimeout(15000);c.setReadTimeout(30000);c.setInstanceFollowRedirects(false);c.setRequestProperty("Cache-Control","no-cache");if(c.getResponseCode()!=200){c.disconnect();throw new IOException("服务器尚未提供可用的安装包，请稍后再试。");}return c;}
  void check(String target){
    if(busy){Toast.makeText(activity,"正在检查或下载安装包…",Toast.LENGTH_SHORT).show();return;}busy=true;
    Toast.makeText(activity,"正在检查安装包版本 · 当前 "+version(),Toast.LENGTH_SHORT).show();
    worker.execute(()->{try{
      HttpURLConnection c=connect(target+"/android-release.json?check="+System.currentTimeMillis());ByteArrayOutputStream bytes=new ByteArrayOutputStream();
      try(InputStream in=c.getInputStream()){byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1){if(bytes.size()+n>32768)throw new IOException("更新清单格式错误。");bytes.write(b,0,n);}}finally{c.disconnect();}
      JSONObject m=new JSONObject(new String(bytes.toByteArray(),"UTF-8"));
      if(m.optInt("schema")!=1||!activity.getPackageName().equals(m.optString("package"))||!m.optString("url").matches("/downloads/LeanGarden-[0-9.]+-local\\.apk")||!m.optString("sha256").matches("[a-f0-9]{64}")||m.optLong("bytes")<1||m.optLong("bytes")>200*1048576L||m.optLong("versionCode")<installedCode())throw new IOException("更新清单不可用或版本低于当前安装版本。");
      boolean newer=m.getLong("versionCode")>installedCode();
      activity.runOnUiThread(()->{if(!alive())return;busy=false;new AlertDialog.Builder(activity).setTitle(newer?"发现新版本 "+m.optString("versionName"):"已是最新安装包 · "+version()).setMessage("当前安装版本："+version()+"\n服务器版本："+m.optString("versionName")+"\n安装包约 "+Math.round(m.optLong("bytes")/1048576.0)+" MB。下载后由系统安装器覆盖安装，账号与进度保留。\n"+m.optString("notes","")).setNegativeButton("稍后",null).setPositiveButton(newer?"下载并安装":"重新下载安装",(d,w)->download(target,m)).show();});
    }catch(Exception e){error(e);}});
  }
  private void download(String target,JSONObject m){
    if(busy)return;busy=true;ProgressDialog progress=new ProgressDialog(activity);progress.setTitle("下载安装包");progress.setProgressStyle(ProgressDialog.STYLE_HORIZONTAL);progress.setMax(100);progress.setCancelable(false);progress.show();
    worker.execute(()->{File part=new File(activity.getFilesDir(),"updates/garden-update.apk.part");try{
      part.getParentFile().mkdirs();HttpURLConnection c=connect(target+m.getString("url"));MessageDigest digest=MessageDigest.getInstance("SHA-256");long total=0,expected=m.getLong("bytes");int shown=-1;
      try(InputStream in=c.getInputStream();OutputStream out=new FileOutputStream(part)){byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1){if(Thread.currentThread().isInterrupted())throw new IOException("下载已取消。");total+=n;if(total>expected)throw new IOException("安装包大小校验失败。");digest.update(b,0,n);out.write(b,0,n);int percent=(int)(total*100/expected);if(percent!=shown){shown=percent;activity.runOnUiThread(()->{if(alive())progress.setProgress(percent);});}}}finally{c.disconnect();}
      if(total!=expected||!hex(digest.digest()).equals(m.getString("sha256")))throw new IOException("下载不完整或校验失败，请重新下载。");
      int flags=Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;
      PackageInfo downloaded=activity.getPackageManager().getPackageArchiveInfo(part.getAbsolutePath(),flags),installed=activity.getPackageManager().getPackageInfo(activity.getPackageName(),flags);
      if(downloaded==null||!activity.getPackageName().equals(downloaded.packageName)||code(downloaded)!=m.getLong("versionCode")||code(downloaded)<code(installed)||!certificates(downloaded).equals(certificates(installed)))throw new IOException("安装包身份、签名或版本校验失败。");
      File apk=new File(part.getParentFile(),"garden-update.apk");java.nio.file.Files.move(part.toPath(),apk.toPath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING);
      activity.runOnUiThread(()->{busy=false;if(alive()){progress.dismiss();install();}});
    }catch(Exception e){part.delete();activity.runOnUiThread(()->{if(alive())progress.dismiss();});error(e);}});
  }
  private String hex(byte[] bytes){StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return s.toString();}
  private Set<String> certificates(PackageInfo p)throws Exception{Set<String> result=new TreeSet<>();Signature[] signatures=Build.VERSION.SDK_INT>=28?p.signingInfo.getApkContentsSigners():p.signatures;for(Signature s:signatures)result.add(hex(MessageDigest.getInstance("SHA-256").digest(s.toByteArray())));if(result.isEmpty())throw new IOException("安装包签名缺失。");return result;}
  private void install(){
    try{if(!activity.getPackageManager().canRequestPackageInstalls()){
      new AlertDialog.Builder(activity).setTitle("允许安装更新").setMessage("首次更新需要在系统页面允许“来自此来源的应用”。开启后返回花园，会继续打开安装器。").setNegativeButton("稍后",null).setPositiveButton("打开系统设置",(d,w)->{try{awaitingPermission=true;activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.getPackageName())));}catch(Exception e){awaitingPermission=false;error(e);}}).show();return;
    }
    Uri uri=Uri.parse("content://"+activity.getPackageName()+".updates/package.apk");Intent intent=new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);intent.setClipData(ClipData.newRawUri("Lean Garden update",uri));activity.startActivity(intent);
    }catch(Exception e){error(e);}
  }
  void resume(){if(awaitingPermission){awaitingPermission=false;if(activity.getPackageManager().canRequestPackageInstalls())install();else Toast.makeText(activity,"未允许安装；可再次检查更新后重新安装。",Toast.LENGTH_LONG).show();}}
  void destroy(){worker.shutdownNow();}
}
