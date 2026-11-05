"""Verify the actual signed APK and preserve the pre-integration game assets."""
from pathlib import Path
import hashlib,json,re,subprocess,zipfile,xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[1]
android=root/'clients/android'
tools=json.loads((root/'artifacts/android-tools/tools.json').read_text(encoding='utf-8'))
apk=root/'dist/android/LeanGarden-0.12.2-local.apk'
previous=root/'dist/android/LeanGarden-0.12.1-local.apk'
run=lambda args:subprocess.run([str(a) for a in args],capture_output=True,check=True,encoding='utf-8',errors='replace').stdout
def certificate(file):
    text=run([Path(tools['jdk'])/'bin/java.exe','-jar',Path(tools['buildTools'])/'lib/apksigner.jar','verify','--print-certs',file])
    return re.search(r'certificate SHA-256 digest: ([a-f0-9]+)',text).group(1)
assert certificate(apk)==certificate(previous),'Signing identity changed'
badging=run([Path(tools['buildTools'])/'aapt2.exe','dump','badging',apk])
assert "name='cn.leangarden.client'" in badging
assert "versionName='0.12.2'" in badging and "versionCode='17'" in badging
assert "minSdkVersion:'26'" in badging and "targetSdkVersion:'36'" in badging
assert 'application-debuggable' not in badging
for permission in ['INTERNET','ACCESS_NETWORK_STATE','ACCESS_WIFI_STATE']:
    assert 'android.permission.'+permission in badging

source=android/'app/src/main/java/cn/leangarden/client'
unchanged=[]
for item in json.loads((root/'artifacts/umeng-business-source-before.json').read_text(encoding='utf-8-sig')):
    name=Path(item['Path']).name
    assert hashlib.sha256((source/name).read_bytes()).hexdigest().upper()==item['Hash'].upper(),name+' changed'
    unchanged.append(name)
application=(source/'UmengApplication.java').read_text(encoding='utf-8')
for statement in ['UMConfigure.preInit(', 'UMCrash.initConfig(', 'UMConfigure.init(']:
    assert application.count(statement)==1,statement+' duplicated'
assert application.index('UMConfigure.preInit(')<application.index('UMCrash.initConfig(')<application.index('UMConfigure.init(')
assert '"direct"' in application and '6aebec4f6545637cd636b15a' in application
manifest=ET.parse(android/'app/src/main/AndroidManifest.xml').getroot()
assert manifest.find('application').get('{http://schemas.android.com/apk/res/android}name')=='.UmengApplication'

with zipfile.ZipFile(apk) as package,zipfile.ZipFile(previous) as old:
    assets=json.loads(package.read('assets/manifest.json'))
    assert assets==json.loads(old.read('assets/manifest.json'))
    for asset in assets['assets']:
        data=package.read('assets/blobs/'+asset['sha256'])
        assert hashlib.sha256(data).hexdigest()==asset['sha256']
    assert package.read('assets/login-background.webp')==old.read('assets/login-background.webp')
    dex=b''.join(package.read(n) for n in package.namelist() if re.fullmatch(r'classes\d*\.dex',n))
    for descriptor in [b'Lcom/umeng/commonsdk/UMConfigure;',b'Lcom/umeng/umcrash/UMCrash;',b'Lcn/leangarden/client/UmengApplication;']:
        assert descriptor in dex,descriptor
    assert b'https://162.14.77.140/' in dex
    assert any(n.startswith('lib/arm64-v8a/') and 'ucrash' in n for n in package.namelist())
    assert not any('.signing/' in n or '.private/' in n or n.endswith(('accounts.json','progress.json')) for n in package.namelist())

lock=(android/'app/gradle.lockfile').read_text(encoding='utf-8')
dependencies={}
for artifact in ['common','asms','apm']:
    matches=re.findall(r'^com\.umeng\.umsdk:'+artifact+r':([^=]+)=',lock,re.M)
    assert len(matches)==1,artifact+' missing or duplicated'
    dependencies[artifact]=matches[0]
apk_sha256=hashlib.sha256(apk.read_bytes()).hexdigest()
runtime='not verified for this APK'
device_report=root/'artifacts/umeng-android-device-report.json'
if device_report.exists():
    device=json.loads(device_report.read_text(encoding='utf-8'))
    if device.get('apkSHA256')==apk_sha256 and device.get('releasePackageMatchesInstalled'):
        runtime='see artifacts/umeng-android-device-report.json (matching installed Release APK)'
report={'version':'0.12.2','apk':str(apk.relative_to(root)),'bytes':apk.stat().st_size,'sha256':apk_sha256,'certificateSHA256':certificate(apk),'package':'cn.leangarden.client','channel':'direct','dependencies':dependencies,'plugin':'com.umeng.umsdk:apm-plugin:2.0.0','gameSourcesUnchanged':unchanged,'gameAssetsUnchanged':len(assets['assets']),'initializationOrder':['UMConfigure.preInit','UMCrash.initConfig','UMConfigure.init'],'signedRelease':True,'runtimeVerification':runtime}
(root/'artifacts/umeng-android-package-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=True,indent=2))
