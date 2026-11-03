import test from 'node:test';
import assert from 'node:assert/strict';
import {quickPresetAccount} from './fixtures/quick-presets.mjs';
import {quickTeamFromPreset,quickPresetChoices,quickPresetArea} from '../src/core/quick-presets.js';
import {quickTeam,autoTuneQuickTeam,quickPreview,quickSpeedTarget,quickRuneSpeed,quickOrderLocked,updateQuickRuneSpeed} from '../src/core/quick-calculator.js';
import {hydrateAccountPresets} from '../src/core/account-teams.js';
import {createInfographic} from '../src/core/export-infographic.js';

for(const [area,count] of [['siege',3],['arena',4],['cairos',5],['rta',4],['rift',6],['dimensional',4],['toa',5]])test(`fresh ${area} calculator contains ${count} empty slots`,()=>{
 const team=autoTuneQuickTeam(quickTeam(area));assert.equal(team.configs.length,count);assert.ok(team.configs.every(c=>c.masterId==null&&c.unitId==null));assert.equal(quickPreview(team).complete,false);
});
test('every SWEX area preserves native size, leader, equipped sheet and original speed order',()=>{
 const account=quickPresetAccount(),before=structuredClone(account),hydrated=hydrateAccountPresets(account);
 for(const [index,preset]of account.accountPresets.entries()){
  const team=quickTeamFromPreset(preset,account),next=autoTuneQuickTeam(team),expected=hydrated[index];
  assert.equal(team.configs.length,expected.unitIds.length);assert.equal(team.speedMode,'snapshot');assert.equal(quickOrderLocked(team),false);assert.equal(team.leaderIndex,preset.leaderIndex);
  assert.equal(team.sourceDeckId,preset.id);assert.equal(team.sourceAccountId,account.id);
  for(let slot=0;slot<team.configs.length;slot++){
   const c=team.configs[slot],member=expected.members[slot];
   if(!member){assert.equal(c.masterId,null);assert.equal(c.enabled,false);continue;}
   assert.equal(c.unitId,member.id);assert.equal(c.masterId,member.master);assert.deepEqual(c.manual.sheet,member.sheetStats);assert.deepEqual(c.goals,member.sheetStats);
   assert.equal(next.configs[slot].manual.sheet.spd,member.sheetStats.spd);assert.equal(quickSpeedTarget(next,next.configs[slot]).combatSpd,member.combat_spd);
  }
  const preview=quickPreview(next,{includeReference:false,captureReadiness:true});assert.equal(preview.complete,true);
  assert.deepEqual(preview.actors.map(a=>a.spd),expected.members.filter(Boolean).map(m=>m.combat_spd));
 }
 assert.deepEqual(account,before);
});
test('native RTA rune assignments and saved preset equipment override main equipment without mutating either pool',()=>{
 const account=quickPresetAccount(),rta=account.accountPresets.find(p=>p.gameMode==='rta');
 const imported=quickTeamFromPreset(rta,account);assert.equal(imported.configs[0].manual.sheet.spd,100+1+Math.ceil(101*.25)+24+10);
 assert.deepEqual(imported.plannedRunes.byConfig[imported.configs[0].key],[106,107,108,109,110,111]);
 const main=account.units[1].runeIds.slice(),p={...account.accountPresets[0],equipment:[{unitId:1,runeIds:[100,101,102,103,104,105],artifactIds:[]}]};
 const saved=quickTeamFromPreset(p,account);assert.deepEqual(saved.plannedRunes.byConfig[saved.configs[0].key],p.equipment[0].runeIds);assert.deepEqual(saved.configs[0].sets,[3,15]);assert.deepEqual(account.units[1].runeIds,main);
});
test('JSON verification permits independent edits; explicit tune works on a copy and loading again restores the source',()=>{
 const a=quickPresetAccount(),preset=a.accountPresets[0],team=quickTeamFromPreset(preset,a),before=structuredClone(team);
 const changed=updateQuickRuneSpeed(team,team.configs[1].key,200);assert.equal(quickRuneSpeed(changed.configs[1]),200);assert.deepEqual(team,before);
 const tuned=autoTuneQuickTeam({...team,speedMode:'auto'});assert.equal(quickOrderLocked(tuned),true);assert.ok(tuned.configs.slice(1).every(c=>c.autoSpeed));assert.deepEqual(team,before);
 assert.deepEqual(quickTeamFromPreset(preset,a).configs.map(c=>c.manual.sheet),before.configs.map(c=>c.manual.sheet));
});
test('JSON conditional artifact effects are counted once and agree with exported combat speeds',()=>{
 const a=quickPresetAccount(),team=quickTeamFromPreset(a.accountPresets[0],a),first=team.configs[0];
 first.combat={speedBuff:true,hpPercent:50};const actual=quickSpeedTarget(team,first).combatSpd;
 const raw=first.manual.sheet.spd+Math.ceil(first.manual.base.spd*(10+5+24)/100);
 assert.equal(actual,Math.ceil(raw*(1+.3*1.12)*1.04-1e-10));
 assert.equal(createInfographic(team,a).monsters[0].combatSpd,actual);
 const noArtifacts=quickTeamFromPreset({...a.accountPresets[0],equipment:[{unitId:1,runeIds:a.units[0].runeIds,artifactIds:[]}]},a);assert.equal(noArtifacts.configs[0].snapshotArtifactEffects.totals.spdBuff,undefined);
});
test('empty/null slots and absent artifact inventory remain valid and do not move the leader',()=>{
 const a=quickPresetAccount();a.artifacts=[];const preset={...a.accountPresets[0],unitIds:[null,9999,1],leaderIndex:2};const team=quickTeamFromPreset(preset,a);
 assert.equal(team.configs.length,3);assert.deepEqual(team.configs.map(c=>c.unitId),[null,null,1]);assert.equal(team.leaderKey,team.configs[2].key);assert.equal(quickPreview(team).actors.length,1);
 assert.throws(()=>quickTeamFromPreset(preset,null),/Importe/);assert.throws(()=>quickTeamFromPreset({...preset,unitIds:null},a),/formação válida/);
});
test('preset search spans areas, accented dungeon names, monsters and both Arena contexts',()=>{
 const a=quickPresetAccount(),presets=hydrateAccountPresets(a);assert.equal(quickPresetChoices(presets,'dragao')[0].id,'qa-dragao');assert.equal(quickPresetChoices(presets,'sacreon')[0].id,'qa-dimensao');
 assert.ok(quickPresetChoices(presets,'Tiana').length>1);assert.equal(quickPresetChoices(presets,'interserver')[0].id,'qa-interserver');assert.equal(quickPresetArea(presets[1]),'Arena Regular');assert.equal(quickPresetArea(presets[2]),'Arena Interserver');assert.deepEqual(quickPresetChoices(presets,'inexistente'),[]);
});
