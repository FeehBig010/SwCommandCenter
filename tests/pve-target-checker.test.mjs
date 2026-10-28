import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {checkPveTargets,pveStaticRequirements} from '../src/core/pve-target-checker.js';
import {pveStageIcon} from '../src/core/pve-stages.js';
import {fixture,freeFrom} from './fixtures/attack-tradeoffs.mjs';
const prepared=()=>{const value=fixture();value.team.gameMode='cairos';value.team.configs.forEach(c=>{c.goals={};c.basis='total';});return value;};
test('PvE checks equipped sheet stats and static caps without tower, guild, leader, tick or grind compensation',()=>{
 const {account,team}=prepared(),before=structuredClone(account);
 assert.deepEqual(pveStaticRequirements('gbah'),{accuracy:35,speed:120});
 const actual=checkPveTargets(account,team,'dbah');assert.equal(actual.members[0].stats.spd,316);assert.equal(actual.members[0].checks.find(g=>g.stat==='acc').target,65);
 const boosted={...team,towerSpd:100,guildSpd:100,leaderSpd:100,enemyCombatSpd:1000,combatScenario:{events:[{type:'boost',value:100}]}};
 assert.deepEqual(checkPveTargets(account,boosted,'dbah',{maxGrindsGems:true}),actual);assert.deepEqual(account,before);
 team.configs.forEach(c=>c.requireAccuracy=false);assert.equal(checkPveTargets(account,team,'dbah').met,true);
});
test('PvE respects preset equipment and selected plans; partial, repeated and missing equipment never passes',()=>{
 const {account,team}=prepared(),rune=freeFrom(account,1,{spd:8});
 account.accountPresets=[{id:'pve',equipment:[{unitId:1,runeIds:[rune.id,...account.units[0].runeIds.slice(1)],artifactIds:[]}]}];team.sourceDeckId='pve';
 assert.equal(checkPveTargets(account,team,'gbah').members[0].stats.spd,324);
 const missing=structuredClone(team);missing.configs[0].unitId=null;assert.equal(checkPveTargets(account,missing,'gbah').members[0].complete,false);
 const partial=structuredClone(account);partial.runes=partial.runes.filter(r=>r.id!==2);assert.equal(checkPveTargets(partial,team,'gbah').members[0].met,false);
 const repeated=structuredClone(team);repeated.configs[1].unitId=1;assert.match(checkPveTargets(account,repeated,'gbah').members[1].reason,/repetidas/);
 team.configs[0].goals={spd:325};assert.equal(checkPveTargets(account,team,'gbah').members[0].checks.find(g=>g.stat==='spd').missing,1);
});
test('PvE makes missing boss references explicit and does not call unconfigured goals a success',()=>{
 const {account,team}=prepared(),report=checkPveTargets(account,team,'karzhan-2a');assert.equal(report.hasReference,false);assert.equal(report.met,false);assert.ok(report.members.every(m=>!m.checks.length));
 team.configs[0].basis='bonus';team.configs[0].goals={spd:217};assert.equal(checkPveTargets(account,team,'karzhan-2a').members[0].checks[0].target,317);
 assert.equal(checkPveTargets(null,team,'gbah').met,false);
});
test('dimensional navigation uses distinct official guardian assets and the predator asset, without aliasing Sacreon to Karzhan',()=>{
 const source=JSON.parse(readFileSync(new URL('../public/game-icons/bosses/sources.json',import.meta.url),'utf8'));
 assert.equal(source.icons.karzhan,'unit_icon_0051_1_4.png');assert.equal(source.icons.ellunia,'unit_icon_0051_0_4.png');assert.equal(source.icons.sacreon,'unit_icon_0084_0_0.png');
 for(const name of ['karzhan','ellunia','lumel','khalderun','sacreon','inferath']){
  assert.equal(pveStageIcon(`${name}-runes`),name);assert.equal(pveStageIcon(`${name}-2a`),name);assert.ok(existsSync(new URL(`../public/game-icons/bosses/${name}.png`,import.meta.url)));
 }
 assert.equal(pveStageIcon('karzhan-predator'),'dimension-predator');assert.match(source.dimensional_provenance.inferath,/Generic official/);
});
