import { spawn } from 'node:child_process';
import { mkdir, writeFile, unlink, access, readFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const leanRoot = path.join(root, 'lean');
const scratch = path.join(leanRoot, '.scratch');
const cache = new Map();
let active = 0;
const queue = [];
const concurrency=Math.max(1,Math.min(2,Number(process.env.GARDEN_LEAN_CONCURRENCY)||2));
let environmentPromise;
async function resolveLeanEnvironment() {
  if(process.env.GARDEN_LEAN_ENV){
    if(!environmentPromise)environmentPromise=readFile(process.env.GARDEN_LEAN_ENV,'utf8').then(JSON.parse).then(env=>{if(typeof env.LEAN_PATH!=='string'||typeof env.LEAN_SYSROOT!=='string')throw new Error('Lean 环境配置不完整。');return env;}).catch(error=>{environmentPromise=undefined;throw error;});
    return environmentPromise;
  }
  if(!environmentPromise)environmentPromise=new Promise((resolve,reject)=>{
    const p=spawn(process.env.LAKE_BIN||'lake',['env','node','-e','process.stdout.write(JSON.stringify({LEAN_PATH:process.env.LEAN_PATH,LEAN_SYSROOT:process.env.LEAN_SYSROOT}))'],{cwd:leanRoot,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let output='',error='';const timer=setTimeout(()=>p.kill(),15000);
    p.stdout.on('data',d=>output+=d);p.stderr.on('data',d=>error+=d);
    p.on('error',e=>{clearTimeout(timer);reject(e);});
    p.on('close',code=>{clearTimeout(timer);try{if(code!==0)throw new Error(error||'无法加载 Lean 环境');const env=JSON.parse(output);if(!env.LEAN_SYSROOT||!env.LEAN_PATH)throw new Error('Lean 环境不完整');resolve(env);}catch(e){reject(e);}});
  }).catch(e=>{environmentPromise=undefined;throw e;});
  return environmentPromise;
}
const acquire = async () => { if (active >= concurrency) await new Promise(r => queue.push(r)); active++; };
const release = () => { active--; queue.shift()?.(); };

export function sourceFor(level, codes, diagnostic = true) {
  return `import Garden\nopen scoped BigOperators\nopen Set Nat\nset_option pp.fieldNotation false\nset_option maxHeartbeats 800000\n\n${level.prelude || ''}\ntheorem garden_${level.id.replaceAll('-', '_')} ${level.statement.replaceAll('Nat.succ','succ')} := by\n${codes.map(c => c.replaceAll('Nat.succ','succ').split('\n').map(l => `  ${l}`).join('\n')).join('\n')}\n${diagnostic ? '  garden_state\n' : ''}`;
}

export async function checkLean(level, codes, { fresh = false } = {}) {
  const source = sourceFor(level, codes);
  const hash = crypto.createHash('sha256').update(source).digest('hex');
  if (!fresh && cache.has(hash)) return cache.get(hash);
  const task = run(source, hash);
  if (!fresh) { cache.set(hash, task); if (cache.size > 1500) cache.delete(cache.keys().next().value); }
  const result = await task;
  if (result.engineError) cache.delete(hash);
  return result;
}

async function run(source, hash) {
  await acquire();
  const file = path.join(scratch, `${hash}-${crypto.randomBytes(3).toString('hex')}.lean`);
  const started = Date.now();
  try {
    const leanEnv=await resolveLeanEnvironment();
    await mkdir(scratch, { recursive: true });
    await writeFile(file, source);
    const outcome = await new Promise(resolve => {
      const binary=process.env.LEAN_EXECUTABLE||path.join(leanEnv.LEAN_SYSROOT,'bin',process.platform==='win32'?'lean.exe':'lean');
      const child = spawn(binary, ['--json', file], {
        cwd: leanRoot, env:{...process.env,...leanEnv}, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
      });
      let stdout = '', stderr = '', timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill(); }, 45000);
      child.stdout.on('data', d => { stdout += d.toString(); if (stdout.length > 2e6) child.kill(); });
      child.stderr.on('data', d => { stderr += d.toString(); });
      child.on('error', error => { clearTimeout(timer); resolve({ engineError: error.message }); });
      child.on('close', code => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut }); });
    });
    if (outcome.engineError || outcome.timedOut) return { engineError: outcome.engineError || 'Lean 验证超时，请稍后重试。', ok: false };
    const diagnostics = outcome.stdout.split(/\r?\n/).flatMap(line => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
    const snapshot = diagnostics.findLast(d => d.data?.startsWith('GARDEN_STATE:'));
    let goals;
    try { goals = JSON.parse(snapshot?.data.slice('GARDEN_STATE:'.length)); } catch { /* reported below */ }
    const errors = diagnostics.filter(d => d.severity === 'error');
    const warnings = diagnostics.filter(d => d.severity === 'warning');
    const badErrors = errors.filter(d => d.kind !== 'Tactic.unsolvedGoals');
    const unsafe = warnings.some(d => /sorry|axiom/i.test(d.data));
    if (!goals) {
      const errorText=errors.map(d=>d.data).join('\n');
      if(errors.length&&!/unknown module|object file|no such file|failed to load/i.test(errorText))
        return {ok:false,complete:false,goals:[],errors:errors.map(d=>d.data),elapsed:Date.now()-started};
      return { ok: false, engineError: diagnostics[0]?.data || outcome.stderr || 'Lean 未返回证明状态。' };
    }
    const complete = outcome.code === 0 && goals.length === 0 && !unsafe;
    const ok = !unsafe && badErrors.length === 0 && (complete || goals.length > 0);
    const matchesLog=diagnostics.findLast(d=>d.data?.startsWith('GARDEN_MATCHES:'));
    let matches;try{matches=JSON.parse(matchesLog?.data.slice('GARDEN_MATCHES:'.length));}catch{}
    return { ok, complete, goals, matches, errors: errors.map(d => d.data), elapsed: Date.now() - started };
  } catch (error) { return { ok: false, engineError: error.message }; }
  finally { await unlink(file).catch(() => {}); release(); }
}

export async function engineHealth() {
  try {
    await access(path.join(leanRoot, '.lake/build/lib/lean/Garden.olean'));
    const result = await checkLean({ id: 'health', statement: ': (0 : Nat) = 0' }, ['rfl']);
    return { ready: result.complete === true, version: 'Lean 4.34.0 · Mathlib', message: result.engineError || '' };
  } catch { return { ready: false, version: 'Lean 4.34.0', message: '证明引擎尚未构建。请运行 setup.ps1。' }; }
}
