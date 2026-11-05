import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';

try{
  const keyPath=path.resolve('deploy/.private/appwin-security-key.txt');
  let secret;try{secret=(await readFile(keyPath,'utf8')).replace(/^\uFEFF/,'').trim();}catch(e){if(e.code==='ENOENT')throw Error('请先把广告位的 appSecurityKey 保存到 deploy/.private/appwin-security-key.txt。');throw e;}
  if(!secret||secret.length>1024||/[\r\n\0]/.test(secret))throw Error('密钥文件只能填写一行 appSecurityKey。');
  if(['6aebec4f6545637cd636b15a','100015016'].includes(secret))throw Error('这里需要服务端奖励验证密钥，不能填写 AppKey 或广告位 ID。');
  const target=JSON.parse(await readFile('deploy/linux-target.json','utf8'));
  if(target.root!=='/home/ubuntu/lean-garden'||!/^[\w.-]+$/.test(target.host)||!/^[\w-]+$/.test(target.user))throw Error('服务器配置不正确。');
  const script=`import os,sys,tempfile,subprocess
from pathlib import Path
directory=Path('/home/ubuntu/lean-garden/data')
if directory.resolve()!=directory: raise RuntimeError('Unexpected data directory')
key=sys.stdin.buffer.read(2049).strip()
if not key or len(key)>1024 or b'\\n' in key or b'\\r' in key: raise RuntimeError('Invalid key input')
file=directory/'appwin-security-key.txt'
old=file.read_bytes() if file.exists() else None
def store(value):
    with tempfile.NamedTemporaryFile(dir=directory,prefix='.appwin-key-',delete=False) as temp:
        os.chmod(temp.name,0o600)
        temp.write(value)
        name=temp.name
    os.replace(name,file)
try:
    store(key)
    subprocess.run(['sudo','-n','systemctl','restart','lean-garden'],check=True)
    subprocess.run(['systemctl','is-active','--quiet','lean-garden'],check=True)
except Exception:
    if old is None: file.unlink(missing_ok=True)
    else: store(old)
    subprocess.run(['sudo','-n','systemctl','restart','lean-garden'],check=False)
    raise
print('AppWin server verification key configured; service restarted.')
`;
  const quote=s=>"'"+s.replaceAll("'","'\"'\"'")+"'";
  await new Promise((resolve,reject)=>{
    const proc=spawn('ssh',['-i',path.resolve(target.key),'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+path.resolve(target.knownHosts),'-o','ConnectTimeout=15',target.user+'@'+target.host,'python3 -c '+quote(script)],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output='';for(const stream of [proc.stdout,proc.stderr])stream.on('data',data=>{output+=data;if(output.length>32768)proc.kill();});
    proc.on('error',reject);proc.on('close',code=>code===0?resolve():reject(Error('服务器配置失败，退出码 '+code+'。'+output.slice(-1500))));
    proc.stdin.on('error',()=>{});proc.stdin.end(secret,'utf8');
  });
  console.log('服务器密钥已配置。请在友盟广告位后台保存服务端回调地址：');
  console.log(target.url.replace(/\/+$/,'')+'/api/ads/appwin/reward');
  console.log('然后重新进入安卓游戏，手动测试广告和奖励。');
}catch(error){console.error(error.message);process.exitCode=1;}
