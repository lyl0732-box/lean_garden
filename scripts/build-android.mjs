import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';import {createHash} from 'node:crypto';import sharp from 'sharp';
import {buildClientAssets} from './build-client-assets.mjs';
import {createWriteStream} from 'node:fs';import {createInterface} from 'node:readline';
const root=path.resolve('clients/android'),out=path.resolve('dist/android'),assets=path.join(root,'app/src/main/assets');
await buildClientAssets({bundleDir:assets});
await mkdir(out,{recursive:true});
await copyFile('public/assets/optimized/garden-world-low.webp',path.join(assets,'login-background.webp'));
await sharp('public/assets/favicon.svg').resize(192,192).png().toFile(path.join(root,'app/src/main/res/drawable/icon.png'));
if(!process.argv.includes('--prepare-only')){
  const tools=JSON.parse(await readFile('artifacts/android-tools/tools.json','utf8')),config=JSON.parse(await readFile('artifacts/android-tools/gradle-env.json','utf8')),env={...process.env,JAVA_HOME:tools.jdk,ANDROID_HOME:config.sdk,ANDROID_SDK_ROOT:config.sdk,GRADLE_USER_HOME:config.gradleUserHome,PATH:path.join(tools.jdk,'bin')+path.delimiter+process.env.PATH};
  const buildLog=path.resolve('artifacts/android-last-build.log');await writeFile(buildLog,'');
  async function run(file,args,cwd=root){await new Promise((resolve,reject)=>{
    const log=createWriteStream(buildLog,{flags:'a'}),seen=new Set(),p=spawn(file,args,{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});let repeats=0;
    for(const stream of [p.stdout,p.stderr])createInterface({input:stream}).on('line',line=>{log.write(line+'\n');if(!seen.has(line)){seen.add(line);console.log(line);}else repeats++;});
    p.on('error',error=>{log.end();reject(error);});p.on('close',code=>{log.end();if(repeats)console.log('Repeated build messages:',repeats,'(full log: artifacts/android-last-build.log)');code===0?resolve():reject(Error(file+' exited '+code));});
  });}
  await run(path.join(root,'gradlew.exe'),['assembleRelease','--write-locks','--no-daemon']);
  const gradle=await readFile(path.join(root,'app/build.gradle'),'utf8'),version=/versionName\s+['"]([^'"]+)/.exec(gradle)?.[1];if(!version)throw Error('Android versionName is missing.');
  const apk=path.join(out,'LeanGarden-'+version+'-local.apk');await copyFile(path.join(root,'app/build/outputs/apk/release/app-release.apk'),apk);
  await run(path.join(tools.jdk,'bin/java.exe'),['-jar',path.join(tools.buildTools,'lib/apksigner.jar'),'verify','--verbose','--print-certs',apk]);
  const bytes=await readFile(apk);await writeFile(path.join(out,'build-report.json'),JSON.stringify({date:new Date().toISOString(),file:path.basename(apk),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),minAndroid:8,targetAPI:36,signature:'existing local test identity; not a store release identity',runtimeDeviceTested:false},null,2));console.log('APK ready:',apk,bytes.length,'bytes');
  await mkdir('public/downloads',{recursive:true});await copyFile(apk,path.join('public/downloads',path.basename(apk)));
  const release={schema:1,package:'cn.leangarden.client',versionName:version,versionCode:Number(/versionCode\s+(\d+)/.exec(gradle)[1]),url:'/downloads/'+path.basename(apk),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),notes:'无广告、无内购。活跃度、钻石、提示包、答案包和自由选关时长均为无限。'};
  await writeFile('public/android-release.json',JSON.stringify(release,null,2));
}
