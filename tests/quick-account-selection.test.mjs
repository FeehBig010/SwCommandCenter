import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,freeFrom} from './fixtures/attack-tradeoffs.mjs';
import {quickTeam,autoTuneQuickTeam} from '../src/core/quick-calculator.js';
import {quickTeamFromPreset} from '../src/core/quick-presets.js';
import {optimizerSyncHandoff,applyQuickSyncGoals} from '../src/core/quick-optimizer-plan.js';
import {cleanAccountPayload,restoreAccountPayload} from '../src/core/clean-account-payload.js';
const selection=await import('../src/core/quick-account-selection.js').catch(()=>({}));
function accountFixture(){const {account}=fixture();account.units.forEach(u=>u.stars=6);account.units[1].master=account.units[0].master;account.units[1].name=account.units[0].name;account.units[0].skillLevels=[{slot:1,level:2},{slot:3,level:5}];account.units[1].skillLevels=[{slot:1,level:1},{slot:3,level:2}];return account;}

test('owned selection exposes exact copies while catalog selection never attaches an instance',()=>{
 assert.equal(typeof selection.quickMonsterChoices,'function');const account=accountFixture(),before=structuredClone(account);
 const owned=selection.quickMonsterChoices(account,'owned');assert.equal(owned.length,3);assert.deepEqual(owned.slice(0,2).map(o=>o.value),['unit:1','unit:2']);assert.equal(owned[0].unitId,1);assert.match(owned[1].detail,/#2/);
 const all=selection.quickMonsterChoices(account,'all');assert.ok(all.length>3);const matching=all.find(o=>o.master===13413);assert.equal(matching.owned,true);assert.equal(matching.unitId,undefined);assert.equal(matching.id,undefined);assert.ok(all.some(o=>o.owned===false&&o.detail==='Não possuído'));assert.deepEqual(selection.quickMonsterChoices(null,'owned'),[]);assert.deepEqual(account,before);
});
test('explicit owned selection loads real sheets and skill levels without retuning copies or mutating SWEX',()=>{
 assert.equal(typeof selection.quickAccountSelection,'function');const account=accountFixture(),team=quickTeam(),key=team.configs[0].key,before=structuredClone({account,team});
 const next=selection.quickAccountSelection(team,key,1,account),c=next.configs[0];assert.equal(next.speedMode,'snapshot');assert.equal(c.unitId,1);assert.equal(c.manual.sheet.spd,316);assert.deepEqual(c.skillLevels,[{slot:1,level:2},{slot:3,level:5}]);assert.equal(c.skillLevelSource,'swex');assert.equal(c.equipmentSource,'swex-main');assert.deepEqual(c.sourceMissing,[]);assert.deepEqual(next.plannedRunes.byConfig[key],[1,2,3,4,5,6]);
 const two=selection.quickAccountSelection(next,next.configs[1].key,2,account);assert.equal(two.configs[1].manual.sheet.spd,305);assert.equal(two.configs[1].skillLevels[1].level,2);assert.equal(autoTuneQuickTeam(two).configs[0].manual.sheet.spd,316);
 two.configs[0].skillLevels[0].level=50;assert.deepEqual({account,team},before);assert.throws(()=>selection.quickAccountSelection(next,next.configs[1].key,1,account),/cópia|selecionad/i);assert.throws(()=>selection.quickAccountSelection(team,key,999,account),/conta|unidade/i);
});
test('RTA assignment and explicit preset equipment remain isolated from main gear; absent RTA assignments are reported',()=>{
 assert.equal(typeof selection.quickAccountSelection,'function');const account=accountFixture();freeFrom(account,1,{spd:9});account.equipmentPools={rta:{assignments:{1:[101,2,3,4,5,6]}}};const rta=quickTeam('rta');
 const loaded=selection.quickAccountSelection(rta,rta.configs[0].key,1,account);assert.equal(loaded.configs[0].manual.sheet.spd,325);assert.equal(loaded.configs[0].equipmentSource,'swex-rta');
 const missing=selection.quickAccountSelection(rta,rta.configs[1].key,2,account);assert.equal(missing.configs[1].manual.sheet.spd,100);assert.ok(missing.configs[1].sourceMissing.includes('rta-assignment'));assert.deepEqual(missing.plannedRunes.byConfig[rta.configs[1].key],[]);
 account.accountPresets=[{id:'rta-exact',gameMode:'rta',unitIds:[1],equipment:[{unitId:1,runeIds:[1,2,3,4,5,6],artifactIds:[]}]}];
 const preset=selection.quickAccountSelection(rta,rta.configs[0].key,1,account,{presetId:'rta-exact'});assert.equal(preset.configs[0].manual.sheet.spd,316);assert.equal(preset.configs[0].equipmentSource,'swex-preset');assert.deepEqual(account.units[0].runeIds,[1,2,3,4,5,6]);
 assert.throws(()=>selection.quickAccountSelection(quickTeam('siege'),quickTeam().configs[0].key,1,account,{presetId:'rta-exact'}),/slot|context|área|preset/i);
});
test('known missing equipment is signaled instead of replaced; absent skill data stays unknown',()=>{
 assert.equal(typeof selection.quickAccountSelection,'function');const account=accountFixture(),team=quickTeam();account.units[2].runeIds=[999];const next=selection.quickAccountSelection(team,team.configs[0].key,3,account);const c=next.configs[0];assert.ok(c.sourceMissing.includes('rune:999'));assert.ok(c.sourceMissing.includes('incomplete-runes'));assert.equal(c.sourceRuneCount,0);assert.deepEqual(c.skillLevels,[]);assert.equal(c.skillLevelSource,'unknown');
});
test('preset and optimizer snapshots copy normalized skill levels without expanding SPD return permissions',()=>{
 const account=accountFixture();account.units[0].skillLevels.push({slot:2,level:0,secret:'SECRET'});const {team}=fixture();account.accountPresets=[{id:'skills',gameMode:'siege',unitIds:[1,2,3]}];const preset=quickTeamFromPreset(account.accountPresets[0],account);
 assert.deepEqual(preset.configs[0].skillLevels,[{slot:1,level:2},{slot:3,level:5}]);assert.equal(preset.configs[2].skillLevelSource,'unknown');
 const handoff=optimizerSyncHandoff(team,account);assert.deepEqual(handoff.team.configs[0].skillLevels,[{slot:1,level:2},{slot:3,level:5}]);const next=applyQuickSyncGoals(team,handoff.team,handoff,account);assert.equal(next.configs[0].skillLevels,undefined);assert.deepEqual(account.units[0].skillLevels[0],{slot:1,level:2});const changed=structuredClone(handoff.team);changed.configs[0].skillLevels[0].level=3;assert.throws(()=>applyQuickSyncGoals(team,changed,handoff,account),/context/i);
});
test('compact cloud backup preserves whitelisted per-copy skill levels and no arbitrary skill metadata',()=>{
 const account=accountFixture();account.units[0].skillLevels.push({slot:2,level:0,secret:'SECRET'},{slot:4,level:2,secret:'SECRET'});const before=structuredClone(account),payload=cleanAccountPayload(account);
 assert.deepEqual(payload.unit_list[0].skills,[{slot:1,level:2},{slot:3,level:5},{slot:4,level:2}]);assert.equal(payload.unit_list[2].skills,undefined);assert.ok(!JSON.stringify(payload).includes('SECRET'));assert.deepEqual(Object.keys(payload).sort(),['deck_list','defense_deck_list','runes','unit_list','world_arena_deck_list']);
 const restored=restoreAccountPayload(payload,'owner',{id:account.id});assert.deepEqual(restored.units[0].skillLevels,payload.unit_list[0].skills);assert.deepEqual(restored.units[1].skillLevels,account.units[1].skillLevels);assert.deepEqual(account,before);
});

test('owned equipment uses explicit artifact context and never borrows main artifacts for unknown RTA context',()=>{
 const account=accountFixture();account.artifacts=[{id:1000,owner:1,type:1,level:15,main:[100,1000],subs:[]}];account.units[0].artifactIds=[1000];const team=quickTeam(),key=team.configs[0].key;
 const main=selection.quickAccountSelection(team,key,1,account);assert.equal(main.configs[0].manual.sheet.hp,24548);
 const disabled=selection.quickAccountSelection(team,key,1,account,{options:{artifacts:false}});assert.equal(disabled.configs[0].manual.sheet.hp,23548);
 const rta=quickTeam('rta'),unknown=selection.quickAccountSelection(rta,rta.configs[0].key,1,account);assert.equal(unknown.configs[0].manual.sheet.hp,10000);assert.ok(unknown.configs[0].sourceMissing.includes('rta-artifact-assignment'));
});
test('foreign account and foreign Arena context cannot supply a selected snapshot',()=>{
 const account=accountFixture(),team=quickTeam('arena');team.arenaContext='regular';const key=team.configs[0].key;
 assert.throws(()=>selection.quickAccountSelection({...team,sourceAccountId:'another'},key,1,account),/outra conta/i);
 account.accountPresets=[{id:'foreign',gameMode:'arena',arenaContext:'interserver',unitIds:[1]}];assert.throws(()=>selection.quickAccountSelection(team,key,1,account,{presetId:'foreign'}),/context/i);
});
