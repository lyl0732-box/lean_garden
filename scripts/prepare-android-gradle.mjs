import {readFile,writeFile,mkdir,cp,symlink,stat,copyFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve('.'),android=path.join(root,'clients/android'),tools=JSON.parse(await readFile('artifacts/android-tools/tools.json','utf8')),sdk=path.join(root,'artifacts/android-sdk'),bin=path.join(root,'artifacts/android-tools/bin');
for(const p of [path.join(sdk,'platforms'),path.join(sdk,'build-tools'),bin])await mkdir(p,{recursive:true});
for(const [source,target]of [[path.dirname(tools.androidJar),path.join(sdk,'platforms/android-36')],[tools.buildTools,path.join(sdk,'build-tools/36.0.0')],['D:/platform-tools',path.join(sdk,'platform-tools')]]){
  await stat(source);if(!await stat(target).catch(()=>null))await symlink(path.resolve(source),target,process.platform==='win32'?'junction':'dir');
}
await writeFile(path.join(android,'local.properties'),'sdk.dir='+sdk.replaceAll('\\','/')+'\n');
const env={...process.env,JAVA_HOME:tools.jdk,ANDROID_HOME:sdk,ANDROID_SDK_ROOT:sdk,GARDEN_PYTHON_EXE:'C:/Python314/python.exe',PYTHONUTF8:'1',PATH:[bin,path.join(tools.jdk,'bin'),path.join(process.env.LOCALAPPDATA,'umeng-cli/bin'),process.env.PATH].join(path.delimiter)};
async function run(file,args,cwd=root){await new Promise((resolve,reject)=>{const p=spawn(file,args,{cwd,env,windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('close',code=>code===0?resolve():reject(Error(file+' exited '+code)));});}
const bootstrap=path.join(root,'artifacts/gradle-wrapper-bootstrap');await mkdir(bootstrap,{recursive:true});await writeFile(path.join(bootstrap,'settings.gradle'),"rootProject.name = 'GradleWrapperBootstrap'\n");
const checksum=(await readFile('artifacts/android-tools/gradle-8.11.1-bin.zip.sha256','utf8')).trim();
await run(path.join(tools.jdk,'bin/java.exe'),['-Dorg.gradle.appname=gradle','-classpath',path.join(root,'artifacts/android-tools/gradle-8.11.1/lib/gradle-gradle-cli-main-8.11.1.jar'),'org.gradle.launcher.GradleMain','wrapper','--gradle-version','8.11.1','--distribution-type','bin','--gradle-distribution-sha256-sum',checksum,'--no-daemon'],bootstrap);
for(const name of ['gradlew','gradlew.bat','gradle'])await cp(path.join(bootstrap,name),path.join(android,name),{recursive:true});
await copyFile(path.join(android,'gradlew'),path.join(android,'gradlew.sh'));
const csc='C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe';
await run(csc,['/nologo','/target:exe','/out:'+path.join(android,'gradlew.exe'),path.join(root,'scripts/android-wrapper.cs')]);await copyFile(path.join(android,'gradlew.exe'),path.join(bin,'python3.exe'));
await copyFile(path.join(android,'gradlew.exe'),path.join(android,'gradlew'));
const gradleUserHome=path.join(root,'artifacts/gradle-home'),distributionURL='https://services.gradle.org/distributions/gradle-8.11.1-bin.zip',hash=BigInt('0x'+createHash('md5').update(distributionURL).digest('hex')).toString(36),cache=path.join(gradleUserHome,'wrapper/dists/gradle-8.11.1-bin',hash);await mkdir(cache,{recursive:true});
await copyFile(path.join(root,'artifacts/android-tools/gradle-8.11.1-bin.zip'),path.join(cache,'gradle-8.11.1-bin.zip'));
await writeFile(path.join(root,'artifacts/android-tools/gradle-env.json'),JSON.stringify({sdk,bin,javaHome:tools.jdk,gradleUserHome,python:env.GARDEN_PYTHON_EXE},null,2));
console.log('Android Gradle toolchain ready. SDK initialization is left to the official scripts.');
