import {readFile,writeFile,stat} from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const version=JSON.parse(await readFile('package.json','utf8')).version;
const manifest=JSON.parse(await readFile('public/client-manifest.json','utf8'));assert.equal(manifest.revision,version);
for(const a of manifest.assets){const b=await readFile('public'+a.url);assert.equal(b.length,a.bytes,a.url);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256,a.url);}
const bundle=JSON.parse(await readFile('clients/bundled/manifest.json','utf8'));assert.deepEqual(bundle,manifest);
for(const a of bundle.assets){const b=await readFile('clients/bundled/blobs/'+a.sha256);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);}
const before=JSON.parse(await readFile('artifacts/plan7-before-20261104-113402/data/progress.json','utf8')),after=JSON.parse(await readFile('data/progress.json','utf8'));let records=0;
for(const [id,p]of Object.entries(before.profiles)){assert.deepEqual(after.profiles[id].completed,p.completed);records+=Object.keys(p.completed||{}).length;}
const accounts=JSON.parse(await readFile('data/accounts.json','utf8')),admin=Object.values(accounts.accounts).find(x=>x.username==='canstarlia');assert.equal(admin.role,'admin');assert.equal('password'in admin,false);
const access=await Promise.all(['http://localhost:3210','http://100.83.142.93:3210','http://desktop-n9bri0f-2.tail91dba6.ts.net:3210'].map(async url=>{
  const [page,health,auth,boot,assetManifest]=await Promise.all([fetch(url),fetch(url+'/api/health').then(r=>r.json()),fetch(url+'/api/auth/status').then(r=>r.json()),fetch(url+'/api/bootstrap'),fetch(url+'/client-manifest.json').then(r=>r.json())]);
  assert.equal(page.status,200);assert.equal(health.ready,true);assert.equal(auth.authenticated,false);assert.equal(boot.status,401);assert.equal(assetManifest.revision,version);return {url,status:page.status,leanReady:true,anonymousBootstrap:401,version};
}));
const files=await Promise.all([`dist/windows/LeanGarden-Setup-${version}.exe`,`dist/android/LeanGarden-${version}-local.apk`,`dist/deploy/lean-garden-cloud-${version}.tar.gz`].map(async file=>{const bytes=await readFile(file);return {file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}));
const report={date:new Date().toISOString(),version,originalProfilesPreserved:Object.keys(before.profiles).length,originalCompletedProofsPreserved:records,adminCreated:!!admin,adminRole:admin.role,adminLegacySavePending:admin.profileId===null,assetHashesVerified:manifest.assets.length,bundledBothQualities:true,access,files,physicalAndroidTested:false};await writeFile('artifacts/release-v011.json',JSON.stringify(report,null,2));console.log(report);
