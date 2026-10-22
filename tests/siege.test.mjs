import test from 'node:test';
import assert from 'node:assert/strict';
import {blankConfig} from '../src/core/data.js';
import {cleanSiegeCounter,matchesDefense,requiredTurnPlan,validateSiegeAccount,makeFavorite,summarizeFeedback} from '../src/core/siege.js';
import {catalogLeader} from '../src/core/leader-catalog.js';
import {leaderApplies} from '../src/core/leaders.js';
import {combatSpeed} from '../src/core/optimizer.js';
import {copyTeamToOptimizer,cleanCloudPayload} from '../src/core/hub.js';
const masters=[18311,16111,28212];
export const counter=()=>cleanSiegeCounter({version:1,name:'Mihyang vs Carcano',offense:{name:'Ofensa',mode:'attack',leader:null,configs:masters.map((masterId,i)=>({...blankConfig(),masterId,label:['Mihyang','Anavel','Solveig'][i],basis:'total',sets:[],mains:{2:0,4:0,6:0},goals:{},combatSpd:100,maxTick:0}))},enemyDefense:[22712,20711,21413].map(masterId=>({masterId,label:String(masterId),sets:[13,15]})),siege:{speedTick:7},notes:'Foque Carcano.'});
export function account(){return {artifacts:[],units:masters.map((master,i)=>({id:i+1,master,name:['Mihyang','Anavel','Solveig'][i],element:master%10,base:{hp:10000,atk:800,def:600,spd:120-i*10,cr:15,cd:50,res:15,acc:0},runeIds:Array.from({length:6},(_,j)=>i*6+j+1),artifactIds:[]})),runes:Array.from({length:18},(_,i)=>({id:i+1,owner:Math.floor(i/6)+1,slot:i%6+1,set:1,main:[1,0],innate:[],subs:[]}))};}
test('Siege search is order independent, partial, and respects repeated monsters',()=>{const c=counter();assert.ok(matchesDefense(c.enemyDefense,[21413,'22712','']));assert.ok(matchesDefense(c.enemyDefense,[]));assert.ok(!matchesDefense(c.enemyDefense,[22712,22712]));assert.ok(!matchesDefense(c.enemyDefense,[18311]));});
test('equipped six-slot units pass actual SPD targets and use integer global ticks',()=>{const report=validateSiegeAccount(counter(),account());assert.equal(report.status,'ready');assert.deepEqual(report.members.map(m=>m.spd),[120,110,100]);assert.ok(report.turns.every(t=>Number.isInteger(t.tick)));assert.equal(requiredTurnPlan(counter()).length,3);});
test('missing copies are distinguished from unequipped and inadequate runes',()=>{const a=account(),c=counter();a.units.pop();assert.equal(validateSiegeAccount(c,a).status,'missing');const b=account();b.runes.pop();assert.equal(validateSiegeAccount(c,b).status,'adjust');const d=counter();d.offense.configs[1].masterId=d.offense.configs[0].masterId;assert.equal(validateSiegeAccount(d,account()).status,'missing');});
test('actual stat deficits, sets, mains, speed and deadlines all require adjustments',()=>{const c=counter();c.offense.configs[0]={...c.offense.configs[0],goals:{hp:16000},sets:[13,15],combatSpd:134,maxTick:1,mains:{2:8,4:0,6:0}};const r=validateSiegeAccount(c,account());assert.equal(r.status,'adjust');for(const text of ['1.500 HP','14 SPD','Violent','Will','slot 2','Tick'])assert.ok(r.issues.some(i=>i.includes(text)),text);});
test('enemy cutting and team order are evaluated using the tick simulator',()=>{const c=counter();c.offense.enemyCombatSpd=115;assert.ok(validateSiegeAccount(c,account()).issues.some(i=>i.includes('corte')));c.offense.enemyCombatSpd=0;const a=account();a.units[2].base.spd=150;assert.ok(validateSiegeAccount(c,a).issues.some(i=>i.includes('ordem')));});
test('unconfigured timing never claims account ready, and fractional deadlines are rejected',()=>{const c=counter();c.offense.configs[0].combatSpd=0;assert.equal(validateSiegeAccount(c,account()).status,'adjust');c.offense.configs[0].maxTick=2.5;assert.throws(()=>cleanSiegeCounter(c),/inteiros/);assert.equal(validateSiegeAccount(counter(),null).status,'no_account');});
test('all leader stats/scopes are preserved; only applicable SPD bonuses enter combat SPD',()=>{assert.deepEqual(catalogLeader(18311),{stat:'spd',value:28,scope:'guild',element:0});assert.equal(catalogLeader(16111).stat,'cr');assert.equal(catalogLeader(28212).stat,'acc');const a=account(),u=a.units[0],stats={total:{spd:120}};assert.equal(combatSpeed(u,stats,{}, {leader:{stat:'spd',value:24,scope:'element',element:2}}),120);assert.equal(combatSpeed(u,stats,{}, {leader:{stat:'spd',value:24,scope:'element',element:1}}),149);assert.ok(!leaderApplies({scope:'dungeon'},u,'siege'));const c=counter();c.offense.leader=catalogLeader(18311);assert.equal(validateSiegeAccount(c,a,{towerSpd:0}).members[0].spd,154);assert.equal(validateSiegeAccount(c,a,{towerSpd:15}).members[0].spd,172);});
test('favorite/cloud roundtrips preserve public requirements without private IDs or inventory',()=>{const c=counter();c.offense.leader=catalogLeader(16111);c.offense.configs[0].unitId=999;c.secret='token';const f=makeFavorite(c,'local:1');assert.equal(f.counter.offense.configs[0].unitId,undefined);assert.equal(f.counter.secret,undefined);const round=cleanCloudPayload('counter',f.counter);assert.equal(round.siege.speedTick,7);assert.equal(round.enemyDefense[0].sets[0],13);assert.equal(round.offense.leader.stat,'cr');const copied=copyTeamToOptimizer(round.offense,account());assert.equal(copied.configs[0].combatSpd,100);assert.equal(copied.leader.stat,'cr');assert.equal(new Set(copied.configs.map(c=>c.key)).size,3);});
test('reaction counts never manufacture wins and zero reports have no win rate',()=>{assert.equal(summarizeFeedback([{reaction:'free_win'}]).winRate,null);assert.deepEqual(summarizeFeedback([{reaction:'rng',outcome:'win'},{reaction:'free_win',outcome:'loss'}]),{counts:{free_win:1,rng:1,high_runes:0},wins:1,losses:1,total:2,winRate:50});});

test('shared legacy counters normalize their rate without changing integer reference ticks',()=>{
 const original=counter(),expected=requiredTurnPlan(original);
 for(const legacy of [0,7,10,100]){
  const restored=cleanSiegeCounter({...original,siege:{...original.siege,speedTick:legacy}});
  assert.equal(restored.siege.speedTick,7);
  assert.deepEqual(requiredTurnPlan(restored),expected);
  assert.ok(requiredTurnPlan(restored).every(t=>Number.isInteger(t.tick)));
 }
});
