"""Move only the existing native Linux service and its HTTPS upstream.

Run over SSH as root, with the desired unprivileged port as the only argument.
Docker and local-development ports are independent.
"""
import datetime,json,os,re,shlex,shutil,socket,subprocess,sys,time,urllib.request
from pathlib import Path

ROOT=Path('/home/ubuntu/lean-garden')
NGINX=Path('/etc/nginx/sites-available/lean-garden')
DROPIN=Path('/etc/systemd/system/lean-garden.service.d/20-port.conf')
port=int(sys.argv[1])
if os.geteuid()!=0 or not 1024<=port<=65535:raise ValueError('Root and a port in 1024..65535 are required')
def run(*args):
    return subprocess.run(args,check=True,capture_output=True,text=True).stdout
env=dict(item.split('=',1) for item in shlex.split(run('systemctl','show','lean-garden','-p','Environment','--value')) if '=' in item)
old_port=int(env['PORT'])
if env.get('HOST')!='127.0.0.1':raise RuntimeError('Unexpected service bind address')
def healthy(value):
    try:
        # A cold Lean import can approach the engine's 45-second timeout.
        with urllib.request.urlopen(f'http://127.0.0.1:{value}/api/health',timeout=50) as response:
            return json.load(response).get('ready') is True
    except Exception:return False
if port==old_port:
    if not healthy(port):raise RuntimeError('Service is not ready')
    print(json.dumps({'ok':True,'port':port,'unchanged':True}));sys.exit(0)
with socket.socket() as probe:probe.bind(('127.0.0.1',port))
original_nginx=NGINX.read_bytes()
pattern=rb'(proxy_pass\s+http://127\.0\.0\.1:)'+str(old_port).encode()+rb'(?=[/;\s])'
updated_nginx,count=re.subn(pattern,lambda m:m[1]+str(port).encode(),original_nginx)
if count!=1:raise RuntimeError('Expected exactly one game proxy upstream')
original_dropin=DROPIN.read_bytes() if DROPIN.exists() else None
backup=ROOT/'config-backups'/('port-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
backup.mkdir(parents=True,mode=0o700)
(backup/'nginx.conf').write_bytes(original_nginx)
(backup/'previous-port.json').write_text(json.dumps({'port':old_port}))
if original_dropin is not None:(backup/'20-port.conf').write_bytes(original_dropin)
for name in ['accounts.json','progress.json','appwin-rewards.json']:
    source=ROOT/'data'/name
    if source.exists():shutil.copy2(source,backup/name);os.chmod(backup/name,0o600)
try:
    DROPIN.parent.mkdir(parents=True,exist_ok=True)
    DROPIN.write_text(f'[Service]\nEnvironment=PORT={port}\n')
    run('systemctl','daemon-reload');run('systemctl','restart','lean-garden')
    ready=False
    for _ in range(3):
        if healthy(port):ready=True;break
        time.sleep(1)
    if not ready:raise RuntimeError('Service did not become ready on the new port')
    NGINX.write_bytes(updated_nginx)
    run('nginx','-t');run('systemctl','reload','nginx')
    # Nginx reload is graceful: an old worker may briefly serve the old
    # upstream after systemctl returns. Give the new workers time to take over.
    public_ready=False
    for _ in range(10):
        try:
            with urllib.request.urlopen('https://162.14.77.140/api/health',timeout=8) as response:
                public_ready=json.load(response).get('ready') is True
            if public_ready:break
        except Exception:pass
        time.sleep(1)
    if not public_ready:raise RuntimeError('Public HTTPS health check failed')
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1',old_port))==0:raise RuntimeError('Old port is still in use')
    print(json.dumps({'ok':True,'oldPort':old_port,'port':port,'publicUrl':'https://162.14.77.140/','backup':str(backup)}))
except Exception:
    if original_dropin is None:DROPIN.unlink(missing_ok=True)
    else:DROPIN.write_bytes(original_dropin)
    NGINX.write_bytes(original_nginx)
    run('systemctl','daemon-reload');run('systemctl','restart','lean-garden')
    run('nginx','-t');run('systemctl','reload','nginx')
    raise
