import { levels, commonActions } from '../server/content.mjs';
import { checkLean } from '../server/lean.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const filter = process.argv[2];
const selected = levels.filter(l => !filter || l.id.startsWith(filter));
const failures = [];
const results = [];
for (let i=0; i<selected.length; i+=2) {
  await Promise.all(selected.slice(i,i+2).map(async level => {
    const all = [...commonActions,...level.actions];
    const missing = level.solution.filter(code => !all.some(a=>a.code===code));
    if (missing.length) { failures.push({id:level.id,missing}); console.log('MISSING',level.id,missing); return; }
    const result = await checkLean(level,level.solution,{fresh:true});
    results.push({id:level.id,complete:result.complete,elapsed:result.elapsed});
    if (!result.complete) { failures.push({id:level.id,...result}); console.log('FAIL',level.id,JSON.stringify(result)); }
    else console.log('PASS',level.id,`${result.elapsed}ms`);
  }));
}
await mkdir('artifacts',{recursive:true});
await writeFile(`artifacts/verification${filter ? '-'+filter : ''}.json`,JSON.stringify({date:new Date().toISOString(),results,failures},null,2));
console.log(`${results.filter(r=>r.complete).length}/${selected.length} verified; ${failures.length} failed`);
process.exitCode = failures.length ? 1 : 0;
