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

test('choosing a SWEX monster copies only its base stats and identity, never equipment or the prior manual build',async()=>{
 const {selectQuickMonster}=await import('../src/core/quick-calculator.js');const base={hp:10000,atk:800,def:600,spd:108,cr:15,cd:50,res:15,acc:0},unit={id:71,master:13413,name:'Lushen',base,runeIds:[1,2,3,4,5,6],artifactIds:[90],sheetStats:{...base,spd:320},sets:[3,15]};const config={...quickConfig(13911),sets:[13,15],snapshotArtifactEffects:{artifactIds:[90]},sourceRuneCount:6,manual:{base,sheet:{...base,spd:320}}},before=structuredClone(unit),next=selectQuickMonster(config,unit);
 assert.equal(next.unitId,71);assert.equal(next.key,config.key);assert.deepEqual(next.manual.base,base);assert.deepEqual(next.manual.sheet,base);assert.deepEqual(next.sets,[]);assert.equal(next.snapshotArtifactEffects,undefined);assert.equal(next.sourceRuneCount,undefined);assert.equal(quickRuneSpeed(next),0);assert.equal(next.equipmentSource,'manual');assert.deepEqual(unit,before);assert.notEqual(next.manual.base,base);assert.notEqual(next.manual.sheet,base);
});

test('Bernard opener automatically supplies Galleon/Julie SPD targets with boost and speed buff, without equipping JSON runes',()=>{
 let t={...quickTeam('siege'),speedMode:'auto',configs:[quickConfig(11513,'Bernard'),quickConfig(19411,'Galleon'),quickConfig(13911,'Julie')]};t=updateQuickRuneSpeed(t,t.configs[0].key,228);const preview=quickPreview(t);assert.equal(preview.actors[0].spd,356);assert.equal(t.automaticSync.kind,'boost');assert.equal(t.syncAudit.safe,true);assert.deepEqual(preview.turns.filter(turn=>turn.key!=='quick-enemy').map(turn=>turn.key),t.configs.map(c=>c.key));assert.ok(t.configs.slice(1).every(c=>c.syncMinimum>c.manual.base.spd));assert.ok(preview.actors.slice(1).every(a=>a.spd>150));assert.equal(t.plannedRunes,undefined);
 const before=preview.actors.slice(1).map(a=>a.spd);t=updateQuickRuneSpeed(t,t.configs[0].key,250);assert.ok(quickPreview(t).actors.slice(1).every((a,i)=>a.spd>=before[i]));assert.ok(t.configs.slice(1).every(c=>c.syncMinimum!==null));
 const independent=autoTuneQuickTeam({...t,speedMode:'free'});assert.ok(independent.configs.every(c=>c.syncMinimum==null&&c.autoSpeed===false));
});
