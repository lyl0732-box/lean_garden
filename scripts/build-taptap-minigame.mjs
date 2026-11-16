import {readFile,writeFile,mkdir,readdir,copyFile,stat,cp} from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import vm from 'node:vm';
import {musicTracks} from '../public/music-tracks.js';
import {forms,yayaAssetRoot} from '../public/yaya-forms.js';

const source=path.resolve('clients/taptap-minigame'),out=path.resolve('dist/taptap/minigame'),version='0.13.2';
for(const dir of ['images/cards','images/yaya','audio'])await mkdir(path.join(out,dir),{recursive:true});
const assets={background:'images/garden.jpg',story:'images/story.jpg',yaya:[],cards:{},music:{},credits:musicTracks};
const atlas=JSON.parse(await readFile(path.join(source,'art/atlas.json'),'utf8'));
await cp(path.join(source,'art'),path.join(out,'images/ui'),{recursive:true});
const prefix=value=>typeof value==='string'&&value.endsWith('.png')?'images/ui/'+value:Array.isArray(value)?value.map(prefix):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,prefix(item)])):value;
assets.ui=prefix(atlas);
await sharp('public/assets/optimized/garden-world-high.webp').jpeg({quality:94,mozjpeg:true}).toFile(path.join(out,assets.background));
await sharp('public/assets/optimized/prologue-high.webp').jpeg({quality:94,mozjpeg:true}).toFile(path.join(out,assets.story));
for(const f of forms){const file='images/yaya/'+f.file+'.png';await sharp(path.join('public',yayaAssetRoot,f.file+'.png')).resize({width:640,withoutEnlargement:true}).png({compressionLevel:9}).toFile(path.join(out,file));assets.yaya.push(file);}
for(const file of await readdir('public/assets/cards'))if(file.endsWith('.svg')){const key=file.slice(0,-4),target='images/cards/'+key+'.png';await sharp(path.join('public/assets/cards',file)).resize(240,180,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toFile(path.join(out,target));assets.cards[key]=target;}
for(const track of musicTracks){const target='audio/'+track.id+'.mp3';await copyFile('public/assets/optimized/'+track.id+'-high.mp3',path.join(out,target));assets.music[track.scene]=target;}
// Original, short layered bell arpeggio for card discovery. No external recording.
const rate=22050,seconds=2.1,samples=Math.ceil(rate*seconds),wav=Buffer.alloc(44+samples*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);
for(let i=0;i<samples;i++){const t=i/rate;let value=0;for(const [j,f]of [523.25,659.25,783.99,1046.5].entries()){const dt=t-j*.17;if(dt>=0)value+=(Math.sin(2*Math.PI*f*dt)*.7+Math.sin(2*Math.PI*f*2.76*dt)*.2)*Math.exp(-dt*3.8)*Math.min(1,dt*150)*.2;}wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*28000),44+i*2);}await writeFile(path.join(out,'audio/reward.wav'),wav);
await writeFile(path.join(out,'assets.json'),JSON.stringify(assets,null,2));
await copyFile(path.join(source,'game.json'),path.join(out,'game.json'));await copyFile(path.join(source,'project.config.json'),path.join(out,'project.config.json'));
const modules={};
for(const name of ['config.js','src/platform.js','src/canvas-ui.js','src/rewarded-ad.js','src/art-theme.js','src/game.js'])modules[name]=await readFile(path.join(source,name),'utf8');
modules['ai-disclosure.json']='module.exports='+await readFile(path.join(source,'ai-disclosure.json'),'utf8')+';';
modules['assets.json']='module.exports='+JSON.stringify(assets)+';';
const definitions=Object.entries(modules).map(([key,code])=>JSON.stringify(key)+':function(require,module,exports){\n'+code+'\n}').join(',\n');
const bundle=`/* Lean Garden ${version} | TapTap native Canvas runtime. */\n(function(){'use strict';\nvar definitions={${definitions}},cache={};\nfunction load(id){if(cache[id])return cache[id].exports;if(!definitions[id])throw Error('Unknown module '+id);var module=cache[id]={exports:{}};function local(request){var parts=id.split('/');parts.pop();request.split('/').forEach(function(p){if(p==='..')parts.pop();else if(p!=='.')parts.push(p);});return load(parts.join('/'));}definitions[id](local,module,module.exports);return module.exports;}\nGameGlobal.leanGarden=new (load('src/game.js').GardenGame)(tap);\n})();\n`;
if(/\b(?:document|window|XMLHttpRequest|HTMLCanvasElement)\b|umeng|appwin/i.test(bundle))throw Error('Browser-only API or removed vendor found in runtime');
new vm.Script(bundle,{filename:'game.js'});
await writeFile(path.join(out,'game.js'),bundle);
const credits=musicTracks.map(t=>`${t.title} — ${t.artist}\nSource: ${t.url}\nLicense: ${t.license} ${t.licenseUrl}\nRe-encoded to MP3 128k; used for looping game scenes.\n`).join('\n');await writeFile(path.join(out,'MUSIC-CREDITS.txt'),credits+'\nCard discovery sound: original generated composition.\n');
await writeFile(path.join(out,'README.txt'),'证明花园 TapTap 小游戏 v'+version+'\n入口 game.js，Canvas 2D + tap API，无网页 DOM。\n默认连接 https://162.14.77.140/，与原版共用账号和服务器进度，必须联网。\n仅保留 TapTap 官方激励视频接口；广告位未开通，因此默认关闭，无模拟广告奖励。\n详细上传与待配置说明见同级 dist/taptap/上传说明.md。\n');
async function files(dir,prefix=''){const list=[];for(const entry of await readdir(dir,{withFileTypes:true})){const relative=prefix+entry.name;if(entry.isDirectory())list.push(...await files(path.join(dir,entry.name),relative+'/'));else list.push({path:relative,bytes:(await stat(path.join(dir,entry.name))).size});}return list;}
const entries=await files(out),total=entries.reduce((n,f)=>n+f.bytes,0);if(total>60*1000*1000)throw Error('Package exceeds TapTap 60MB limit');
const zip=path.resolve('dist/taptap/LeanGarden-'+version+'-taptap-minigame.zip');
await new Promise((resolve,reject)=>{const script="import pathlib,sys,zipfile\nroot=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:\n for p in sorted(root.rglob('*')):\n  if p.is_file(): z.write(p,p.relative_to(root).as_posix())\n";const p=spawn('python',['-c',script,out,zip],{windowsHide:true,stdio:['ignore','inherit','inherit']});p.on('error',reject);p.on('close',code=>code===0?resolve():reject(Error('ZIP exited '+code)));});
const bytes=await readFile(zip);await writeFile(path.resolve('dist/taptap/minigame-build-report.json'),JSON.stringify({version,zip,bytes:bytes.length,uncompressedBytes:total,files:entries.length,sha256:createHash('sha256').update(bytes).digest('hex'),entry:'game.js',renderer:'tap.createCanvas Canvas2D',server:'https://162.14.77.140',thirdPartyAdSDKs:[],officialRewardedAdInterface:true,officialAdPlacementConfigured:false,realTapTapTested:false},null,2));
console.log(JSON.stringify({zip,bytes:bytes.length,uncompressedBytes:total,files:entries.length}));
