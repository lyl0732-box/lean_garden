package cn.leangarden.client;

import android.content.Context;import android.net.Uri;import android.webkit.WebResourceResponse;
import java.io.*;import java.net.*;import java.security.MessageDigest;import java.util.*;import org.json.*;

/** Immutable, hash-checked web resources. APIs always use the real origin. */
final class ResourceCache {
  interface Progress {void update(int ready,int total,int bundled,int cached,int downloaded);}
  private final Context context;private final File blobs;
  private volatile Map<String,Entry> active=Collections.emptyMap();
  private static final String CSP="default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
  private static final class Entry {
    String url,hash,mime;long bytes;boolean bundled;File file;
    InputStream open(Context c)throws IOException{return bundled?c.getAssets().open("blobs/"+hash):new FileInputStream(file);}
  }
  ResourceCache(Context c){context=c;blobs=new File(c.getFilesDir(),"resource-cache/blobs");}
  private static byte[] read(InputStream source,long limit)throws IOException{
    try(InputStream in=source;ByteArrayOutputStream out=new ByteArrayOutputStream()){
      byte[] buf=new byte[16384];int n;long size=0;
      while((n=in.read(buf))!=-1){size+=n;if(size>limit)throw new IOException("资源超出清单大小，已停止更新。");out.write(buf,0,n);}return out.toByteArray();
    }
  }
  private static String hash(InputStream in)throws Exception{
    try(InputStream input=in){MessageDigest digest=MessageDigest.getInstance("SHA-256");byte[] buf=new byte[32768];int n;while((n=input.read(buf))!=-1)digest.update(buf,0,n);StringBuilder out=new StringBuilder();for(byte b:digest.digest())out.append(String.format(Locale.ROOT,"%02x",b&255));return out.toString();}
  }
  private byte[] fetch(String url,long limit,int timeout)throws Exception{
    HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(timeout);c.setRequestProperty("Cache-Control","no-cache");
    try{if(c.getResponseCode()!=200)throw new IOException("暂时无法检查或下载更新，请确认服务器可访问。");return read(c.getInputStream(),limit);}finally{c.disconnect();}
  }
  void prepare(String origin,Progress progress)throws Exception{
    byte[] raw=fetch(origin+"/client-manifest.json",512*1024,15000);JSONObject manifest=new JSONObject(new String(raw,"UTF-8"));
    if(manifest.getInt("schema")!=1||manifest.getInt("nativeABI")!=1)throw new IOException("资源清单不兼容，请更新安装包。");
    JSONArray items=manifest.getJSONArray("assets");if(items.length()==0||items.length()>1000)throw new IOException("资源清单格式不正确。");
    List<Entry> entries=new ArrayList<>();Set<String> urls=new HashSet<>();long total=0;
    for(int i=0;i<items.length();i++){
      JSONObject item=items.getJSONObject(i);Entry e=new Entry();e.url=item.getString("url");e.hash=item.getString("sha256");e.mime=item.getString("mime");e.bytes=item.getLong("bytes");
      if(!e.url.matches("/[a-zA-Z0-9_./-]+")||Arrays.asList(e.url.split("/")).contains("..")||Arrays.asList(e.url.split("/")).contains(".")||!urls.add(e.url)||!e.hash.matches("[a-f0-9]{64}")||e.bytes<0||e.bytes>25*1048576||e.mime.indexOf('\r')>=0||e.mime.indexOf('\n')>=0)throw new IOException("资源清单校验失败。");
      total+=e.bytes;entries.add(e);
    }
    if(total>250*1048576||!urls.contains("/index.html")||!urls.contains("/boot.js"))throw new IOException("资源清单不完整或过大。");
    if(!blobs.isDirectory()&&!blobs.mkdirs())throw new IOException("无法创建更新目录。");
    Map<String,Entry> prepared=new HashMap<>();int bundled=0,cached=0,downloaded=0;
    for(Entry e:entries){
      boolean built=false;try{built=e.hash.equals(hash(context.getAssets().open("blobs/"+e.hash)));}catch(FileNotFoundException ignored){}
      File saved=new File(blobs,e.hash);
      if(built){e.bundled=true;bundled++;}
      else if(saved.isFile()&&saved.length()==e.bytes&&e.hash.equals(hash(new FileInputStream(saved)))){e.file=saved;cached++;}
      else{
        byte[] bytes=fetch(origin+e.url+"?v="+e.hash.substring(0,16),e.bytes,45000);
        if(bytes.length!=e.bytes||!e.hash.equals(hash(new ByteArrayInputStream(bytes))))throw new IOException("资源校验失败："+e.url);
        File tmp=new File(blobs,e.hash+"."+UUID.randomUUID()+".tmp");
        try{try(FileOutputStream out=new FileOutputStream(tmp)){out.write(bytes);out.getFD().sync();}if(!tmp.renameTo(saved))throw new IOException("更新写入失败。");}finally{if(tmp.exists())tmp.delete();}
        e.file=saved;downloaded++;
      }
      prepared.put(e.url,e);progress.update(prepared.size(),entries.size(),bundled,cached,downloaded);
    }
    active=Collections.unmodifiableMap(prepared);
  }
  WebResourceResponse intercept(Uri uri){
    String path=uri.getPath();Entry e=active.get("/".equals(path)?"/index.html":path);if(e==null)return null;
    String version=uri.getQueryParameter("v");if(version!=null&&!version.equals(e.hash.substring(0,16)))return null;
    try{
      Map<String,String> headers=new HashMap<>();headers.put("Content-Type",e.mime);headers.put("Content-Length",String.valueOf(e.bytes));headers.put("Cache-Control","no-store");headers.put("X-Garden-Asset-Source",e.bundled?"bundle":"update");headers.put("Content-Security-Policy",CSP);headers.put("X-Content-Type-Options","nosniff");
      String mime=e.mime.split(";")[0];return new WebResourceResponse(mime,mime.startsWith("text/")||mime.equals("application/json")?"UTF-8":null,200,"OK",headers,e.open(context));
    }catch(Exception ex){return new WebResourceResponse("text/plain","UTF-8",503,"Resource unavailable",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream("资源暂时不可用，请重新连接检查更新。".getBytes(java.nio.charset.StandardCharsets.UTF_8)));}
  }
}
