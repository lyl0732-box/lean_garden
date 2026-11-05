// Runs only inside an authenticated SSH connection. No database access here:
// requests go to the live game's owner-only Unix socket.
import http from 'node:http';import readline from 'node:readline';
const socketPath=process.env.GARDEN_ADMIN_SOCKET||'/home/ubuntu/lean-garden/data/admin.sock';
const lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of lines){
  let request;
  try{
    if(line.length>12000)throw Error('Request too large');request=JSON.parse(line);
    if(!Number.isSafeInteger(request.id)||!(request.method==='GET'&&request.path==='/snapshot'||request.method==='POST'&&/^\/users\/[a-f0-9-]{36}\/(wallet|role|password)$/.test(request.path)))throw Error('Invalid management request');
    const result=await new Promise((resolve,reject)=>{
      const data=JSON.stringify(request.body||{});
      const req=http.request({socketPath,path:request.path,method:request.method,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}},res=>{
        let text='';res.setEncoding('utf8');res.on('data',chunk=>text+=chunk);
        res.on('end',()=>{try{resolve({status:res.statusCode,data:JSON.parse(text)});}catch{reject(Error('Invalid server response'));}});
      });
      req.on('error',reject);req.setTimeout(30000,()=>req.destroy(Error('Management request timed out')));req.end(data);
    });
    process.stdout.write(JSON.stringify({id:request.id,...result})+'\n');
  }catch(error){process.stdout.write(JSON.stringify({id:request?.id,status:503,data:{error:'管理连接失败：'+error.message}})+'\n');}
}
