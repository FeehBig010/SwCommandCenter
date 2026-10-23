import test from 'node:test';
import assert from 'node:assert/strict';
import {quickTeam,quickConfig,quickOrderLocked,autoTuneQuickTeam,quickPreview,updateQuickSheetSpeed,quickSpeedTarget} from '../src/core/quick-calculator.js';
import {firstRotationSafe,requiredSheetSpeed} from '../src/core/speedTuner.js';

function team(area='arena'){
 const t=quickTeam(area);
 t.configs=t.configs.map((_,i)=>quickConfig(i?13413:18913,i?`Follower ${i}`:'Tiana'));
 for(const c of t.configs){c.manual.base.spd=100;c.manual.sheet.spd=385;}
 t.enemyCombatSpd=399;return t;
}
function assertLocked(t){
 assert.equal(t.perfectTuneAudit.safe,true);
 const p=quickPreview(t);assert.ok(firstRotationSafe(p.scenario,t.configs.map(c=>c.key)));
 assert.equal(p.turns[0].key,t.configs[0].key);assert.ok(p.actors[0].spd>p.actors[1].spd);
 for(let i=2;i<t.configs.length;i++)assert.equal(p.actors[i-1].spd-p.actors[i].spd,1);
 assert.ok(p.turns.every(t=>Number.isInteger(t.tick)));assert.equal(p.cut,false);
}

test('fresh and legacy plans are locked unless advanced is explicitly selected',()=>{
 for(const area of ['siege','arena','cairos']){
  assert.equal(quickTeam(area).orderMode,'locked');let t=team(area);delete t.orderMode;t.perfectTune=false;
  t.configs.forEach(c=>c.autoSpeed=false);const keys=t.configs.map(c=>c.key),out=autoTuneQuickTeam(t);
  assertLocked(out);assert.equal(out.orderMode,'locked');assert.deepEqual(out.configs.map(c=>c.key),keys);
  assert.deepEqual(t.configs.map(c=>c.manual.sheet.spd),Array(t.configs.length).fill(385));
 }
});

test('Slot 2 is raised only enough for the whole locked four-slot ladder',()=>{
 const t=autoTuneQuickTeam(team());assertLocked(t);
 assert.deepEqual(quickPreview(t).actors.map(a=>a.spd),[400,340,339,338]);
 // Check every lower allowed sheet speed, rebuilding an exact ladder rather
 // than merely perturbing an individual follower and changing the contract.
 for(let value=100;value<Number(t.configs[1].manual.sheet.spd);value++){
  const probe=structuredClone(t),target=value+15;
  probe.configs.slice(1).forEach((c,i)=>{c.manual.sheet.spd=requiredSheetSpeed(target-i,{master:c.masterId,base:c.manual.base},probe);});
  assert.equal(firstRotationSafe(quickPreview(probe).scenario,probe.configs.map(c=>c.key)),false,`Slot 2 sheet ${value}`);
 }
});

test('locked follower edits cannot bypass order, even with legacy AUTO disabled',()=>{
 const t=autoTuneQuickTeam(team());t.configs[2].autoSpeed=false;
 assert.equal(updateQuickSheetSpeed(t,t.configs[2].key,999,false),t);
 const updated=updateQuickSheetSpeed(t,t.configs[2].key,999);assertLocked(updated);
 assert.equal(updated.configs[2].manual.sheet.spd,324);
});

test('artifact SPD reduces rune demand once and remains part of the actual tick simulation',()=>{
 const plain=autoTuneQuickTeam(team()),input=team();input.configs[2].combat={artifactSpd:20};
 const withArtifact=autoTuneQuickTeam(input);assertLocked(withArtifact);
 const a=quickSpeedTarget(plain,plain.configs[2]),b=quickSpeedTarget(withArtifact,withArtifact.configs[2]);
 assert.equal(a.combatSpd,b.combatSpd);assert.equal(a.runeSpd-b.runeSpd,20);
 assert.equal(b.runeSpd,204);assert.equal(b.combatSpd,339);
 assert.equal(quickPreview(withArtifact).turns.find(t=>t.key===input.configs[2].key).spd,339);
});

test('unsafe, disabled, no-booster and unrepresentable ladders clear targets and preserve sheets',()=>{
 for(const kind of ['fast enemy','disabled','no booster','rounding']){
  const t=autoTuneQuickTeam(team());
  if(kind==='fast enemy')t.enemyCombatSpd=999;
  if(kind==='disabled')t.configs[0].combat={disabled:true};
  if(kind==='no booster')t.autoOpener=false;
  if(kind==='rounding')t.configs.slice(1).forEach(c=>c.combat={speedBuff:true,artifactSpdBuff:100,artifactSpdLostHp:100,hpPercent:0});
  const sheets=t.configs.map(c=>c.manual.sheet.spd),out=autoTuneQuickTeam(t);
  assert.equal(out.perfectTuneAudit.safe,false,kind);assert.ok(out.configs.slice(1).every(c=>c.syncMinimum===null&&c.syncCombatTarget===null));
  assert.deepEqual(out.configs.map(c=>c.manual.sheet.spd),sheets);
 }
});

test('advanced manual order allows follower edits and preserves them when the opener changes',()=>{
 let t=team();t.orderMode='advanced';t.configs.forEach(c=>c.autoSpeed=false);
 t=updateQuickSheetSpeed(t,t.configs[2].key,800);assert.equal(t.configs[2].manual.sheet.spd,800);
 t=updateQuickSheetSpeed(t,t.configs[0].key,300);assert.equal(t.configs[2].manual.sheet.spd,800);
 assert.equal(quickOrderLocked(t),false);assert.equal(t.perfectTune,false);assert.equal(t.perfectTuneAudit,null);
 assert.ok(t.configs.slice(1).every(c=>c.syncMinimum==null));assert.equal(quickPreview(t).turns[0].key,t.configs[2].key);
 t.orderMode='locked';t.enemyCombatSpd=299;t=autoTuneQuickTeam(t);assertLocked(t);
});

test('partial selection and intermediate empty opener speed never retain stale safe targets',()=>{
 const t=autoTuneQuickTeam(team());t.configs[2].masterId=null;
 const partial=autoTuneQuickTeam(t);assert.equal(partial.perfectTuneAudit,null);assert.equal(quickPreview(partial).complete,false);
 assert.ok(partial.configs.slice(1).every(c=>c.syncMinimum===null));
 const actual=autoTuneQuickTeam(team());const empty=updateQuickSheetSpeed(actual,actual.configs[0].key,'');
 assert.equal(empty.perfectTuneAudit.safe,false);assert.ok(empty.configs.slice(1).every(c=>c.syncMinimum===null));
});
