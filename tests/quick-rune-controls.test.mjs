import test from 'node:test';
import assert from 'node:assert/strict';
import {quickTeam,quickConfig,autoTuneQuickTeam,quickRuneSpeed,quickSwiftBonus,updateQuickRuneSpeed,updateQuickRuneSets,toggleQuickSwift,quickPreview,quickSpeedTarget} from '../src/core/quick-calculator.js';
function team(){const t=quickTeam('siege');t.configs=[13413,13911,19614].map((id,i)=>({...quickConfig(id,`M${i}`),key:`slot-${i}`}));return autoTuneQuickTeam(t);}
test('rune SPD and Swift map to the stored sheet exactly once, without changing the combat engine',()=>{
 let t=team(),key=t.configs[0].key;t=updateQuickRuneSpeed(t,key,120);const base=t.configs[0].manual.base.spd,bonus=Math.ceil(base*.25);assert.equal(t.configs[0].manual.sheet.spd,base+120);
 t=toggleQuickSwift(t,key,true);assert.equal(quickSwiftBonus(t.configs[0]),bonus);assert.equal(quickRuneSpeed(t.configs[0]),120);assert.equal(t.configs[0].manual.sheet.spd,base+120+bonus);
 assert.equal(quickPreview(t).actors[0].spd,base+120+bonus+Math.ceil(base*.15));const old=structuredClone(t);t=toggleQuickSwift(t,key,true);assert.equal(t.configs[0].manual.sheet.spd,old.configs[0].manual.sheet.spd);
 t=toggleQuickSwift(t,key,false);assert.equal(t.configs[0].manual.sheet.spd,base+120);assert.equal(quickRuneSpeed(t.configs[0]),120);
});
test('artifacts and rune inversion remain separate from the Swift set bonus and preserve automatic one-point gaps',()=>{
 let t=toggleQuickSwift(updateQuickRuneSpeed(team(),'slot-0',180),'slot-0',true);t.configs[0].combat={artifactSpd:12};t=autoTuneQuickTeam(t);
 const target=quickSpeedTarget(t,t.configs[0]);assert.equal(target.runeSpd-quickSwiftBonus(t.configs[0]),180);assert.equal(target.combatSpd,quickPreview(t).actors[0].spd);
 const speeds=quickPreview(t).actors.map(a=>a.spd);assert.equal(speeds[0]-speeds[1],1);assert.equal(speeds[1]-speeds[2],1);
 const unchanged=updateQuickRuneSpeed(t,'slot-1',900);assert.deepEqual(unchanged.configs.map(c=>c.manual.sheet.spd),t.configs.map(c=>c.manual.sheet.spd));
});
test('set picker and Swift checkbox preserve rune contribution, replace incompatible four-piece sets, and never mutate the input',()=>{
 const t=updateQuickRuneSpeed(team(),'slot-0',150),before=structuredClone(t);const swift=updateQuickRuneSets(t,'slot-0',[3,15]);assert.deepEqual(t,before);assert.equal(quickRuneSpeed(swift.configs[0]),150);
 const violent=updateQuickRuneSets(swift,'slot-0',[13,15]);assert.equal(quickRuneSpeed(violent.configs[0]),150);assert.equal(violent.configs[0].manual.sheet.spd,t.configs[0].manual.sheet.spd);
 const again=toggleQuickSwift(violent,'slot-0',true);assert.deepEqual(again.configs[0].sets,[3,15]);assert.equal(quickRuneSpeed(again.configs[0]),150);
 assert.equal(updateQuickRuneSpeed(t,'slot-0',-1),t);assert.equal(updateQuickRuneSpeed(t,'slot-0','invalid'),t);
});
