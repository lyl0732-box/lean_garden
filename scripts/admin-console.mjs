import http from 'node:http';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {randomBytes,timingSafeEqual} from 'node:crypto';
import {spawn} from 'node:child_process';import readline from 'node:readline';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export class SshManagement{
  child=null;pending=new Map();sequence=0;lastError='';
  constructor(config){this.config=config;}
  connect(){
    if(this.child)return;const c=this.config;
    if(!/^[a-zA-Z0-9.-]+$/.test(c.host)||!/^[a-zA-Z0-9_-]+$/.test(c.user)||c.root!=='/home/ubuntu/lean-garden')throw Error('Invalid SSH target');
    const args=['-T','-i',path.resolve(root,c.key),'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+path.resolve(root,c.knownHosts),'-o','ConnectTimeout=10','-o','ServerAliveInterval=10','-o','ServerAliveCountMax=2',c.user+'@'+c.host,c.root+'/tools/node/bin/node '+c.root+'/current/server/admin-rpc.mjs'];
    const child=spawn('ssh',args,{windowsHide:true,stdio:['pipe','pipe','pipe']});this.child=child;this.lastError='';
    readline.createInterface({input:child.stdout}).on('line',line=>{try{const reply=JSON.parse(line),pending=this.pending.get(reply.id);if(pending){clearTimeout(pending.timer);this.pending.delete(reply.id);pending.resolve(reply);}}catch{}});
    child.stderr.on('data',data=>{this.lastError=(this.lastError+data.toString()).slice(-1500);});
    const failed=error=>{if(this.child!==child)return;this.child=null;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('SSH 管理连接中断。'+(error?.message||this.lastError)));}this.pending.clear();};
    child.on('error',failed);child.on('close',()=>failed());child.stdin.on('error',failed);
  }
  request(method,url,body){
    if(this.pending.size>=12)return Promise.reject(Error('管理请求较多，请稍后重试。'));this.connect();const id=++this.sequence;
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);this.child?.kill();reject(Error('服务器响应超时，连接将自动重试。'));},40000);this.pending.set(id,{resolve,reject,timer});this.child.stdin.write(JSON.stringify({id,method,path:url,body})+'\n');});
  }
  close(){this.child?.kill();}
}
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
export function createConsole({bridge,key,uiRoot=path.join(root,'admin-console')}){
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try{
      if(req.headers.host!=='127.0.0.1:'+server.address().port)throw Object.assign(Error('请使用本机地址访问。'),{status:403});
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/health'&&req.method==='GET')return send(res,200,{app:'lean-garden-admin',pid:process.pid});
      if(url.pathname.startsWith('/api/')){
        if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host||req.headers['sec-fetch-site']==='cross-site')throw Object.assign(Error('跨站请求已拒绝。'),{status:403});
        const provided=Buffer.from(req.headers['x-admin-key']||''),expected=Buffer.from(key);if(provided.length!==expected.length||!timingSafeEqual(provided,expected))throw Object.assign(Error('管理凭据失效，请通过启动脚本重新打开面板。'),{status:401});
        const route=url.pathname.slice(4);
        if(!(req.method==='GET'&&route==='/snapshot'||req.method==='POST'&&/^\/users\/[a-f0-9-]{36}\/(wallet|role|password)$/.test(route)))throw Object.assign(Error('未知管理接口。'),{status:404});
        let body;if(req.method==='POST'){let bytes=0,parts=[];for await(const part of req){bytes+=part.length;if(bytes>8192)throw Object.assign(Error('请求过大。'),{status:413});parts.push(part);}try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Object.assign(Error('请求格式不正确。'),{status:400});}}
        const result=await bridge.request(req.method,route,body);return send(res,result.status,result.data);
      }
      const files={'/':'index.html','/console.js':'console.js','/style.css':'style.css'};if(req.method!=='GET'||!files[url.pathname])return send(res,404,{error:'找不到页面。'});
      const file=files[url.pathname],data=await readFile(path.join(uiRoot,file));res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(data);
    }catch(error){send(res,error.status||503,{error:error.message});}
  });server.on('close',()=>bridge.close?.());return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const config=JSON.parse(await readFile(path.join(root,'deploy/linux-target.json'),'utf8')),key=randomBytes(32).toString('hex'),bridge=new SshManagement(config),port=Number(process.env.GARDEN_ADMIN_PORT||3218),server=createConsole({bridge,key});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  const privateDir=path.join(root,'deploy/.private');await mkdir(privateDir,{recursive:true});
  await writeFile(path.join(privateDir,'admin-console-runtime.json'),JSON.stringify({pid:process.pid,url:'http://127.0.0.1:'+server.address().port+'/#key='+key,started:new Date().toISOString()}),{mode:0o600});
  console.log('Local management console listening on 127.0.0.1:'+server.address().port+' (SSH: '+config.host+').');
  const stop=()=>{bridge.close();server.close(()=>process.exit());setTimeout(()=>process.exit(),1000).unref();};process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
