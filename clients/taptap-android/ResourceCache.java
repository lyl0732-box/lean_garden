package cn.leangarden.client;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebResourceResponse;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import org.json.*;

/** Store releases always run their reviewed, signed assets. Only APIs use the network. */
final class ResourceCache {
  interface Progress {void update(int ready,int total,int bundled,int cached,int downloaded);}
  private final Context context;
  private volatile Map<String,JSONObject> active=Collections.emptyMap();
  ResourceCache(Context c){context=c;}
  void prepare(String origin,Progress progress)throws Exception {
    ByteArrayOutputStream bytes=new ByteArrayOutputStream();
    try(InputStream input=context.getAssets().open("manifest.json")){byte[] buf=new byte[16384];int n;while((n=input.read(buf))!=-1)bytes.write(buf,0,n);}
    JSONObject manifest=new JSONObject(bytes.toString("UTF-8"));
    if(manifest.getInt("schema")!=1)throw new IOException("安装包资源清单不兼容。");
    JSONArray items=manifest.getJSONArray("assets");Map<String,JSONObject> next=new HashMap<>();
    for(int i=0;i<items.length();i++){
      JSONObject item=items.getJSONObject(i);String hash=item.getString("sha256");
      if(!hash.matches("[a-f0-9]{64}"))throw new IOException("安装包资源校验失败。");
      MessageDigest digest=MessageDigest.getInstance("SHA-256");long count=0;
      try(InputStream input=context.getAssets().open("blobs/"+hash)){byte[] buf=new byte[32768];int n;while((n=input.read(buf))!=-1){digest.update(buf,0,n);count+=n;}}
      StringBuilder actual=new StringBuilder();for(byte b:digest.digest())actual.append(String.format(Locale.ROOT,"%02x",b&255));
      if(count!=item.getLong("bytes")||!hash.equals(actual.toString()))throw new IOException("安装包资源不完整，请重新安装。");
      next.put(item.getString("url"),item);progress.update(i+1,items.length(),i+1,0,0);
    }
    active=Collections.unmodifiableMap(next);
  }
  WebResourceResponse intercept(Uri uri){
    String path=uri.getPath();if(path.startsWith("/api/"))return null;
    JSONObject item=active.get("/".equals(path)?"/index.html":path);
    try{
      if(item==null)return new WebResourceResponse("text/plain","UTF-8",404,"Not bundled",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream(new byte[0]));
      String type=item.getString("mime"),mime=type.split(";")[0];
      Map<String,String> headers=new HashMap<>();headers.put("Content-Type",type);headers.put("Cache-Control","no-store");headers.put("X-Garden-Asset-Source","bundle");headers.put("X-Content-Type-Options","nosniff");
      headers.put("Content-Security-Policy","default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
      return new WebResourceResponse(mime,mime.startsWith("text/")||mime.equals("application/json")?"UTF-8":null,200,"OK",headers,context.getAssets().open("blobs/"+item.getString("sha256")));
    }catch(Exception ex){return new WebResourceResponse("text/plain","UTF-8",503,"Unavailable",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
  }
}
