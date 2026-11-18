import test from 'node:test';
import assert from 'node:assert/strict';
import * as bridge from '../src/core/quick-optimizer-plan.js';
import {fixture,freeFrom} from './fixtures/attack-tradeoffs.mjs';
import {accountStamp} from '../src/core/loadouts.js';
import {prepareOptimizerTeam} from '../src/core/optimizer-context.js';
import {equippedBuild} from '../src/core/optimizer.js';
import {quickPreview,autoTuneQuickTeam} from '../src/core/quick-calculator.js';

test('optimizer handoff is a detached snapshot of exact copies, selected loadout and combat context',()=>{
 assert.equal(typeof bridge.optimizerSyncHandoff,'function');
 const {account,team}=fixture();freeFrom(account,1,{spd:10});
 team.sourceDeckId='native';team.sourceAccountId=account.id;account.accountPresets=[{id:'native',gameMode:'siege',unitIds:[1,2,3],equipment:[{unitId:1,runeIds:[101,...account.units[0].runeIds.slice(1)],artifactIds:[]}]}];
 team.combatScenario={enemies:[{key:'enemy',name:'Inimigo',spd:250}],events:[]};team.configs[1].combat={speedBuff:true};
 const before=structuredClone({account,team}),handoff=bridge.optimizerSyncHandoff(team,account);
 assert.equal(handoff.sourceTeamId,team.id);assert.equal(handoff.accountStamp,accountStamp(account));assert.equal(handoff.returnArea,'siege');assert.ok(handoff.token);
 assert.equal(handoff.team.speedMode,'snapshot');assert.deepEqual(handoff.team.configs.map(c=>[c.key,c.unitId]),team.configs.map(c=>[c.key,c.unitId]));
 assert.equal(handoff.team.configs[0].manual.sheet.spd,326);assert.deepEqual(handoff.team.plannedRunes.byConfig[team.configs[0].key],[101,2,3,4,5,6]);assert.deepEqual(handoff.team.combatScenario,team.combatScenario);assert.deepEqual(handoff.team.configs[1].combat,team.configs[1].combat);
 assert.equal(quickPreview(handoff.team,{includeReference:false}).actors[0].spd,341);assert.deepEqual(autoTuneQuickTeam(handoff.team).configs.map(c=>c.manual.sheet),handoff.team.configs.map(c=>c.manual.sheet));
 handoff.team.configs[0].manual.sheet.spd=999;assert.deepEqual({account,team},before);
});
test('handoff resolves local plans before preset gear and filters selected builds by exact team, key and copy',()=>{
 assert.equal(typeof bridge.optimizerSyncHandoff,'function');
 const {account,team}=fixture();freeFrom(account,1,{spd:8});team.plannedRunes={accountStamp:accountStamp(account),byConfig:{[team.configs[0].key]:[101,...account.units[0].runeIds.slice(1)]}};
 const actual=equippedBuild(account,prepareOptimizerTeam(team),team.configs[0]);assert.equal(bridge.optimizerSyncHandoff(team,account).team.configs[0].manual.sheet.spd,324);
 const other={...actual,teamId:'other',stats:{...actual.stats,total:{...actual.stats.total,spd:900}}};assert.equal(bridge.optimizerSyncHandoff(team,account,{},[other]).team.configs[0].manual.sheet.spd,324);
 const chosen={...actual,teamId:team.id,stats:{...actual.stats,total:{...actual.stats.total,spd:330}}};assert.equal(bridge.optimizerSyncHandoff(team,account,{},[chosen]).team.configs[0].manual.sheet.spd,330);
});
test('explicit return changes only SPD goals in original basis, maps reordered cards by key and preserves every constraint and gear',()=>{
 assert.equal(typeof bridge.applyQuickSyncGoals,'function');
 const {account,team}=fixture();team.configs[0].basis='bonus';team.configs[1].basis='total';team.configs[0].combatSpd=350;team.configs[0].maxTick=6;
 team.target_goals={preserve:'exact'};team.plannedRunes={accountStamp:accountStamp(account),byConfig:{}};
 const before=structuredClone({account,team}),handoff=bridge.optimizerSyncHandoff(team,account),quick=structuredClone(handoff.team);
 quick.configs.forEach((c,i)=>{c.manual.sheet.spd=250+i;c.goals.spd=999;});quick.configs.reverse();
 const returned=bridge.applyQuickSyncGoals(team,quick,handoff,account);
 assert.equal(returned.id,team.id);assert.equal(returned.configs[0].goals.spd,150);assert.equal(returned.configs[1].goals.spd,251);
 const expected=structuredClone(team);expected.configs.forEach((c,i)=>c.goals.spd=c.basis==='bonus'?150+i:250+i);assert.deepEqual(returned,expected);assert.deepEqual({account,team},before);
});
test('return rejects reimported accounts, stale source composition/context and calculator composition/context changes',()=>{
 assert.equal(typeof bridge.applyQuickSyncGoals,'function');
 const {account,team}=fixture(),handoff=bridge.optimizerSyncHandoff(team,account),quick=handoff.team;
 assert.throws(()=>bridge.applyQuickSyncGoals(team,quick,handoff,{...account,importedAt:'later'}),/atualiz|desatualiz|conta/i);
 for(const modify of [t=>t.configs[0].unitId=999,t=>t.gameMode='arena',t=>t.enemyCombatSpd=999,t=>t.configs[0].combat={speedBuff:true}]){
  const changed=structuredClone(team);modify(changed);assert.throws(()=>bridge.applyQuickSyncGoals(changed,quick,handoff,account),/composi|context|origem/i);
 }
 for(const modify of [t=>t.configs[0].unitId=999,t=>t.arenaContext='interserver',t=>t.towerSpd=0,t=>t.configs[0].sets=[3],t=>t.leader={stat:'spd',scope:'general',value:24}]){
  const changed=structuredClone(quick);modify(changed);assert.throws(()=>bridge.applyQuickSyncGoals(team,changed,handoff,account),/composi|context|origem/i);
 }
 const invalid=structuredClone(quick);invalid.configs[0].manual.sheet.spd=NaN;assert.throws(()=>bridge.applyQuickSyncGoals(team,invalid,handoff,account),/SPD|velocidade/i);
});
test('Arena Interserver context and non-first leader survive snapshot and return',()=>{
 assert.equal(typeof bridge.optimizerSyncHandoff,'function');
 const {account,team}=fixture();team.gameMode='arena';team.arenaContext='interserver';team.leaderIndex=1;team.configs[1].masterId=24511;account.units[1].master=24511;
 const handoff=bridge.optimizerSyncHandoff(team,account);assert.equal(handoff.returnArenaContext,'interserver');assert.equal(handoff.team.leaderKey,team.configs[1].key);assert.equal(handoff.team.leader.value,24);
 assert.equal(bridge.applyQuickSyncGoals(team,handoff.team,handoff,account).arenaContext,'interserver');
});
test('incomplete equipment and missing copies do not invent a calculator sheet',()=>{
 assert.equal(typeof bridge.optimizerSyncHandoff,'function');const {account,team}=fixture();
 assert.throws(()=>bridge.optimizerSyncHandoff(team,null),/SWEX|conta/i);account.runes.pop();assert.throws(()=>bridge.optimizerSyncHandoff(team,account),/equipamento|runas/i);
});
test('handoff carries known Siege enemy speeds without inventing unknown or tick-only speeds',()=>{
 const {account,team}=fixture();team.enemyDefense=[{masterId:13413,label:'Defensor conhecido',combatSpd:400},{masterId:13911,label:'Somente tick',maxTick:6},{masterId:19614,label:'Desconhecido'}];
 const handoff=bridge.optimizerSyncHandoff(team,account),preview=quickPreview(handoff.team,{includeReference:false});
 assert.equal(preview.turns.find(t=>t.enemy)?.spd,400);assert.equal(handoff.team.combatScenario.enemies.length,1);
 const explicit=structuredClone(team);explicit.combatScenario={enemies:[{master:13413,label:'Defesa explícita',spd:380}],events:[]};assert.equal(bridge.optimizerSyncHandoff(explicit,account).team.combatScenario.enemies.length,1);
});
test('disabled empty slots do not block real active-member verification or receive goals',()=>{
 const {account,team}=fixture();team.configs[2]={...team.configs[2],enabled:false,unitId:null,masterId:null};
 const handoff=bridge.optimizerSyncHandoff(team,account);assert.equal(quickPreview(handoff.team).complete,true);assert.equal(handoff.team.configs[2].enabled,false);
 assert.deepEqual(bridge.applyQuickSyncGoals(team,handoff.team,handoff,account).configs[2],team.configs[2]);
});
test('a changed planned loadout invalidates an existing verification',()=>{
 const {account,team}=fixture(),handoff=bridge.optimizerSyncHandoff(team,account);freeFrom(account,1,{spd:8});team.plannedRunes={accountStamp:accountStamp(account),byConfig:{[team.configs[0].key]:[101,...account.units[0].runeIds.slice(1)]}};
 assert.throws(()=>bridge.applyQuickSyncGoals(team,handoff.team,handoff,account),/context|origem|equipamento/i);
});
test('only a handoff belonging to the current imported account may be rendered',()=>{
 assert.equal(typeof bridge.activeSyncHandoff,'function');const {account,team}=fixture(),handoff=bridge.optimizerSyncHandoff(team,account);
 assert.equal(bridge.activeSyncHandoff(handoff,account),handoff);assert.equal(bridge.activeSyncHandoff(handoff,{...account,importedAt:'later'}),null);assert.equal(bridge.activeSyncHandoff(handoff,null),null);
});
