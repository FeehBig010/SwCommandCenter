import test from 'node:test';import assert from 'node:assert/strict';
import {combatAttributes,requiredSheetSpeed,normalizeCombat,simulateCombat} from '../src/core/speedTuner.js';
import {quickTeam,quickConfig,quickPreview,quickSpeedTarget,autoTuneQuickTeam} from '../src/core/quick-calculator.js';
import {goalSlider} from '../src/core/stat-goals.js';
import {resolveMonsterImageSources,monsterImageSources,MONSTER_FALLBACK} from '../src/core/monsters.js';
const unit={master:10914,element:4,base:{hp:10000,atk:800,def:650,spd:100,cr:15,cd:50,res:15,acc:0}},team={gameMode:'siege',sheetSpeedFormula:true,towerSpd:0};
test('rune-only inversion subtracts base and manual artifacts while respecting buffs and integer rounding',()=>{
 const combat={artifactSpd:10,speedBuff:true,artifactSpdBuff:20},stats={total:{...unit.base,spd:204}};
 assert.equal(combatAttributes(unit,stats,{},team,combat).spd,292);
 const sheet=requiredSheetSpeed(292,unit,team,combat);assert.equal(sheet,204);assert.equal(sheet-unit.base.spd,104);
 assert.equal(combatAttributes(unit,{total:{...unit.base,spd:sheet-1}},{},team,combat).spd,290);
});
test('manual artifact percentages combine once with equipped effects and require their combat conditions',()=>{
 const combat={artifactSpd:10,artifactSpdBuff:20,artifactSpdLostHp:10,artifactSpdDisabled:5,hpPercent:50};
 const effects={totals:{spdBuff:10,spdLostHp:20,spdDisabled:15}},stats={total:{...unit.base,spd:200}};
 assert.equal(combatAttributes(unit,stats,{},team,combat,effects).spd,242);
 const c={...combat,speedBuff:true,disabled:true},expected=Math.ceil(210*1.39*1.35-1e-10);
 assert.equal(combatAttributes(unit,stats,{},team,c,effects).spd,expected);
 assert.equal(normalizeCombat(c).artifactSpd,10);assert.throws(()=>normalizeCombat({artifactSpd:501}),/SPD adicional/);
});
test('scenario recomputation does not add artifact SPD twice',()=>{
 const combat={artifactSpd:10,speedBuff:true,artifactSpdBuff:20};
 const initial=combatAttributes(unit,{total:{...unit.base,spd:204}},{},team,combat);
 const simulated=simulateCombat([{key:'a',master:unit.master,spd:initial.spd,rawSpd:initial.rawSpd,combat}],{maxTurns:1});
 assert.equal(simulated.state[0].spd,292);assert.ok(Number.isInteger(simulated.turns[0].tick));
});
test('exact display inversion and conservative opener floors remain distinct at fractional boundaries',()=>{
 const u={...unit,base:{...unit.base,spd:102}},t={...team,towerSpd:15};
 assert.equal(requiredSheetSpeed(267,u,t),251);assert.equal(requiredSheetSpeed(267,u,t,{}, {}, {},{conservative:true}),252);
});
test('quick targets change view without changing tuning or double-counting base SPD',()=>{
 let t=quickTeam();t.configs=[18913,16512,16012].map((id,i)=>({...quickConfig(id),autoSpeed:i>0}));t.configs[0].manual.sheet.spd=300;t.configs[1].combat={artifactSpd:20};t=autoTuneQuickTeam(t);
 const preview=quickPreview(t);assert.equal(preview.complete,true);
 const target=quickSpeedTarget(t,t.configs[1]);assert.equal(target.runeSpd,t.configs[1].syncMinimum-t.configs[1].manual.base.spd);assert.ok(target.combatSpd>target.runeSpd);
 t.configs[1].syncMinimum=null;t.configs[1].manual.sheet.spd='';assert.equal(quickSpeedTarget(t,t.configs[1]),null);
});
test('dual controls retain values beyond suggested slider ranges for every stat',()=>{
 for(const [stat,value] of Object.entries({hp:90000,def:8000,atk:10000,spd:700,cr:100,cd:400,res:100,acc:100})){const slider=goalSlider(stat,String(value));assert.equal(slider.value,value);assert.ok(slider.max>=value);}
});
test('unknown portraits resolve by exact master ID, deduplicate API requests and reject unsafe filenames',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return {ok:true,json:async()=>({results:[{com2us_id:99981,image_filename:'unit_icon_new.png'}]})};};
 const [a,b]=await Promise.all([resolveMonsterImageSources(99981,{fetcher}),resolveMonsterImageSources(99981,{fetcher})]);assert.equal(calls,1);assert.deepEqual(a,b);assert.ok(a[0].includes('unit_icon_new.png'));
 assert.deepEqual(await resolveMonsterImageSources(99982,{fetcher:async()=>({ok:true,json:async()=>({results:[{com2us_id:99982,image_filename:'../../unsafe.png'}]})})}),[]);
 assert.deepEqual(await resolveMonsterImageSources(99983,{fetcher:async()=>{throw new Error('Offline');}}),[]);assert.equal(MONSTER_FALLBACK,'/game-icons/monster-silhouette.svg');assert.deepEqual(monsterImageSources(99983),[]);
});
