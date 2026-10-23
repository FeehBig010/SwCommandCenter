import test from 'node:test';
import assert from 'node:assert/strict';
import {quickTeam,quickConfig,quickOrderLocked,autoTuneQuickTeam,quickPreview,updateQuickSheetSpeed,quickSpeedTarget} from '../src/core/quick-calculator.js';
import {firstRotationSafe,automaticSyncStrategy} from '../src/core/speedTuner.js';
import {monsterOpener} from '../src/core/monsterDatabase.js';

function team(area='arena',master=14412){
 const t=quickTeam(area);t.configs=t.configs.map((_,i)=>quickConfig(i?13413:master,i?`Follower ${i}`:'Opener'));
 for(const c of t.configs){c.manual.base.spd=100;c.manual.sheet.spd=385;}
 return t;
}
function assertStrict(t,{safe=true}={}){
 assert.equal(t.automaticSync.kind,'strict');assert.equal(t.syncAudit.representable,true);assert.equal(t.syncAudit.safe,safe);
 const p=quickPreview(t);for(let i=1;i<t.configs.length;i++)assert.equal(p.actors[i-1].spd-p.actors[i].spd,1);
 if(safe)assert.ok(firstRotationSafe(p.scenario,t.configs.map(c=>c.key)));
 assert.ok(p.turns.every(t=>Number.isInteger(t.tick)));
}

test('native 3/4/5-slot and legacy advanced plans automatically use the opener-anchored ladder',()=>{
 for(const area of ['siege','arena','cairos']){
  const input=team(area);input.orderMode='advanced';input.perfectTune=false;input.autoOpener=false;input.configs.forEach(c=>c.autoSpeed=false);
  const before=structuredClone(input),out=autoTuneQuickTeam(input);assertStrict(out);assert.equal(out.orderMode,'auto');assert.equal(quickOrderLocked(out),true);
  assert.deepEqual(quickPreview(out).actors.map(a=>a.spd),Array.from({length:out.configs.length},(_,i)=>400-i));
  assert.deepEqual(out.configs.map(c=>c.key),input.configs.map(c=>c.key));assert.deepEqual(input,before);
 }
});

test('database detects Bernard 30 and Bastet 25 without inventing boosts for a stripper or conditional passive',()=>{
 assert.equal(monsterOpener(11513).boost,30);assert.equal(monsterOpener(20511).boost,25);
 for(const master of [14412,26811,14712,99991])assert.equal(automaticSyncStrategy(team('arena',master)).kind,'strict');
 for(const [master,targets] of [[20511,[348,348,348]],[11513,[300,300,300]],[18913,[338,338,338]]]){
  const t=autoTuneQuickTeam(team('arena',master)),p=quickPreview(t);assert.equal(t.automaticSync.kind,'boost');assert.equal(t.syncAudit.safe,true);assert.equal(p.referenceEnemy,399);
  assert.deepEqual(p.actors.slice(1).map(a=>a.spd),targets);assert.ok(firstRotationSafe(p.scenario,t.configs.map(c=>c.key)));
  const event=p.scenario.log.find(e=>e.type==='boost'||e.type==='tiana');assert.equal(event.amount,monsterOpener(master).boost);
  for(let i=1;i<4;i++){const probe=structuredClone(t);probe.configs[i].manual.sheet.spd--;assert.equal(firstRotationSafe(quickPreview(probe).scenario,t.configs.map(c=>c.key)),false);}
 }
});

test('master changes retune automatically and follower edits cannot bypass either strategy',()=>{
 for(const master of [14412,20511]){
  let t=autoTuneQuickTeam(team('arena',master));const keys=t.configs.map(c=>c.key);
  assert.equal(updateQuickSheetSpeed(t,t.configs[2].key,999,false),t);
  for(const value of [435,285,385]){t=updateQuickSheetSpeed(t,t.configs[0].key,value);assert.equal(t.syncAudit.safe,true);assert.deepEqual(t.configs.map(c=>c.key),keys);assert.ok(t.configs.slice(1).every(c=>c.manual.sheet.spd===c.syncMinimum));if(master===14412)assertStrict(t);}
  t.configs[0].masterId=master===14412?20511:14412;t=autoTuneQuickTeam(t);assert.equal(t.automaticSync.kind,master===14412?'boost':'strict');assert.equal(t.syncAudit.safe,true);
 }
});

test('strict rune inversion subtracts artifacts exactly once with base, leader and SPD buff',()=>{
 const input=team();input.configs[0].manual.sheet.spd=364;input.leader={stat:'spd',value:24,scope:'general'};
 input.configs.slice(1).forEach(c=>c.combat={speedBuff:true});
 const plain=autoTuneQuickTeam(input);assertStrict(plain);assert.deepEqual(quickPreview(plain).actors.map(a=>a.spd),[403,402,401,400]);
 input.configs[2].combat={...input.configs[2].combat,artifactSpd:20};const withArtifact=autoTuneQuickTeam(input);assertStrict(withArtifact);
 const a=quickSpeedTarget(plain,plain.configs[2]),b=quickSpeedTarget(withArtifact,withArtifact.configs[2]);assert.equal(a.runeSpd-b.runeSpd,20);assert.equal(a.combatSpd,b.combatSpd);assert.equal(b.combatSpd,401);
 assert.equal(quickPreview(withArtifact).turns.find(t=>t.key===withArtifact.configs[2].key).spd,401);
});

test('a faster opponent warns about cuts while strict targets remain exactly anchored',()=>{
 const input=team();input.enemyCombatSpd=999;const out=autoTuneQuickTeam(input);assertStrict(out,{safe:false});assert.equal(quickPreview(out).cut,true);
 assert.deepEqual(out.configs.slice(1).map(c=>c.syncCombatTarget),[399,398,397]);assert.ok(out.configs.slice(1).every(c=>c.syncMinimum!=null));
 const boosted=team('arena',20511);boosted.enemyCombatSpd=999;const original=structuredClone(boosted),failed=autoTuneQuickTeam(boosted);assert.equal(failed.syncAudit.safe,false);assert.ok(failed.configs.slice(1).every(c=>c.syncMinimum===null));assert.deepEqual(failed.configs.map(c=>c.manual.sheet.spd),original.configs.map(c=>c.manual.sheet.spd));
});

test('unrepresentable exact targets, incomplete plans and invalid master input never retain safe badges',()=>{
 const input=team();input.configs.slice(1).forEach(c=>c.combat={speedBuff:true});const out=autoTuneQuickTeam(input);
 assert.equal(out.syncAudit.representable,false);assert.equal(out.syncAudit.safe,false);assert.ok(out.configs.slice(1).every(c=>c.syncMinimum===null));
 const partial=autoTuneQuickTeam(team());partial.configs[1].masterId=null;const empty=autoTuneQuickTeam(partial);assert.equal(empty.syncAudit,null);assert.ok(empty.configs.slice(1).every(c=>c.syncMinimum===null));
 const t=autoTuneQuickTeam(team());const invalid=updateQuickSheetSpeed(t,t.configs[0].key,'');assert.equal(invalid.syncAudit.safe,false);assert.ok(invalid.configs.slice(1).every(c=>c.syncMinimum===null));
});
