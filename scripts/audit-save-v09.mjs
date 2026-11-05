import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {previousN06Statement} from '../server/revision9.mjs';

const before=JSON.parse(await readFile('data/progress.before-v9.json','utf8'));
const after=JSON.parse(await readFile('data/progress.json','utf8'));
let owners=0,profiles=0,results=0,attempts=0,archived=0;
for(const [id,oldOwner] of Object.entries(before.profiles)){
  const owner=after.profiles[id];assert.ok(owner,'An existing owner must remain');owners++;
  for(const [old,current] of [[oldOwner,owner],[oldOwner.practice,owner.practice]]){
    if(!old)continue;
    assert.ok(current);assert.equal(current.curriculumVersion,9);profiles++;
    for(const [level,result] of Object.entries(old.completed||{})){
      assert.ok(current.completed[level],'An earned result must remain');
      assert.ok(current.completed[level].stars>=result.stars,'Earned stars must remain');results++;
    }
    if((old.attempts?.n06||old.completed?.n06)&&!(old.curriculumVersion>=9)){
      const archive=current.legacyLevelsV8?.n06;assert.ok(archive);assert.equal(archive.statement,previousN06Statement);
      if(old.attempts?.n06)assert.deepEqual(archive.attempt,old.attempts.n06);
      if(old.completed?.n06)assert.deepEqual(archive.completed,old.completed.n06);
      archived++;
    }
    for(const [level,attempt] of Object.entries(old.attempts||{})){
      if(level==='n06')continue;
      assert.ok(current.attempts[level],'An existing attempt must remain');
      assert.ok(current.attempts[level].revision>=attempt.revision);
      if(current.attempts[level].revision===attempt.revision)assert.deepEqual(current.attempts[level],attempt);
      attempts++;
    }
  }
}
const report={date:new Date().toISOString(),ownersPreserved:owners,profilesChecked:profiles,resultsPreserved:results,otherAttemptsPreserved:attempts,n06ArchivesVerified:archived,curriculumVersion:9,playerIdsOmitted:true,passed:true};
await writeFile('artifacts/save-upgrade-v09.json',JSON.stringify(report,null,2));console.log(report);
