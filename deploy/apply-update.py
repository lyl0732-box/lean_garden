"""Apply a hash-verified delta; player data and the proof runtime stay in place."""
import hashlib,json,os,re,shutil,subprocess,sys,tarfile,time,urllib.request
from pathlib import Path
ROOT=Path('/home/ubuntu/lean-garden')
if not re.fullmatch(r'[a-zA-Z0-9-]+',sys.argv[1]): raise ValueError('Invalid upload id')
incoming=ROOT/'incoming'/sys.argv[1]
manifest=json.loads((incoming/'manifest.json').read_text())
entries={e['path']:e for e in manifest['files']}
def digest(file):
    h=hashlib.sha256()
    with file.open('rb') as f:
        while data:=f.read(1024*1024): h.update(data)
    return h.hexdigest()
def allowed(name):
    return ('..' not in Path(name).parts and '\\' not in name and not name.startswith('/') and
        (name.startswith(('public/','server/','scripts/create-admin.mjs')) or name=='package.json' or re.fullmatch(r'runtime/lib/lean/Garden(?:/Strict)?\.(?:olean(?:\.private|\.server)?|ir(?:\.sig)?)',name)))
for name,e in entries.items():
    if not allowed(name) or not re.fullmatch('[a-f0-9]{64}',e['sha256']): raise ValueError('Invalid payload path')
releases=ROOT/'releases';releases.mkdir(exist_ok=True)
release=releases/sys.argv[1];release.mkdir()
current=ROOT/'current';old=current.resolve() if current.exists() else None
for name,e in entries.items():
    if name.startswith('runtime/'): continue
    dest=release/name;dest.parent.mkdir(parents=True,exist_ok=True)
    source=old/name if old else None
    if source and source.is_file() and digest(source)==e['sha256']: os.link(source,dest)
runtime_backups={}
try:
    with tarfile.open(incoming/'delta.tar.gz','r:gz') as tar:
        for member in tar:
            name=member.name
            if name not in entries or not member.isfile(): raise ValueError('Unexpected archive entry')
            data=tar.extractfile(member).read()
            if len(data)!=entries[name]['bytes'] or hashlib.sha256(data).hexdigest()!=entries[name]['sha256']:raise ValueError('Payload checksum mismatch')
            if name.startswith('runtime/'):
                dest=ROOT/name;runtime_backups[name]=dest.read_bytes() if dest.exists() else None
            else: dest=release/name
            dest.parent.mkdir(parents=True,exist_ok=True)
            if dest.exists(): dest.unlink() # never truncate a hard link to a prior release
            dest.write_bytes(data)
    for name,e in entries.items():
        target=(ROOT if name.startswith('runtime/') else release)/name
        if not target.is_file() or digest(target)!=e['sha256']: raise ValueError('Incomplete release: '+name)
    for file in (release/'server').glob('*.mjs'):subprocess.run([str(ROOT/'tools/node/bin/node'),'--check',str(file)],check=True,capture_output=True)
    (release/'lean/.scratch').mkdir(parents=True,exist_ok=True)
    (release/'lean/.lake/build/lib').mkdir(parents=True,exist_ok=True)
    (release/'lean/.lake/build/lib/lean').symlink_to(ROOT/'runtime/lib/lean')
    (release/'.manifest.json').write_text(json.dumps(manifest))
    link=ROOT/'current.next'
    if link.is_symlink():link.unlink()
    backups=ROOT/'backups'/sys.argv[1];backups.mkdir(parents=True,exist_ok=True)
    for name in ['accounts.json','progress.json','appwin-rewards.json']:
        source=ROOT/'data'/name
        if source.exists():shutil.copy2(source,backups/name);os.chmod(backups/name,0o600)
    link.symlink_to(release);os.replace(link,current)
    subprocess.run(['sudo','-n','systemctl','restart','lean-garden'],check=True)
    ready=False
    for _ in range(40):
        try:
            with urllib.request.urlopen('http://127.0.0.1:3210/api/health',timeout=8) as r:ready=json.load(r).get('ready') is True
            if ready:break
        except Exception:pass
        time.sleep(1)
    if not ready:raise RuntimeError('New release failed its real Lean health check')
    temp=ROOT/'inventory.next.json';temp.write_text(json.dumps(manifest));os.replace(temp,ROOT/'inventory.json')
    print(json.dumps({'ok':True,'revision':manifest['revision'],'files':len(entries),'changedFiles':manifest['changedFiles'],'uploadedBytes':manifest['uploadedBytes']}))
    # Only known managed releases are eligible; keep two rollback generations.
    keep={p for p in [release,old] if p}
    previous=sorted((p for p in releases.iterdir() if p.is_dir() and p.resolve().parent==releases.resolve() and re.fullmatch(r'[a-zA-Z0-9-]+',p.name)),key=lambda p:p.stat().st_mtime,reverse=True)
    for p in previous[3:]:
        if p not in keep:shutil.rmtree(p)
    backup_root=ROOT/'backups'
    saved=sorted((p for p in backup_root.iterdir() if p.is_dir() and p.resolve().parent==backup_root.resolve() and re.fullmatch(r'[a-zA-Z0-9-]+',p.name)),key=lambda p:p.stat().st_mtime,reverse=True)
    for p in saved[3:]:shutil.rmtree(p)
    shutil.rmtree(incoming)
except Exception:
    for name,data in runtime_backups.items():
        target=ROOT/name
        if data is None:target.unlink(missing_ok=True)
        else:target.write_bytes(data)
    if old:
        link=ROOT/'current.rollback';link.symlink_to(old);os.replace(link,current)
        subprocess.run(['sudo','-n','systemctl','restart','lean-garden'],check=False)
    raise
