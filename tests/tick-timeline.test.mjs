import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateCombat} from '../src/core/speedTuner.js';
import {tickTimeline} from '../src/core/tick-timeline.js';
import {quickTeam,selectQuickMonster,quickPreview} from '../src/core/quick-calculator.js';
const actor=(key,spd,extra={})=>({key,name:key,master:13413,spd,...extra});
const run=(actors,events=[])=>simulateCombat(actors,{events,stopAfterFirst:true,captureReadiness:true});
const preview=(actors,scenario)=>({complete:true,actors,scenario,turns:scenario.firstTurns});
test('three 316 Combat SPD monsters share Tick 5 despite acting on serialized Ticks 5, 6 and 7',()=>{
 const actors=['Laima','Amduat','Camilla'].map(key=>actor(key,316)),scenario=run(actors);
 assert.deepEqual(scenario.firstReady.map(r=>r.tick),[5,5,5]);assert.deepEqual(scenario.firstTurns.map(t=>t.tick),[5,6,7]);
 const model=tickTimeline(preview(actors,scenario));assert.equal(model.cells.length,1);assert.equal(model.cells[0].tick,5);assert.deepEqual(model.cells[0].members.map(m=>m.name),['Laima','Amduat','Camilla']);assert.ok(model.cells[0].members.every(m=>m.spd===316));
});
test('real threshold boundaries determine cells, independent of action-queue delays and risk verdicts',()=>{
 const actors=[actor('fast',316),actor('edge',286),actor('slow',285)],scenario=run(actors),p=preview(actors,scenario);
 assert.deepEqual(scenario.firstReady.map(r=>[r.key,r.tick]),[['fast',5],['edge',5],['slow',6]]);
 assert.deepEqual(tickTimeline({...p,cut:true,conditional:true}),tickTimeline({...p,cut:false,conditional:false}));
});
test('cascading boosts group same-tick readiness and display actual Combat SPD at first action',()=>{
 const actors=[actor('opener',316),actor('second',210,{rawSpd:210}),actor('tail',130,{rawSpd:130})];
 const events=[{afterKey:'opener',type:'boost',amount:30,targets:['second','tail']},{afterKey:'opener',type:'speed_buff',targets:['tail']},{afterKey:'second',type:'boost',amount:20,targets:['tail']}];
 const scenario=run(actors,events),model=tickTimeline(preview(actors,scenario));
 assert.deepEqual(scenario.firstReady.map(r=>[r.key,r.tick]),[['opener',5],['second',5],['tail',6]]);assert.deepEqual(scenario.firstTurns.map(t=>t.tick),[5,6,7]);
 assert.equal(model.cells[1].members[0].spd,169);assert.equal(model.cells[1].members[0].actionTick,7);
});
test('Amduat passive readiness is measured in the enemy action tick',()=>{
 const actors=[actor('enemy',316,{enemy:true}),actor('Amduat',250,{master:20615})],scenario=run(actors);
 const ready=scenario.firstReady.find(r=>r.key==='Amduat');assert.equal(ready.tick,5);assert.equal(ready.phase,'passive');assert.equal(tickTimeline(preview(actors,scenario)).cells[0].members.length,2);
});
test('a threshold reached and reduced again during the same action is not lost',()=>{
 const actors=[actor('opener',316),actor('tail',230)],scenario=run(actors,[{afterKey:'opener',type:'boost',amount:30,targets:['tail']},{afterKey:'opener',type:'reduce',amount:50,targets:['tail']}]);
 assert.equal(scenario.firstReady.find(r=>r.key==='tail').tick,5);assert.equal(scenario.firstTurns.find(r=>r.key==='tail').tick,8);
});
test('initial full bars and forced actions keep distinct factual timing without inventing full ATB',()=>{
 const initial=run([actor('initial',100,{initialAtb:100}),actor('other',100)]);assert.equal(initial.firstReady[0].tick,0);
 const leo=run([actor('Leo',100,{master:16613}),actor('ally',300)]),entry=leo.firstReady.find(r=>r.key==='Leo');assert.equal(entry.tick,1);assert.equal(entry.forced,true);assert.ok(entry.atb<100);
});
test('disabled and eliminated units remain factual states, with no fabricated allocation for a dead unit',()=>{
 const actors=[actor('disabled',316,{combat:{disabled:true}}),actor('dead',300,{combat:{hpPercent:0}})],scenario=run(actors),model=tickTimeline(preview(actors,scenario));
 assert.equal(model.cells[0].members[0].disabled,true);assert.deepEqual(model.unallocated.map(a=>a.key),['dead']);
});
test('long empty ranges keep exact temporal spans with a bounded DOM model',()=>{
 const model=tickTimeline({complete:true,actors:[],turns:[],scenario:{firstReady:[{key:'a',tick:2,spd:100},{key:'b',tick:100,spd:15}]}});
 assert.equal(model.start,2);assert.equal(model.end,100);assert.equal(model.count,99);assert.equal(model.cells.length,3);assert.deepEqual(model.cells[1],{tick:3,end:99,span:97,members:[]});
});
test('visual capture does not alter combat turns and optimization keeps readiness allocation disabled by default',()=>{
 const actors=[actor('a',316),actor('b',315)],before=structuredClone(actors),raw=simulateCombat(actors,{stopAfterFirst:true}),captured=run(actors);
 assert.equal(raw.firstReady,undefined);assert.deepEqual(raw.firstTurns,captured.firstTurns);assert.deepEqual(raw.state,captured.state);assert.deepEqual(actors,before);
});
test('manual UI can omit the synthetic reference enemy while retaining real enemies and recorded boosts',()=>{
 const team=quickTeam('siege');team.configs=team.configs.map((c,i)=>selectQuickMonster(c,{master:i?13413:11513,name:i?'Lushen':'Bernard'}));team.configs.forEach((c,i)=>c.manual.sheet.spd=i?220:300);
 assert.ok(quickPreview(team).referenceEnemy>0);
 const visual=quickPreview(team,{includeReference:false,captureReadiness:true});assert.equal(visual.referenceEnemy,0);assert.ok(visual.scenario.firstReady.every(r=>!r.enemy));assert.ok(visual.scenario.log.some(e=>e.type==='boost'));
 const enemy=quickPreview({...team,enemyCombatSpd:400},{includeReference:false,captureReadiness:true});assert.ok(enemy.scenario.firstReady.some(r=>r.enemy));
});
test('tick cards report only the simulated subset and never universal safety',async()=>{const {tickCardsFromPreview}=await import('../src/core/tick-timeline.js');const actors=[actor('a',212),actor('b',153)],scenario=simulateCombat(actors,{captureReadiness:true,captureTickSnapshots:true,stopAfterFirst:true});const p={...preview(actors,scenario),partial:true,cut:null};const r=tickCardsFromPreview(p);assert.equal(r.synced,false);assert.match(r.statusMessage,/parcial/i);assert.doesNotMatch(r.statusMessage,/não conseguirá|Perfeitamente/i);});
