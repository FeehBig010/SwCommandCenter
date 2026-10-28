import test from 'node:test';
import assert from 'node:assert/strict';
import {optimizerTeamTelemetry} from '../src/core/optimizer-team-telemetry.js';
import {fixture,freeFrom} from './fixtures/attack-tradeoffs.mjs';
import {accountStamp} from '../src/core/loadouts.js';
test('list telemetry uses real combat SPD and first-turn order, never desired goals or a fabricated enemy',()=>{
 const {account,team}=fixture(),before=structuredClone(account),report=optimizerTeamTelemetry(account,team);
 assert.deepEqual(report.members.map(m=>m.spd),[331,320,309]);assert.equal(report.status,'unknown');assert.equal(report.label,'Sem referência');assert.match(report.reason,/inimigo desconhecido/);assert.deepEqual(account,before);
 assert.deepEqual(report.members.map(m=>m.key),report.preview.turns.filter(t=>!t.enemy).map(t=>t.key));assert.ok(report.members.every(m=>Number.isInteger(m.tick)));
});
test('synchronization badges distinguish a modeled safe rotation, a cut, disabled sync and reversed slot order',()=>{
 const {account,team}=fixture();assert.equal(optimizerTeamTelemetry(account,{...team,enemyCombatSpd:100}).status,'synced');
 assert.equal(optimizerTeamTelemetry(account,{...team,enemyCombatSpd:326}).status,'risk');
 assert.equal(optimizerTeamTelemetry(account,{...team,optimizerSpeedSync:false}).status,'free');
 const reversed={...team,configs:[...team.configs].reverse()};const report=optimizerTeamTelemetry(account,reversed);assert.equal(report.status,'risk');assert.equal(report.members[0].name,'Lushen');
});
test('incomplete equipment, missing units, duplicate copies and no active monsters never report synchronized',()=>{
 const {account,team}=fixture();const missing=structuredClone(account);missing.runes=missing.runes.filter(r=>r.id!==1);assert.equal(optimizerTeamTelemetry(missing,team).status,'pending');
 const duplicate={...team,configs:team.configs.map((c,i)=>i===1?{...c,unitId:1}:c)};assert.equal(optimizerTeamTelemetry(account,duplicate).status,'pending');
 assert.equal(optimizerTeamTelemetry(null,team).status,'pending');assert.equal(optimizerTeamTelemetry(account,{...team,configs:[]}).status,'pending');
});
test('preset snapshots and local plans are resolved exactly; unrelated team results cannot change the row',()=>{
 const {account,team}=fixture();freeFrom(account,1,{spd:8});const runeIds=[101,...account.units[0].runeIds.slice(1)];
 account.accountPresets=[{id:'preset',gameMode:'siege',unitIds:[1,2,3],equipment:[{unitId:1,runeIds,artifactIds:[]}]}];team.sourceDeckId='preset';team.sourceAccountId=account.id;
 const before=structuredClone(account);assert.equal(optimizerTeamTelemetry(account,team).members[0].spd,339);assert.deepEqual(account,before);
 const planned={...team,plannedRunes:{accountStamp:accountStamp(account),byConfig:{[team.configs[0].key]:account.units[0].runeIds}}};assert.equal(optimizerTeamTelemetry(account,planned).members[0].spd,331);
 const wrong=[{teamId:'unrelated',key:team.configs[0].key,unitId:1,stats:{combat:{spd:999}}}];assert.equal(optimizerTeamTelemetry(account,team,{},wrong).members[0].spd,339);
});
