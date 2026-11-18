import test from 'node:test';
import assert from 'node:assert/strict';
import {quickTeam,quickConfig,quickPreview,autoTuneQuickTeam,quickRuneSpeed,applyQuickAutoPresets,monsterSkillsForCard,updateQuickTowerSpd} from '../src/core/quick-calculator.js';
import {firstRotationSafe,simulateCombat,runtimeSpeed} from '../src/core/speedTuner.js';
import {balanceCurrentTiming} from '../src/core/team-balance.js';

function reference({plus=100,level=3,profile='bernard-2a-reference',tower=0}={}){
 const t={...quickTeam('siege'),includePartial:true,referencePolicy:'near-tie',towerSpd:tower,customTowerSpd:true};
 t.configs[0]={...quickConfig(11513,'Bernard'),firstTurnSkillLevel:level,skillupProfile:profile,combat:{artifactSpdBuff:12}};
 t.configs[0].manual.sheet.spd=111+plus;
 t.configs[1]={...quickConfig(18913,'Tiana'),sets:[3]};t.configs[1].manual.sheet.spd=120;
 return t;
}

test('reference screenshots use explicit 2A comparison, near-tie and total bonus including Swift',()=>{
 for(const [plus,level,minimum] of [[100,3,144],[101,3,145],[101,1,153]]){
  const t=reference({plus,level}),out=autoTuneQuickTeam(t),p=quickPreview(out,{includePartial:true});
  assert.equal(out.configs[1].manual.sheet.spd,minimum);
  assert.equal(quickRuneSpeed(out.configs[1]),minimum-96-24);
  assert.equal(p.partial,true);assert.equal(p.actors.length,2);assert.equal(p.referenceEnemy,111+plus-.000001);
  assert.deepEqual(p.turns.slice(0,2).map(r=>r.tick),[7,8]);assert.equal(p.cut,false);
  const weaker={...out,configs:out.configs.map((c,i)=>i===1?{...c,manual:{...c.manual,sheet:{...c.manual.sheet,spd:minimum-1}}}:c)};
  assert.equal(quickPreview(weaker,{includePartial:true}).cut,true);
 }
});

test('normal Bernard skillups change cooldown only and tower rounds once without initial SPD buff',()=>{
 const t=reference({profile:null,tower:15}),out=autoTuneQuickTeam(t),p=quickPreview(out,{includePartial:true});
 assert.equal(p.actors[0].attributes.rawSpd,228);assert.equal(p.actors[0].spd,228);
 assert.equal(p.scenario.log.find(e=>e.type==='boost').amount,30);
});

test('partial simulations retain ally indexes and skip events with absent sources/targets',()=>{
 const t=reference();t.configs[2]=t.configs[1];t.configs[1]=quickConfig();
 t.combatScenario={events:[{afterKey:'ally:2',type:'boost',targets:['ally:0','ally:1'],amount:5}]};
 const p=quickPreview(t,{includePartial:true});assert.equal(p.actors.length,2);assert.equal(p.partial,true);
 assert.equal(p.scenario.log.find(e=>e.amount===5).source,t.configs[2].key);
 assert.deepEqual(p.scenario.log.find(e=>e.amount===5).targets,[t.configs[0].key]);
 assert.equal(quickPreview(t).complete,true);
});

test('passives are marked separately and Chilling automation never adds Will to Stella',()=>{
 assert.equal(monsterSkillsForCard(25311).find(s=>s.slot===3).isPassive,true);
 assert.equal(monsterSkillsForCard(20711).find(s=>s.slot===3).coverage,'unsupported');
 const stella=applyQuickAutoPresets(quickConfig(19911,'Stella'),0,{autoWillChilling:true});
 const chilling=applyQuickAutoPresets(quickConfig(20711,'Chilling'),0,{autoWillChilling:true});
 assert.ok(!stella.sets.includes(15));assert.ok(chilling.sets.includes(15));
});

test('tick snapshots report speed after effects and a configurable bounded capture horizon',()=>{
 const actors=[{key:'a',master:0,spd:211,rawSpd:211},{key:'b',master:0,spd:144,rawSpd:144}];
 const r=simulateCombat(actors,{maxTurns:1,captureTickSnapshots:true,captureTickLimit:4,events:[{afterKey:'a',type:'speed_buff',targets:['a','b']}]});
 assert.equal(r.tickSnapshots.length,4);assert.equal(r.captureTruncated,true);
 const all=simulateCombat(actors,{maxTurns:1,captureTickSnapshots:true,events:[{afterKey:'a',type:'speed_buff',targets:['b']}]});
 assert.equal(all.tickSnapshots.at(-1).bars.find(b=>b.key==='b').spdPost,188);
 assert.equal(all.tickSnapshots.at(-1).bars.find(b=>b.key==='b').spd,144);
});

test('enemy tower follows global edits and explicit enemy overrides remain stable',()=>{
 const t=reference();t.enemyReference={masterId:11513,baseSpd:111,runeSpd:100,swift:false};t.ignoreEnemyReference=false;t.enemyCombatSpd=211;
 assert.equal(updateQuickTowerSpd(t,15,false).enemyCombatSpd,228);
 const fixed={...t,enemyReference:{...t.enemyReference,towerSpd:0}};
 assert.equal(updateQuickTowerSpd(fixed,15,false).enemyCombatSpd,211);
});

test('physical game placement breaks allied ties independently of desired config order',()=>{
 const t={...quickTeam('siege'),speedMode:'free',towerSpd:0,customTowerSpd:true};
 t.configs=[quickConfig(13413,'A'),quickConfig(13413,'B')];t.configs.forEach(c=>c.manual.sheet.spd=200);
 t.gamePlacement=[t.configs[1].key,t.configs[0].key];
 assert.equal(quickPreview(t,{includeReference:false}).turns[0].key,t.configs[1].key);
 assert.equal(balanceCurrentTiming(t).preview.turns[0].key,t.configs[1].key);
});

test('balance telemetry shares near-tie reference and mode gauge with quick preview',()=>{
 const t=reference();t.configs=t.configs.slice(0,2);t.gameMode='rta';
 const p=quickPreview(t),timing=balanceCurrentTiming(t);
 assert.equal(timing.referenceSpeed,p.referenceEnemy);
 assert.deepEqual(timing.preview.turns.filter(x=>!x.enemy).map(x=>x.tick),p.turns.filter(x=>!x.enemy).map(x=>x.tick));
});

test('disabled resolved boost events cannot silently alter ATB',()=>{
 const r=simulateCombat([{key:'a',spd:200},{key:'b',spd:100}],{maxTurns:1,events:[{afterKey:'a',type:'boost',targets:['b'],amount:100,enabled:false}]});
 assert.equal(r.log.length,0);assert.equal(r.state.find(s=>s.key==='b').atb,56);
});
test('copying starter speed updates enemy rune input rather than creating inconsistent hidden totals',async()=>{const core=await import('../src/core/quick-calculator.js');assert.equal(typeof core.copyQuickStarterReference,'function');const t=reference({plus:101,profile:null});t.enemyReference={masterId:11513,baseSpd:111,runeSpd:150,swift:true,leaderSpd:0};const next=core.copyQuickStarterReference(t);assert.equal(next.enemyReference.runeSpd,73);assert.equal(next.enemyCombatSpd,212);assert.equal(core.computeEnemyReferenceSpd(next.enemyReference,next),212);assert.equal(t.enemyReference.runeSpd,150);});
