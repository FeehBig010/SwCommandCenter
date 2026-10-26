import test from 'node:test';
import assert from 'node:assert/strict';
import {blankConfig,DEFAULT_OPTIONS} from '../src/core/data.js';
import {diagnoseAttackTradeoffs,validateAttackTradeoff,tradeoffTimingValid,tradeoffNarrative,buildMetrics} from '../src/core/attack-tradeoffs.js';
import {equippedBuild} from '../src/core/optimizer.js';
import {accountStamp} from '../src/core/loadouts.js';
const options={...DEFAULT_OPTIONS,equipped:false,minLevel:0,artifacts:true};
import {fixture,freeFrom} from './fixtures/attack-tradeoffs.mjs';
function search(account,team,settings={focus:'spd',maxLoss:20},extra={}){return diagnoseAttackTradeoffs(account,team,{...options,...extra},[],[team],settings);}
test('SWEX stats are automatic and fake editor goals/planned builds never become the baseline; strict improvements win',()=>{
 const {account,team}=fixture();freeFrom(account,1,{spd:8});team.plannedRunes={accountStamp:accountStamp(account),byConfig:{[team.configs[0].key]:[101,2,3,4,5,6]}};
 const before=structuredClone({account,team}),report=search(account,team);
 assert.equal(report.status,'superior');assert.equal(report.current[0].metrics.spd,316);assert.ok(report.proposals.every(p=>p.pareto));assert.ok(report.proposals.some(p=>p.members[0].after.spd===324));
 assert.deepEqual({account,team},before);for(const p of report.proposals){assert.equal(new Set(p.builds.flatMap(b=>b.runeIds)).size,18);assert.ok(p.members.every(m=>Number.isInteger(m.tick)&&m.tick<=m.beforeTick));const plan=validateAttackTradeoff(account,team,options,[],[team],report.settings,report.signature,p);assert.equal(plan.source,'attack-tradeoff');}
});
test('damage trades disclose HP/SPD losses, keep the same integer tick and need no typed current stats',()=>{
 const {account,team}=fixture();freeFrom(account,10,{spd:-8,hp:-4,cd:12});
 const report=search(account,team,{focus:'damage',maxLoss:20});assert.equal(report.status,'tradeoffs');assert.ok(report.proposals.some(p=>p.members.some(m=>m.after.spd<m.before.spd&&m.tick===m.beforeTick)));assert.ok(report.proposals.every(p=>p.members.every(m=>m.tick<=m.beforeTick)));
 const member=report.proposals.flatMap(p=>p.members).find(m=>m.after.spd<m.before.spd);assert.match(member.narrative,/sacrificando/);assert.match(member.narrative,/HP|SPD/);assert.ok(member.after.damage>member.before.damage);
 assert.equal(search(account,team,{focus:'damage',maxLoss:0}).proposals.length,0);
});
test('mandatory selected sets and explicit rune mains cannot be sacrificed for an attractive speed rune',()=>{
 const {account,team}=fixture();freeFrom(account,1,{spd:30,set:15});assert.equal(search(account,team).proposals.length,0);
 account.runes.at(-1).set=13;account.runes.at(-1).main=[1,5000];team.configs[0].mains[1]=3;assert.equal(search(account,team).proposals.length,0);
});
test('resource constraints exclude reserved, defense-planned, RTA and locked gear while other attacks share the global pool',()=>{
 const {account,team}=fixture(),rune=freeFrom(account,1,{spd:8});
 for(const extra of [{blockedRuneIds:[rune.id]},{localLocks:{runeIds:[rune.id]}}])assert.equal(search(account,team,undefined,extra).proposals.length,0);
 const locked=search(account,team,undefined,{localLocks:{unitIds:[1]}});assert.ok(locked.proposals.every(p=>p.builds[0].runeIds.every(id=>account.units[0].runeIds.includes(id))));
 assert.equal(diagnoseAttackTradeoffs(account,team,options,[rune.id],[team],{}).proposals.length,0);
 const other={...team,id:'other',mode:'defense',plannedRunes:{accountStamp:accountStamp(account),byConfig:{other:[rune.id]}}};
 assert.equal(diagnoseAttackTradeoffs(account,team,options,[],[team,other],{}).proposals.length,0);
 assert.ok(diagnoseAttackTradeoffs(account,team,options,[],[team,{...other,mode:'attack'}],{}).proposals.length>0);
 rune.pool='rta';assert.equal(search(account,team).proposals.length,0);delete rune.pool;rune.locked=true;assert.equal(search(account,team,undefined,{respectLocks:true}).proposals.length,0);
});
test('timing is eliminatory: never reverse order, delay readiness/action or add enemy turns before an ally',()=>{
 const configs=[{key:'a'},{key:'b'},{key:'c'}],baseline={order:['a','b','c'],ready:{a:5,b:5,c:5},action:{a:5,b:6,c:7},enemyBefore:{a:0,b:0,c:0}};
 assert.equal(tradeoffTimingValid(baseline,baseline,configs),true);
 for(const mutation of [{order:['b','a','c']},{ready:{a:5,b:6,c:5}},{action:{a:5,b:7,c:8}},{enemyBefore:{a:0,b:1,c:1}},{ready:{a:5,b:5.5,c:5}}])assert.equal(tradeoffTimingValid({...baseline,...mutation},baseline,configs),false);
 assert.equal(tradeoffTimingValid(baseline,baseline,[configs[0],{key:'b',maxTick:5},configs[2]]),false);
 const {account,team}=fixture();freeFrom(account,7,{spd:25});const report=search(account,team);assert.ok(report.proposals.every(p=>p.builds[0].stats.combat.spd>=p.builds[1].stats.combat.spd));
});
test('applying revalidates every ID, constraints, timing and freshness instead of trusting proposed stats',()=>{
 const {account,team}=fixture();freeFrom(account,1,{spd:8});const report=search(account,team),proposal=report.proposals[0];assert.ok(proposal);
 const forged=structuredClone(proposal);forged.builds[1].runeIds=[...forged.builds[0].runeIds];assert.throws(()=>validateAttackTradeoff(account,team,options,[],[team],report.settings,report.signature,forged),/repetida|indisponível/);
 const fake=structuredClone(proposal);fake.builds[0].runeIds[0]=999999;assert.throws(()=>validateAttackTradeoff(account,team,options,[],[team],report.settings,report.signature,fake),/indisponível/);
 account.runes.at(-1).subs[0][1]--;assert.throws(()=>validateAttackTradeoff(account,team,options,[],[team],report.settings,report.signature,proposal),/mudaram/);
});
test('EHP uses combat HP/DEF; percentage stats disclose percentage points rather than misleading relative gains',()=>{
 const {account,team}=fixture(),build=equippedBuild(account,team,team.configs[0],options),metrics=buildMetrics(build);assert.equal(metrics.ehp,build.stats.combat.hp*(1140+3.5*build.stats.combat.def)/1000);
 const text=tradeoffNarrative(metrics,{...metrics,cd:metrics.cd+12,spd:metrics.spd-8,damage:metrics.damage*1.05},'damage');assert.match(text,/potencial de dano/);assert.match(text,/8 SPD/);
 assert.match(tradeoffNarrative(metrics,{...metrics,cd:metrics.cd+12},'spd'),/12 p.p. DC/);
});
test('missing units, empty equipment, duplicate copies, unsupported pools and invalid settings fail safely',()=>{
 const {account,team}=fixture();assert.throws(()=>search(null,team),/Importe/);assert.throws(()=>search(account,{...team,mode:'defense'}),/ataque completo/);assert.throws(()=>search(account,team,{focus:'unknown'}),/Escolha/);assert.throws(()=>search(account,{...team,pool:'rta'}),/RTA/);
 account.runes[0].set=30;assert.throws(()=>search(account,team),/desconhecidos/);account.runes[0].set=13;
 team.configs[1].unitId=1;assert.throws(()=>search(account,team),/cópia distinta/);team.configs[1].unitId=2;account.units[0].runeIds=[];assert.throws(()=>search(account,team),/seis runas/);
});
test('EHP priority uses real equipped artifacts and never projects unavailable grinds or gems',()=>{
 const {account,team}=fixture();account.artifacts=[{id:501,main:[100,1500],subs:[]}];account.units[0].artifactIds=[501];const rune=freeFrom(account,1,{hp:8});rune.subs.find(s=>s[0]===6)[1]+=8;
 const report=search(account,team,{focus:'ehp',maxLoss:20},{maxGrindsGems:true});assert.equal(report.status,'superior');const direct=equippedBuild(account,team,team.configs[0],options);assert.equal(report.current[0].metrics.hp,direct.stats.total.hp);assert.ok(report.proposals.some(p=>p.members[0].after.ehp>p.members[0].before.ehp));assert.ok(report.proposals.every(p=>p.builds.every(b=>!b.upgrades?.length)));
});
test('automatic ATB boosts use the actual JSON identity and preserve real scenario timing',()=>{
 const {account,team}=fixture();account.units[0].master=18913;team.configs[0].masterId=99999;team.autoOpener=true;team.enemyCombatSpd=315;freeFrom(account,1,{spd:8});
 const report=search(account,team);assert.ok(report.proposals.length);for(const p of report.proposals){assert.equal(p.preview.scenario.log.filter(e=>e.type==='tiana').length,1);assert.ok(p.members.every(m=>Number.isInteger(m.tick)&&Number.isInteger(m.actionTick)));}
});
test('native four-slot attacks are allocated jointly with no duplicated rune IDs',()=>{
 const {account,team}=fixture(),unit=structuredClone(account.units[2]);unit.id=4;unit.name='Quarto slot';unit.runeIds=unit.runeIds.map(id=>{const rune=structuredClone(account.runes.find(r=>r.id===id));rune.id=id+20;rune.owner=4;account.runes.push(rune);return rune.id;});account.units.push(unit);team.gameMode='arena';team.configs.push({...blankConfig(unit),sets:[13,15]});freeFrom(account,1,{spd:8});
 const report=search(account,team);assert.ok(report.proposals.length);assert.ok(report.proposals.every(p=>p.builds.length===4&&new Set(p.builds.flatMap(b=>b.runeIds)).size===24));
});
test('the first pass finds non-SPD Pareto upgrades even when SPD is the selected priority',()=>{
 const {account,team}=fixture();freeFrom(account,1,{hp:8});const report=search(account,team);assert.equal(report.status,'superior');assert.ok(report.proposals.some(p=>p.members.some(m=>m.after.hp>m.before.hp)));assert.ok(report.proposals.every(p=>p.pareto));
});
