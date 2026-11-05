package cn.leangarden.client;

import android.app.*;import android.os.*;import android.content.*;import android.content.pm.PackageManager;import android.graphics.Color;import android.net.Uri;import android.view.*;import android.webkit.*;import android.widget.*;import java.net.URI;

public final class MainActivity extends Activity {
  private final String defaultURL="https://162.14.77.140/";
  private FrameLayout frame;private LinearLayout layout;private WebView web;
  private String serverURL,quality="high";private View fullView;private WebChromeClient.CustomViewCallback fullCallback;private String[] pendingDownload;
  private ScrollView connectionScroll;private int safeLeft,safeTop,safeRight,safeBottom,keyboardBottom;
  private boolean returningToConnection=false;
  private RewardAds rewardAds;private AppUpdates appUpdates;
  private ResourceCache resources;private final java.util.concurrent.ExecutorService updates=java.util.concurrent.Executors.newSingleThreadExecutor();
  private int dp(int n){return (int)(n*getResources().getDisplayMetrics().density+.5f);}
  private TextView text(String value,int size){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(Color.rgb(75,102,65));t.setGravity(Gravity.CENTER);t.setPadding(dp(10),dp(9),dp(10),dp(9));return t;}
  private Button button(String label){Button b=new Button(this);b.setText(label);b.setAllCaps(false);b.setTextColor(Color.rgb(65,95,52));return b;}
  private String validQuality(String value){return "low".equals(value)?"low":"high";}
  private android.graphics.drawable.GradientDrawable paper(int color,int border,int radius){android.graphics.drawable.GradientDrawable d=new android.graphics.drawable.GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));d.setStroke(dp(1),border);return d;}
  private javax.crypto.SecretKey credentialKey()throws Exception{java.security.KeyStore store=java.security.KeyStore.getInstance("AndroidKeyStore");store.load(null);if(!store.containsAlias("garden-login")){javax.crypto.KeyGenerator g=javax.crypto.KeyGenerator.getInstance("AES","AndroidKeyStore");g.init(new android.security.keystore.KeyGenParameterSpec.Builder("garden-login",android.security.keystore.KeyProperties.PURPOSE_ENCRYPT|android.security.keystore.KeyProperties.PURPOSE_DECRYPT).setBlockModes("GCM").setEncryptionPaddings("NoPadding").build());g.generateKey();}return (javax.crypto.SecretKey)store.getKey("garden-login",null);}
  private void savePassword(String target,String name,String password,boolean remember)throws Exception{
    android.content.SharedPreferences.Editor edit=getPreferences(0).edit();
    if(!remember){edit.remove("password_cipher").remove("remember_server").remove("remember_name").apply();return;}
    javax.crypto.Cipher c=javax.crypto.Cipher.getInstance("AES/GCM/NoPadding");c.init(javax.crypto.Cipher.ENCRYPT_MODE,credentialKey());c.updateAAD((target+"\n"+name).getBytes(java.nio.charset.StandardCharsets.UTF_8));byte[] body=c.doFinal(password.getBytes(java.nio.charset.StandardCharsets.UTF_8)),all=new byte[c.getIV().length+body.length];System.arraycopy(c.getIV(),0,all,0,c.getIV().length);System.arraycopy(body,0,all,c.getIV().length,body.length);
    edit.putString("password_cipher",android.util.Base64.encodeToString(all,android.util.Base64.NO_WRAP)).putString("remember_server",target).putString("remember_name",name).apply();
  }
  private String readPassword(String target,String name){try{if(!target.equals(getPreferences(0).getString("remember_server",""))||!name.equals(getPreferences(0).getString("remember_name","")))return "";byte[] all=android.util.Base64.decode(getPreferences(0).getString("password_cipher",""),android.util.Base64.NO_WRAP);if(all.length<29)return "";javax.crypto.Cipher c=javax.crypto.Cipher.getInstance("AES/GCM/NoPadding");c.init(javax.crypto.Cipher.DECRYPT_MODE,credentialKey(),new javax.crypto.spec.GCMParameterSpec(128,java.util.Arrays.copyOfRange(all,0,12)));c.updateAAD((target+"\n"+name).getBytes(java.nio.charset.StandardCharsets.UTF_8));return new String(c.doFinal(java.util.Arrays.copyOfRange(all,12,all.length)),java.nio.charset.StandardCharsets.UTF_8);}catch(Exception e){getPreferences(0).edit().remove("password_cipher").apply();return "";}}

  @Override public void onCreate(Bundle state){
    super.onCreate(state);resources=new ResourceCache(this);rewardAds=new RewardAds(this);appUpdates=new AppUpdates(this);serverURL=getPreferences(0).getString("server",defaultURL).replaceAll("/+$","");quality=validQuality(getPreferences(0).getString("quality","high"));
    Window window=getWindow();window.setStatusBarColor(Color.TRANSPARENT);window.setNavigationBarColor(Color.TRANSPARENT);
    if(Build.VERSION.SDK_INT>=28){WindowManager.LayoutParams params=window.getAttributes();params.layoutInDisplayCutoutMode=Build.VERSION.SDK_INT>=30?WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS:WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;window.setAttributes(params);}
    if(Build.VERSION.SDK_INT>=29){window.setStatusBarContrastEnforced(false);window.setNavigationBarContrastEnforced(false);}
    frame=new FrameLayout(this);frame.setBackgroundColor(Color.rgb(237,243,223));frame.setFitsSystemWindows(false);setContentView(frame);
    if(Build.VERSION.SDK_INT>=30){
      getWindow().setDecorFitsSystemWindows(false);
      frame.setOnApplyWindowInsetsListener((view,insets)->{android.graphics.Insets safe=insets.getInsets(WindowInsets.Type.displayCutout()),keyboard=insets.getInsets(WindowInsets.Type.ime());safeLeft=safe.left;safeTop=safe.top;safeRight=safe.right;safeBottom=safe.bottom;keyboardBottom=keyboard.bottom;applyContentInsets();return insets;});
    }else if(Build.VERSION.SDK_INT>=28){
      frame.setOnApplyWindowInsetsListener((view,insets)->{DisplayCutout safe=insets.getDisplayCutout();safeLeft=safe==null?0:safe.getSafeInsetLeft();safeTop=safe==null?0:safe.getSafeInsetTop();safeRight=safe==null?0:safe.getSafeInsetRight();safeBottom=safe==null?0:safe.getSafeInsetBottom();applyContentInsets();return insets;});
    }
    enterImmersive();frame.post(()->enterImmersive());showConnection("");
  }
  private void applyContentInsets(){
    // The WebView paints the whole display, including the cutout band.
    frame.setPadding(0,0,0,web==null?0:keyboardBottom);
    if(connectionScroll!=null)connectionScroll.setPadding(safeLeft,safeTop,safeRight,Math.max(safeBottom,keyboardBottom));
    updateWebInsets();
  }
  private void updateWebInsets(){
    if(web==null||!own(web.getUrl()))return;
    web.evaluateJavascript("(function(){var s=document.documentElement.style,d=window.devicePixelRatio||1;document.documentElement.classList.add('android-client');s.setProperty('--native-safe-top',("+safeTop+"/d)+'px');s.setProperty('--native-safe-left',("+safeLeft+"/d)+'px');s.setProperty('--native-safe-right',("+safeRight+"/d)+'px');s.setProperty('--native-safe-bottom',("+safeBottom+"/d)+'px');})()",null);
  }
  private void enterImmersive(){
    if(Build.VERSION.SDK_INT>=30){WindowInsetsController c=getWindow().getInsetsController();if(c!=null){c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);c.hide(WindowInsets.Type.systemBars());}}
    else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
  }
  @Override public void onWindowFocusChanged(boolean focused){super.onWindowFocusChanged(focused);if(focused)enterImmersive();}
  private String normalize(String raw)throws Exception{URI u=new URI(raw.trim());if(!("http".equals(u.getScheme())||"https".equals(u.getScheme()))||u.getHost()==null||u.getUserInfo()!=null||u.getQuery()!=null||u.getFragment()!=null||!(u.getPath().isEmpty()||"/".equals(u.getPath())))throw new Exception("请填写完整的 http:// 或 https:// 服务器地址。");return u.getScheme()+"://"+u.getRawAuthority();}
  private int port(URI u){return u.getPort()>=0?u.getPort():"https".equals(u.getScheme())?443:80;}
  private boolean own(String url){try{URI a=new URI(serverURL),b=new URI(url);return a.getScheme().equals(b.getScheme())&&a.getHost().equals(b.getHost())&&port(a)==port(b);}catch(Exception e){return false;}}
  private void captureQuality(Runnable after){
    final WebView source=web;if(source==null||!own(source.getUrl())){after.run();return;}
    final boolean[] finished={false};final Handler handler=new Handler(Looper.getMainLooper());
    final Runnable finish=()->{if(!finished[0]){finished[0]=true;if(!isFinishing()&&!isDestroyed())after.run();}};
    handler.postDelayed(finish,1000);
    source.evaluateJavascript("(function(){try{return localStorage.getItem('garden-asset-quality')}catch(e){return null}})()",value->{
      if(!finished[0]&&source==web){try{Object decoded=new org.json.JSONTokener(value).nextValue();if(decoded instanceof String){quality=validQuality((String)decoded);getPreferences(0).edit().putString("quality",quality).apply();}}catch(Exception ignored){}}
      handler.removeCallbacks(finish);finish.run();
    });
  }
  private void showConnection(String message){if(returningToConnection)return;returningToConnection=true;captureQuality(()->{returningToConnection=false;showConnectionNow(message);});}
  private org.json.JSONObject authRequest(String target,String mode,String name,String password,String hint)throws Exception{
    java.net.HttpURLConnection c=(java.net.HttpURLConnection)new java.net.URL(target+"/api/auth/"+mode).openConnection();c.setConnectTimeout(15000);c.setReadTimeout(20000);c.setInstanceFollowRedirects(false);c.setRequestMethod("POST");c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("Origin",target);
    String cookies=CookieManager.getInstance().getCookie(target);if(cookies!=null)c.setRequestProperty("Cookie",cookies);
    c.setDoOutput(true);org.json.JSONObject body=new org.json.JSONObject();body.put("username",name);body.put("password",password);body.put("recoveryHint",hint);body.put("adoptLegacy",true);
    try{try(java.io.OutputStream output=c.getOutputStream()){output.write(body.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));}
      int code=c.getResponseCode();java.io.InputStream stream=code<400?c.getInputStream():c.getErrorStream();if(stream==null)throw new Exception("暂时无法登录，请检查服务器地址。");
      java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();try(java.io.InputStream input=stream){byte[] buffer=new byte[4096];int n;while((n=input.read(buffer))!=-1){if(bytes.size()+n>1048576)throw new Exception("服务器响应过大。");bytes.write(buffer,0,n);}}
      org.json.JSONObject result=new org.json.JSONObject(new String(bytes.toByteArray(),java.nio.charset.StandardCharsets.UTF_8));if(code>=400)throw new Exception(result.optString("error","登录失败，请稍后重试。"));
      for(java.util.Map.Entry<String,java.util.List<String>> entry:c.getHeaderFields().entrySet())if("Set-Cookie".equalsIgnoreCase(entry.getKey()))for(String value:entry.getValue())CookieManager.getInstance().setCookie(target,value);
      CookieManager.getInstance().flush();return result;
    }finally{c.disconnect();}
  }
  private void showConnectionNow(String message){
    if(fullView!=null&&web!=null)web.getWebChromeClient().onHideCustomView();
    if(web!=null){web.onPause();web.stopLoading();web.destroy();web=null;}
    frame.removeAllViews();ImageView backdrop=new ImageView(this);backdrop.setScaleType(ImageView.ScaleType.CENTER_CROP);try(java.io.InputStream input=getAssets().open("login-background.webp")){backdrop.setImageDrawable(android.graphics.drawable.Drawable.createFromStream(input,null));}catch(Exception ignored){}frame.addView(backdrop,new FrameLayout.LayoutParams(-1,-1));
    View tint=new View(this);tint.setBackgroundColor(0x37406135);frame.addView(tint,new FrameLayout.LayoutParams(-1,-1));
    LinearLayout panel=new LinearLayout(this);panel.setOrientation(LinearLayout.VERTICAL);panel.setGravity(Gravity.CENTER);panel.setPadding(dp(22),dp(20),dp(22),dp(20));panel.setBackground(paper(0xF4FFFBEA,0xFFD4D8AF,24));panel.setElevation(dp(8));
    LinearLayout outer=new LinearLayout(this);outer.setOrientation(LinearLayout.VERTICAL);outer.setGravity(Gravity.CENTER);outer.setPadding(dp(19),dp(22),dp(19),dp(22));outer.addView(panel,new LinearLayout.LayoutParams(-1,-2));
    connectionScroll=new ScrollView(this);connectionScroll.setVerticalScrollBarEnabled(false);connectionScroll.setFillViewport(true);connectionScroll.addView(outer);frame.addView(connectionScroll);applyContentInsets();
    LinearLayout tools=new LinearLayout(this);tools.setGravity(Gravity.RIGHT);Button check=button("检查更新"),exit=button("退出");check.setTextSize(11);exit.setTextSize(11);tools.addView(check,new LinearLayout.LayoutParams(0,dp(42),1));tools.addView(exit,new LinearLayout.LayoutParams(0,dp(42),1));panel.addView(tools,new LinearLayout.LayoutParams(-1,-2));exit.setOnClickListener(v->finishAndRemoveTask());
    panel.addView(text("❧  证明花园",30));panel.addView(text("安装版本 v"+appUpdates.version(),12));panel.addView(text("一张小卡，打开整个数学世界。",14));
    final Switch register=new Switch(this);register.setText("注册新账号");panel.addView(register);
    panel.addView(text("花园地址",12));
    final EditText address=new EditText(this);address.setSingleLine(true);address.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);address.setText(serverURL+"/");address.setTextSize(15);panel.addView(address,new LinearLayout.LayoutParams(-1,dp(58)));
    final TextView nameLabel=text("用户名 · 0 / 30 字节",12);panel.addView(nameLabel);
    final EditText username=new EditText(this);username.setSingleLine(true);username.setTextSize(15);username.setHint("用户名");username.setText(getPreferences(0).getString("username",""));panel.addView(username,new LinearLayout.LayoutParams(-1,dp(52)));
    final EditText password=new EditText(this);password.setSingleLine(true);password.setTextSize(15);password.setHint("密码 · 至少 6 个字符");password.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);panel.addView(password,new LinearLayout.LayoutParams(-1,dp(52)));
    final CheckBox remember=new CheckBox(this);remember.setText("记住密码 · 仅在本机加密保存");remember.setTextSize(12);remember.setTextColor(Color.rgb(75,102,65));String recalled=readPassword(serverURL,username.getText().toString());password.setText(recalled);remember.setChecked(!recalled.isEmpty());panel.addView(remember,new LinearLayout.LayoutParams(-1,dp(42)));remember.setOnCheckedChangeListener((button,checked)->{if(!checked)try{savePassword("","","",false);}catch(Exception ignored){}});
    final EditText hint=new EditText(this);hint.setSingleLine(true);hint.setTextSize(14);hint.setHint("密码提示词（可选，请勿直接填写密码）");hint.setVisibility(View.GONE);panel.addView(hint,new LinearLayout.LayoutParams(-1,dp(52)));
    username.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int start,int count,int after){}public void onTextChanged(CharSequence s,int start,int before,int count){int n=java.text.Normalizer.normalize(s.toString().trim(),java.text.Normalizer.Form.NFC).getBytes(java.nio.charset.StandardCharsets.UTF_8).length;nameLabel.setText("用户名 · "+n+" / 30 字节");nameLabel.setTextColor(n>30?Color.rgb(180,75,65):Color.rgb(75,102,65));}public void afterTextChanged(android.text.Editable e){}});
    nameLabel.setText("用户名 · "+username.getText().toString().getBytes(java.nio.charset.StandardCharsets.UTF_8).length+" / 30 字节");
    panel.addView(text("画面清晰度",14));final Spinner qualitySelect=new Spinner(this);
    ArrayAdapter<String> choices=new ArrayAdapter<>(this,android.R.layout.simple_spinner_item,new String[]{"清晰画面（最高）","流畅省流"});choices.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);qualitySelect.setAdapter(choices);qualitySelect.setContentDescription("画面清晰度");qualitySelect.setSelection("low".equals(quality)?1:0);panel.addView(qualitySelect,new LinearLayout.LayoutParams(-1,dp(52)));
    Button connect=button("登录 · 进入花园 →");connect.setTextColor(0xFFFFF6D9);connect.setBackground(paper(0xFF698B50,0xFF557342,14));panel.addView(connect,new LinearLayout.LayoutParams(-1,dp(56)));Button forgot=button("忘记密码？看看提示词");forgot.setTextSize(12);panel.addView(forgot,new LinearLayout.LayoutParams(-1,dp(44)));panel.addView(text(message,13));panel.addView(text("账号和冒险跟随当前花园服务器。\n记住密码可免去重复输入，取消勾选即清除。",11));
    for(EditText field:new EditText[]{address,username,password,hint}){field.setTextColor(0xFF4D6945);field.setHintTextColor(0xFF96A58B);field.setPadding(dp(12),0,dp(12),0);field.setBackground(paper(0xFFF8FAEF,0xFFC2D0AA,12));LinearLayout.LayoutParams params=(LinearLayout.LayoutParams)field.getLayoutParams();params.bottomMargin=dp(8);field.setLayoutParams(params);}
    register.setOnCheckedChangeListener((button,checked)->{hint.setVisibility(checked?View.VISIBLE:View.GONE);remember.setVisibility(checked?View.GONE:View.VISIBLE);password.setText("");remember.setChecked(false);connect.setText(checked?"注册 · 进入花园 →":"登录 · 进入花园 →");});
    final TextView updateStatus=text("检查更新会下载完整 APK，并使用系统安装器更新。插图与音乐仍会在连接时自动同步。",12);panel.addView(updateStatus);
    check.setOnClickListener(v->{try{appUpdates.check(normalize(address.getText().toString()));}catch(Exception e){updateStatus.setText(e.getMessage());}});
    android.text.TextWatcher clearRecalled=new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int start,int count,int after){}public void afterTextChanged(android.text.Editable e){}public void onTextChanged(CharSequence s,int start,int before,int count){if(!address.getText().toString().equals(getPreferences(0).getString("remember_server",""))||!username.getText().toString().equals(getPreferences(0).getString("remember_name",""))){password.setText("");}}};address.addTextChangedListener(clearRecalled);username.addTextChangedListener(clearRecalled);
    forgot.setOnClickListener(v->{try{final String target=normalize(address.getText().toString()),name=username.getText().toString();forgot.setEnabled(false);updateStatus.setText("正在寻找线索…");updates.execute(()->{try{String clue=authRequest(target,"hint",name,"","").optString("hint");runOnUiThread(()->{if(isFinishing()||isDestroyed())return;updateStatus.setText(clue);forgot.setEnabled(true);});}catch(Exception e){runOnUiThread(()->{if(isFinishing()||isDestroyed())return;updateStatus.setText(e.getMessage());forgot.setEnabled(true);});}});}catch(Exception e){updateStatus.setText(e.getMessage());}});
    connect.setOnClickListener(v->{try{
      final String target=normalize(address.getText().toString()),name=java.text.Normalizer.normalize(username.getText().toString().trim(),java.text.Normalizer.Form.NFC),secret=password.getText().toString(),clue=hint.getText().toString(),mode=register.isChecked()?"register":"login";
      if(name.isEmpty()||name.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>30)throw new Exception("用户名须为 1–30 字节，一个汉字通常占 3 字节。");if(secret.codePointCount(0,secret.length())<6)throw new Exception("密码至少需要 6 个字符。");
      final String chosenQuality=new String[]{"high","low"}[qualitySelect.getSelectedItemPosition()];final boolean rememberChosen=remember.isChecked();for(View control:new View[]{connect,forgot,check,address,qualitySelect,register,username,password,hint,remember})control.setEnabled(false);updateStatus.setText("正在验证账号…");
      updates.execute(()->{try{
        authRequest(target,mode,name,secret,clue);
        savePassword(target,name,secret,rememberChosen);
        resources.prepare(target,(ready,total,built,cached,downloaded)->runOnUiThread(()->{if(!isFinishing()&&!isDestroyed())updateStatus.setText("检查更新 "+ready+"/"+total+" · 内置 "+built+" · 已缓存 "+cached+" · 新下载 "+downloaded);}));
        runOnUiThread(()->{if(isFinishing()||isDestroyed())return;serverURL=target;quality=chosenQuality;getPreferences(0).edit().putString("server",serverURL).putString("quality",quality).putString("username",name).apply();password.setText("");openGame();});
      }catch(Exception e){runOnUiThread(()->{if(isFinishing()||isDestroyed())return;for(View control:new View[]{connect,forgot,check,address,qualitySelect,register,username,password,hint,remember})control.setEnabled(true);updateStatus.setText(e.getMessage());});}});
    }catch(Exception e){Toast.makeText(MainActivity.this,e.getMessage(),Toast.LENGTH_LONG).show();}});
    enterImmersive();
  }
  @android.annotation.SuppressLint("SetJavaScriptEnabled") private void openGame(){
    connectionScroll=null;frame.removeAllViews();layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setFitsSystemWindows(false);web=new WebView(this);web.setFitsSystemWindows(false);layout.addView(web,new LinearLayout.LayoutParams(-1,-1));frame.addView(layout);
    web.setBackgroundColor(Color.rgb(237,243,223));WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setMediaPlaybackRequiresUserGesture(true);s.setUserAgentString(s.getUserAgentString()+" LeanGarden/"+appUpdates.version()+" LeanGardenAndroid/1");CookieManager.getInstance().setAcceptCookie(true);
    web.setWebViewClient(new WebViewClient(){
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return "GET".equals(request.getMethod())&&own(request.getUrl().toString())?resources.intercept(request.getUrl()):null;}
      @Override public void onPageCommitVisible(WebView view,String url){updateWebInsets();}
      @Override public void onPageFinished(WebView view,String url){updateWebInsets();}
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){String url=request.getUrl().toString();if(request.isForMainFrame()&&"leangarden".equals(request.getUrl().getScheme())&&"reward-ad".equals(request.getUrl().getHost())){if(own(view.getUrl()))playRewardAd(view,request.getUrl());return true;}if(request.isForMainFrame()&&url.equals("leangarden://update")){if(own(view.getUrl()))appUpdates.check(serverURL);return true;}if(request.isForMainFrame()&&url.equals("leangarden://exit")){finishAndRemoveTask();return true;}if(request.isForMainFrame()&&url.equals("leangarden://connection")){showConnection("");return true;}if(own(url))return false;if(request.isForMainFrame()&&(url.startsWith("https://")||url.startsWith("http://")))try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}catch(Exception ignored){}return true;}
      @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())showConnection("暂时无法连接花园，请确认本机服务和 Tailscale 已开启。");}
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public void onShowCustomView(View view,CustomViewCallback callback){if(fullView!=null){callback.onCustomViewHidden();return;}fullView=view;fullCallback=callback;layout.setVisibility(View.GONE);frame.addView(view,new FrameLayout.LayoutParams(-1,-1));enterImmersive();}
      @Override public void onHideCustomView(){if(fullView!=null){frame.removeView(fullView);fullView=null;layout.setVisibility(View.VISIBLE);fullCallback.onCustomViewHidden();fullCallback=null;enterImmersive();}}
    });
    web.setDownloadListener((url,agent,disposition,mime,length)->{if(!own(url))return;pendingDownload=new String[]{url,agent,disposition,mime};if(Build.VERSION.SDK_INT<29&&checkSelfPermission("android.permission.WRITE_EXTERNAL_STORAGE")!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{"android.permission.WRITE_EXTERNAL_STORAGE"},10);else saveDownload();});
    web.loadUrl(Uri.parse(serverURL).buildUpon().appendQueryParameter("garden-quality",quality).build().toString());applyContentInsets();enterImmersive();
  }
  private void playRewardAd(final WebView source,Uri uri){
    final String request=uri.getQueryParameter("request"),session=uri.getQueryParameter("session");
    if(request==null||session==null||!request.matches("[a-zA-Z0-9-]{20,80}")||!session.matches("[a-zA-Z0-9-]{20,80}"))return;
    rewardAds.show(session,(status,message)->runOnUiThread(()->{
      if(source!=web||isFinishing()||isDestroyed()||!own(source.getUrl()))return;
      try{org.json.JSONObject result=new org.json.JSONObject();result.put("request",request);result.put("status",status);result.put("message",message);source.evaluateJavascript("window.dispatchEvent(new CustomEvent('garden:reward-ad-result',{detail:"+result.toString()+"}))",null);}catch(org.json.JSONException ignored){}
      enterImmersive();
    }));
  }
  private void saveDownload(){if(pendingDownload==null)return;String[] item=pendingDownload;pendingDownload=null;try{DownloadManager.Request r=new DownloadManager.Request(Uri.parse(item[0]));String cookie=CookieManager.getInstance().getCookie(item[0]);if(cookie!=null)r.addRequestHeader("Cookie",cookie);r.addRequestHeader("User-Agent",item[1]);r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,URLUtil.guessFileName(item[0],item[2],item[3]));((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(r);Toast.makeText(this,"正在保存到下载目录。",Toast.LENGTH_SHORT).show();}catch(Exception e){Toast.makeText(this,"暂时未能保存，请在浏览器中导出。",Toast.LENGTH_LONG).show();}}
  @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(code==10&&results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED)saveDownload();}
  @Override public void onBackPressed(){if(fullView!=null){web.getWebChromeClient().onHideCustomView();}else if(web!=null&&web.canGoBack())web.goBack();else if(web!=null)showConnection("");else super.onBackPressed();}
  @Override public void onPause(){if(web!=null){captureQuality(()->{});web.onPause();}CookieManager.getInstance().flush();super.onPause();}
  @Override public void onResume(){super.onResume();if(appUpdates!=null)appUpdates.resume();if(web!=null)web.onResume();enterImmersive();}
  @Override public void onDestroy(){updates.shutdownNow();if(appUpdates!=null)appUpdates.destroy();if(rewardAds!=null)rewardAds.destroy();if(web!=null)web.destroy();super.onDestroy();}
}
