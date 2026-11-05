import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import {mkdir,stat,readFile,writeFile,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {musicTracks} from '../public/music-tracks.js';
import {buildClientAssets} from './build-client-assets.mjs';
import * as yaya from '../public/yaya-forms.js';

const root=path.resolve(process.env.GARDEN_PUBLIC_ROOT||'public'),output=path.join(root,'assets','optimized');await mkdir(output,{recursive:true});
const variants={high:{width:1600,quality:84,bitrate:'128k'},low:{width:768,quality:55,bitrate:'64k'}};
const manifestOnly=process.argv.includes('--manifest-only');
const media=[];
for(const [source,name] of [['/assets/garden-world.png','garden-world'],['/assets/story/prologue-v06.png','prologue']]){
  for(const [quality,settings] of Object.entries(variants)){
    const file=path.join(output,`${name}-${quality}.webp`);
    if(!manifestOnly)await sharp(path.join(root,source)).resize({width:settings.width,withoutEnlargement:true}).webp({quality:settings.quality,effort:6}).toFile(file);
    media.push({id:source,quality,url:'/assets/optimized/'+path.basename(file),type:'image'});
  }
}
for(const {file:name} of yaya.forms)for(const quality of Object.keys(variants)){
  const base=yaya.yayaAssetRoot||'/assets/yaya-v011/',source=base+name+'.png',file=path.join(output,`yaya-${base.split('/').filter(Boolean).at(-1)}-${name}-${quality}.webp`);
  if(!manifestOnly||!(await stat(file).catch(()=>null)))await sharp(path.join(root,source)).resize({width:quality==='high'?768:384,withoutEnlargement:true}).webp({quality:quality==='high'?86:65,effort:6}).toFile(file);
  media.push({id:source,quality,url:'/assets/optimized/'+path.basename(file),type:'image'});
}
for(const track of musicTracks)for(const [quality,settings] of Object.entries(variants)){
  const file=path.join(output,`${track.id}-${quality}.mp3`);
  if(!manifestOnly)await new Promise((resolve,reject)=>{const p=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',path.join(root,track.src),'-map_metadata','0','-codec:a','libmp3lame','-b:a',settings.bitrate,file],{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';p.stderr.on('data',d=>error+=d);p.on('error',reject);p.on('close',code=>code===0?resolve():reject(new Error(error)));});
  media.push({id:track.src,quality,url:'/assets/optimized/'+path.basename(file),type:'audio'});
}
const common=[];
for(const file of await readdir(root))if(/\.(js|css)$/.test(file))common.push({id:'/'+file,url:'/'+file,type:file.endsWith('.js')?'script':'style'});
for(const file of await readdir(path.join(root,'assets','cards')))if(file.endsWith('.svg'))common.push({id:'/assets/cards/'+file,url:'/assets/cards/'+file,type:'image'});
for(const asset of [...media,...common]){const bytes=await readFile(path.join(root,asset.url));asset.bytes=bytes.length;asset.sha256=createHash('sha256').update(bytes).digest('hex');}
const manifest={version:1,built:new Date().toISOString(),revision:JSON.parse(await readFile('package.json','utf8')).version,common,media};
// An unchanged build keeps its timestamp so a no-op push transfers zero bytes.
try{const previous=JSON.parse(await readFile(path.join(root,'assets/preload-manifest.json'),'utf8'));const content=m=>JSON.stringify({version:m.version,revision:m.revision,common:m.common,media:m.media});if(content(previous)===content(manifest))manifest.built=previous.built;}catch{}
await writeFile(path.join(root,'assets','preload-manifest.json'),JSON.stringify(manifest,null,2));
console.log(Object.fromEntries(Object.keys(variants).map(q=>[q,{files:common.length+media.filter(a=>a.quality===q).length,bytes:[...common,...media.filter(a=>a.quality===q)].reduce((n,a)=>n+a.bytes,0)}])));
await buildClientAssets({publicRoot:root,bundleDir:process.env.GARDEN_BUNDLE_DIR});
