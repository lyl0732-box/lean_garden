import {readFile,writeFile,mkdir,copyFile,cp,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {buildClientAssets} from './build-client-assets.mjs';

const base=path.resolve('.'),stage=path.resolve('artifacts/taptap-android-'+Date.now()),web=path.join(stage,'web'),android=path.join(stage,'android'),out=path.resolve('dist/taptap');
const original=path.resolve('clients/android'),version='0.13.2',versionCode=21,sourceGradle=await readFile(path.join(original,'app/build.gradle'),'utf8');
const storeMode=process.argv.includes('--store'),checkStoreSDK=process.argv.includes('--check-store-sdk'),includeLicense=storeMode||checkStoreSDK;
let license=null;
if(storeMode){license=JSON.parse(await readFile('clients/taptap-android/license.json','utf8').catch(()=>{throw Error('正式买断包需要先开通 TapTap 正版验证，填写 clients/taptap-android/license.json 的 clientId/clientToken。当前请构建自测包。');}));if(!license.clientId?.trim()||!license.clientToken?.trim())throw Error('TapTap 正版验证配置尚未填写，拒绝生成正式买断包。');}
await mkdir(web,{recursive:true});await mkdir(out,{recursive:true});
const preload=JSON.parse(await readFile('public/assets/preload-manifest.json','utf8'));
for(const url of new Set(['/index.html','/assets/favicon.svg',...preload.common.map(a=>a.url),...preload.media.map(a=>a.url)])){
  const target=path.join(web,url);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(base,'public',url),target);
}
function replaceRequired(text,pattern,replacement,label){if(!pattern.test(text))throw Error('Source changed: '+label);pattern.lastIndex=0;return text.replace(pattern,replacement);}
let app=await readFile(path.join(web,'app.js'),'utf8');
app=replaceRequired(app,/const GAME_EDITION='ad-free';/,"const GAME_EDITION='taptap';",'TapTap edition');
app=replaceRequired(app,/'shop\/redeem'/,"'shop/purchase'",'diamond exchange compatibility');
const aiDisclosure=JSON.parse(await readFile('clients/taptap-minigame/ai-disclosure.json','utf8'));
app=replaceRequired(app,/<p class="settings-foot">/,`<section class="ai-disclosure-details" aria-label="AI 内容声明"><h3>${aiDisclosure.label}声明</h3><p>${aiDisclosure.full}</p></section><p class="settings-foot">`,'AI settings disclosure');
await writeFile(path.join(web,'app.js'),app);
let home=await readFile(path.join(web,'world-v11.js'),'utf8');
home=replaceRequired(home,/<footer class="home-footnote">[^<]*<\/footer>/,`<footer class="home-footnote"><span class="ai-content-notice" role="note"><b>${aiDisclosure.label}</b><span>${aiDisclosure.short}</span></span></footer>`,'AI home disclosure');
await writeFile(path.join(web,'world-v11.js'),home);
const disclosureCSS=`\n/* Visible declaration is shipped in the reviewed client assets. */\n.on-home .home-footnote{min-height:45px;display:flex;align-items:center;justify-content:center;padding:7px 10px max(9px,var(--client-safe-bottom,0px))!important}\n.ai-content-notice{display:inline-flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 9px;padding:6px 12px;border:1px solid #d8c385;border-radius:11px;background:#fff9e8f2;color:#405d3d;font-size:12px;line-height:1.5;text-shadow:none;letter-spacing:0}\n.ai-content-notice b{font-size:12px;color:#725a2f;white-space:nowrap}.ai-content-notice>span{font-size:12px}\n.ai-disclosure-details{border:1px solid #d5dcbf;border-radius:12px;background:#f6f7e8;padding:12px 15px;margin:16px 0}.ai-disclosure-details h3{font-size:15px;margin:0 0 7px}.ai-disclosure-details p{font-size:13px;line-height:1.8;margin:0;color:#4d6647}\n`;
await writeFile(path.join(web,'plan10.css'),(await readFile(path.join(web,'plan10.css'),'utf8'))+disclosureCSS);
let shop=await readFile(path.join(web,'shop.js'),'utf8');
shop=shop.slice(0,shop.indexOf('export function shopView'));
shop+=`export function shopView(e,shop,btn){
  const products=diamondProducts(shop);
  return '<section class="shop-room"><div class="shop-canopy"><h1>花园补给站</h1></div><header class="shop-hero"><div class="shop-keeper">'+evolvedMascot(e.growth.level)+'</div><div><h2>让每一次思考开花。</h2><p>这里的钻石来自花园问答，可兑换游戏补给。</p><p>TapTap 买断版自测 · 无广告、无现金内购。</p></div><div class="shop-wallet">'+gem()+'<b>'+resourceCount(e,'diamonds')+'</b></div></header><div class="inventory-strip"><span>提示 '+resourceCount(e,'hints')+'</span><span>答案 '+resourceCount(e,'answers')+'</span><span>活力券 '+resourceCount(e,'adSkips')+'</span></div><div class="shop-gifts"><article class="shop-gift"><h3>3 张活力券</h3>'+btn('claim-beta',e.betaClaimed?'已领取':'免费领取','primary',e.betaClaimed?'disabled':'')+'</article><article class="shop-gift"><h3>10 分钟选关体验</h3>'+btn('claim-trial',e.trialClaimed?'已领取':'免费领取','primary',e.trialClaimed?'disabled':'')+'</article></div><div class="shop-products">'+products.map(p=>'<article class="shop-product"><h3>'+esc(p.name)+'</h3><p>'+esc(p.description)+'</p><b>'+p.priceDiamonds+' 钻石</b>'+btn('buy-product','用钻石兑换','primary','data-product="'+p.id+'"')+'</article>').join('')+'</div></section>';
}\n`;
await writeFile(path.join(web,'shop.js'),shop);
if(storeMode)await writeFile(path.join(web,'shop.js'),shop.replace('TapTap 买断版自测','TapTap 买断版'));
await writeFile(path.join(web,'economy.js'),"export {evolution,evolvedMascot,growthView} from './yaya-forms.js';\nexport {energyPill,energyView} from './economy-v011.js';\nexport {shopView} from './shop.js';\n");
await writeFile(path.join(web,'update-check.js'),`export const GAME_VERSION='${version}';\nexport async function checkWebUpdate(status){status.textContent='TapTap 渠道版 · v${version}。请通过 TapTap 更新安装包。';}\n`);
for(const file of await readdir(web))if(file.endsWith('.js')&&/umeng|appwin|UMUnion|watchNativeReward|rewardAdOffer|reward-ad|watch-diamond-ad|广告尚未接入/i.test(await readFile(path.join(web,file),'utf8')))throw Error('Advertising residue: '+file);
const sanitized={...preload,revision:version,common:[]};
for(const asset of preload.common){const bytes=await readFile(path.join(web,asset.url));sanitized.common.push({...asset,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await mkdir(path.join(web,'assets'),{recursive:true});await writeFile(path.join(web,'assets/preload-manifest.json'),JSON.stringify(sanitized,null,2));
const {bundle,manifest}=await buildClientAssets({publicRoot:web,bundleDir:path.join(stage,'bundle')});
for(const name of ['settings.gradle','gradle.properties','gradle','gradlew.exe','local.properties','.signing'])await cp(path.join(original,name),path.join(android,name),{recursive:true});
await writeFile(path.join(android,'build.gradle'),`buildscript { repositories { maven { url 'https://maven.aliyun.com/repository/google' }; google(); mavenCentral() }; dependencies { classpath 'com.android.tools.build:gradle:8.10.1' } }\n`);
const javaDir=path.join(android,'app/src/main/java/cn/leangarden/client');await mkdir(javaDir,{recursive:true});
const res=path.join(android,'app/src/main/res/drawable');await mkdir(res,{recursive:true});await sharp('public/assets/favicon.svg').resize(192,192).png().toFile(path.join(res,'icon.png'));
await cp(bundle,path.join(android,'app/src/main/assets'),{recursive:true});await copyFile('public/assets/optimized/garden-world-high.webp',path.join(android,'app/src/main/assets/login-background.webp'));
let main=await readFile(path.join(original,'app/src/main/java/cn/leangarden/client/MainActivity.java'),'utf8');
main=replaceRequired(main,/private AppUpdates appUpdates;/,'private String version(){return "'+version+'";}','updater field');
main=replaceRequired(main,/appUpdates=new AppUpdates\(this\);/,'','updater initialization');
main=main.replaceAll('appUpdates.version()','version()');
main=main.replace('检查更新会下载完整 APK，并使用系统安装器更新。插图与音乐仍会在连接时自动同步。','TapTap 无广告渠道版。安装包请通过 TapTap 更新。');
main=replaceRequired(main,/check\.setOnClickListener\(v->\{try\{appUpdates\.check\([\s\S]*?\}\}\);/,`check.setText("版本信息");check.setOnClickListener(v->updateStatus.setText("TapTap 渠道版 v${version}，请通过 TapTap 更新。"));`,'native updater');
main=main.replace('LeanGardenAndroid/1','LeanGardenTapTap/1');
main=replaceRequired(main,/if\(request.isForMainFrame\(\)&&url.equals\("leangarden:\/\/update"\)\)\{if\(own\(view.getUrl\(\)\)\)appUpdates.check\(serverURL\);return true;\}/,'','native update deep link');
main=main.replace('if(appUpdates!=null)appUpdates.destroy();','');
main=main.replace('if(appUpdates!=null)appUpdates.resume();','');
if(includeLicense){main=replaceRequired(main,/enterImmersive\(\);frame\.post\(\(\)->enterImmersive\(\)\);showConnection\(""\);/,'enterImmersive();frame.post(()->enterImmersive());TapTapPurchaseGate.check(this,()->showConnection(""));','store purchase gate');await copyFile('clients/taptap-android/TapTapPurchaseGate.java',path.join(javaDir,'TapTapPurchaseGate.java'));if(storeMode)await writeFile(path.join(android,'app/src/main/assets/taptap-license.json'),JSON.stringify({clientId:license.clientId,clientToken:license.clientToken}));}
main=main.replaceAll('检查更新 ','准备资源 ').replace('本机服务和 Tailscale 已开启','网络与游戏服务可用');
if(/umeng|appwin|RewardAds|appUpdates|reward-ad/i.test(main))throw Error('Native SDK reference remains');
await writeFile(path.join(javaDir,'MainActivity.java'),main);await copyFile('clients/taptap-android/ResourceCache.java',path.join(javaDir,'ResourceCache.java'));
let manifestXML=await readFile(path.join(original,'app/src/main/AndroidManifest.xml'),'utf8');
manifestXML=manifestXML.replace(/\s*android:name="\.UmengApplication"/,'').replace(/^.*REQUEST_INSTALL_PACKAGES.*\r?\n/m,'').replace(/^.*<provider.*\r?\n/m,'').replace(/^.*ACCESS_WIFI_STATE.*\r?\n/m,'');
if(includeLicense)manifestXML=manifestXML.replace('</manifest>','<queries><package android:name="com.taptap"/><package android:name="com.taptap.pad"/><package android:name="com.taptap.global"/></queries></manifest>');
await writeFile(path.join(android,'app/src/main/AndroidManifest.xml'),manifestXML);
let gradle=sourceGradle.replace("apply plugin: 'com.efs.sdk.plugin'",'').replace(/versionCode\s+\d+/,`versionCode ${versionCode}`).replace(/versionName\s+'[^']+'/,`versionName '${version}'`).replace(/efs \{[\s\S]*?\r?\n\}/,'').replace(/dependencies \{[\s\S]*?\r?\n\}/,'dependencies {}');
if(includeLicense)gradle=gradle.replace('dependencies {}',"dependencies { implementation 'com.taptap.sdk:tap-core:4.11.0'; implementation 'com.taptap.sdk:tap-license:4.11.0' }");
await writeFile(path.join(android,'app/build.gradle'),gradle);await writeFile(path.join(android,'app/proguard-rules.pro'),'');
if(!checkStoreSDK)await writeFile(path.join(out,'android-preparation.json'),JSON.stringify({stage,web,android,version,versionCode,assets:manifest.assets.length},null,2));
if(process.argv.includes('--prepare-only')){console.log('Prepared TapTap release: '+stage);process.exit(0);}
const tools=JSON.parse(await readFile('artifacts/android-tools/tools.json','utf8')),config=JSON.parse(await readFile('artifacts/android-tools/gradle-env.json','utf8'));
const env={...process.env,JAVA_HOME:tools.jdk,ANDROID_HOME:config.sdk,ANDROID_SDK_ROOT:config.sdk,GRADLE_USER_HOME:config.gradleUserHome,PATH:path.join(tools.jdk,'bin')+path.delimiter+process.env.PATH};
async function run(file,args){await new Promise((resolve,reject)=>{const p=spawn(file,args,{cwd:android,env,windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('close',code=>code===0?resolve():reject(Error('Build exited '+code)));});}
await run(path.join(android,'gradlew.exe'),[checkStoreSDK?'compileReleaseJavaWithJavac':'assembleRelease','--no-daemon']);
if(checkStoreSDK){await writeFile('artifacts/taptap-license-sdk-check.json',JSON.stringify({ok:true,stage,sdk:'4.11.0',configured:false,runtimeTested:false},null,2));console.log('Store purchase gate compiled; no installable store package was exported.');process.exit(0);}
const apk=path.join(out,`LeanGarden-${version}-taptap.apk`);await copyFile(path.join(android,'app/build/outputs/apk/release/app-release.apk'),apk);
await run(path.join(tools.jdk,'bin/java.exe'),['-jar',path.join(tools.buildTools,'lib/apksigner.jar'),'verify','--verbose','--print-certs',apk]);
const bytes=await readFile(apk);await writeFile(path.join(out,'android-build-report.json'),JSON.stringify({version,versionCode,apk,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),package:'cn.leangarden.client',signed:true,mode:storeMode?'buyout-store':'buyout-self-test',copyrightVerificationConfigured:storeMode,sdkDependencies:storeMode?['com.taptap.sdk:tap-core:4.11.0','com.taptap.sdk:tap-license:4.11.0']:[],remoteAssetUpdates:false,realDeviceTested:false},null,2));
console.log('TapTap APK ready: '+apk+' ('+(await stat(apk)).size+' bytes)');
