import {createInfographic} from '../src/core/export-infographic.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {quickPresetAccount} from './fixtures/quick-presets.mjs';
import {quickTeamFromPreset} from '../src/core/quick-presets.js';
import {balanceProfile,balanceInventory,balanceChecks,grantsTeamSpeedBuff,weightedStatUtility} from '../src/core/balance-profile.js';
import {searchTeamBalance,validateBalanceProposal,balanceTiming,balanceTeamForProposal,balanceCurrentTiming} from '../src/core/team-balance.js';
import {handleTeamBalanceRequest} from '../src/core/team-balance-handler.js';
import {quickOrderLocked,autoTuneQuickTeam} from '../src/core/quick-calculator.js';
const fixture=()=>{const account=quickPresetAccount(),team=quickTeamFromPreset(account.accountPresets[0],account);return {account,team};};
let cached;
function solved(){if(!cached){const {account,team}=fixture();cached={account,team,report:searchTeamBalance(account,team)};}return structuredClone(cached);}
test('balance priorities are configurable per stat; unset TC never becomes a hidden requirement',()=>{
 const p=balanceProfile({balance:{weights:{spd:5,hp:3},minimums:{cr:85},required:{cr:false}}});assert.equal(p.weights.cr,0);assert.equal(p.weights.spd,5);assert.equal(p.required.cr,false);assert.equal(p.minimums.hp,null);
 const stats={total:{spd:250,cr:15},combat:{spd:300}};assert.equal(weightedStatUtility(stats,{spd:2},{spd:150}),2);
});
test('joint search returns actual six-slot gear without duplicate resources, leaves SWEX and source preset unchanged',()=>{
 const {account,team,report}=solved(),before=JSON.stringify([account,team]);assert.ok(report.checked>0);assert.ok(report.alternatives.some(p=>p.eligible));
 for(const p of report.alternatives){const ids=p.builds.flatMap(b=>b.runeIds);assert.equal(new Set(ids).size,18);for(const b of p.builds){assert.equal(new Set(b.runeIds.map(id=>account.runes.find(r=>r.id===id).slot)).size,6);assert.ok(b.runeIds.every(id=>account.runes.some(r=>r.id===id)));}assert.equal(p.timing.orderMet,true);assert.ok(p.timing.preview.turns.every(t=>Number.isInteger(t.tick)));}
 assert.equal(JSON.stringify([account,team]),before);
});
test('minimum TC 85 can remain diagnostic; requirements are not silently waived or applied',()=>{
 const {account,team}=fixture();team.configs[0].balance={minimums:{cr:85},required:{cr:true}};const r=searchTeamBalance(account,team);assert.ok(r.alternatives.length);for(const p of r.alternatives){assert.equal(p.eligible,false);assert.ok(p.checks[team.configs[0].key].some(c=>c.stat==='cr'&&!c.met&&c.required));assert.throws(()=>validateBalanceProposal(account,team,{},[],[],r.signature,p),/exigências/);}
});
test('mandatory sets, preferred sets, main stats and fixed individual pieces have separate checks',()=>{
 const {account,team,report}=solved(),b=report.alternatives[0].builds[0],byId=new Map(account.runes.map(r=>[r.id,r])),c={...team.configs[0],balance:{sets:[{set:15,required:true},{set:16,required:false}],mains:{4:{stat:10,required:true}},pins:{1:b.runeIds.find(id=>byId.get(id).slot===1)}}};
 const checks=balanceChecks(b,c,byId);assert.ok(checks.some(c=>c.kind==='set'&&c.set===16&&!c.required&&!c.met));assert.ok(checks.some(c=>c.kind==='main'&&c.required&&!c.met));assert.ok(checks.some(c=>c.kind==='pin'&&c.met));
});
test('fixed rune survives joint allocation and an unavailable or duplicate pin fails explicitly',()=>{
 const {account,team}=fixture(),id=team.plannedRunes.byConfig[team.configs[0].key][0];team.configs[0].balance={pins:{1:id}};const r=searchTeamBalance(account,team);assert.ok(r.alternatives.length);assert.ok(r.alternatives.every(p=>p.builds[0].runeIds.includes(id)));
 team.configs[1].balance={pins:{1:id}};assert.throws(()=>searchTeamBalance(account,team),/mais de um monstro/);team.configs[1].balance={pins:{1:99999999}};assert.throws(()=>searchTeamBalance(account,team),/não está disponível/);
});
test('reservations, local monster/rune locks and equipped-pool toggle restrict exact inventory',()=>{
 const {account,team}=fixture(),unit=account.units[0],rune=account.runes.find(r=>r.owner===unit.id),other=account.units[1];
 let scope=balanceInventory(account,team,{localLocks:{unitIds:[unit.id],runeIds:[]}},[]);assert.equal(scope.allowed(rune,other),false);assert.equal(scope.allowed(rune,unit),true);
 scope=balanceInventory(account,team,{localLocks:{runeIds:[rune.id]}},[]);assert.equal(scope.allowed(rune,other),false);
 scope=balanceInventory(account,team,{},[rune.id]);assert.equal(scope.allowed(rune,unit),false);
 scope=balanceInventory(account,team,{equipped:false});assert.equal(scope.allowed(rune,other),false);assert.equal(scope.allowed(rune,unit),true);
 const protection={id:'priority',priority:2,configs:[{unitId:unit.id}]};scope=balanceInventory(account,team,{},[],[protection]);assert.equal(scope.allowed(rune,unit),false);
});
test('RTA allocation reads native RTA assignments and does not inherit regular-defense reservations',()=>{
 const account=quickPresetAccount(),team=quickTeamFromPreset(account.accountPresets.find(p=>p.gameMode==='rta'),account),scope=balanceInventory(account,team,{},[100]);assert.equal(scope.blocked.size,0);assert.equal(scope.byId.get(100).owner,1);assert.equal(scope.byId.get(1).owner,0);
 const r=searchTeamBalance(account,team);assert.ok(r.baseline.builds.every(b=>b.runeIds.every(id=>id>=100)));assert.equal(r.baseline.builds[0].unitId,2);
});
function timingFixture(){const {team}=fixture();team.configs=team.configs.map((c,i)=>({...c,masterId:[26811,29701,18311][i],label:['Adriana','Rigna','Mihyang'][i]}));team.leaderKey=team.configs[2].key;const builds=[300,299,150].map((spd,i)=>({key:team.configs[i].key,stats:{combat:{spd,rawSpd:spd}},counts:{}}));return {team,builds};}
test('partial strict link and approximate tail preserve leader independence and real integer ticks',()=>{
 const {team,builds}=timingFixture();team.balanceLinks={[`${team.configs[0].key}>${team.configs[1].key}`]:'strict'};const t=balanceTiming(team,builds);assert.equal(t.orderMet,true);assert.equal(t.links[0].mode,'strict');assert.equal(t.links[0].met,true);assert.equal(t.links[1].mode,'near');assert.equal(t.links[1].met,false);assert.ok(t.preview.turns.every(t=>Number.isInteger(t.tick)));assert.equal(team.leaderKey,team.configs[2].key);
});
test('Adriana supplies SPD buff without fictitious ATB; readiness differs from an otherwise identical stripper',()=>{
 const {team,builds}=timingFixture(),withBuff=balanceTiming(team,builds);team.configs[0].masterId=18612;const withoutBuff=balanceTiming(team,builds);assert.equal(grantsTeamSpeedBuff(26811),true);assert.equal(grantsTeamSpeedBuff(26311),true);assert.equal(grantsTeamSpeedBuff(18913),false);const key=team.configs[2].key;assert.ok(withBuff.preview.scenario.firstReady.find(t=>t.key===key).tick<withoutBuff.preview.scenario.firstReady.find(t=>t.key===key).tick);
});
test('all-approximate links permit cuts; strict requirements are validated against the explicit enemy scenario',()=>{
 const {team,builds}=timingFixture();const near=balanceTiming(team,builds);assert.ok(near.links.every(l=>l.mode==='near'));team.enemyCombatSpd=100;const slow=balanceTiming(team,builds.map((b,i)=>i===2?{...b,stats:{combat:{spd:250,rawSpd:250}}}:b));assert.equal(slow.automaticReference,false);assert.equal(slow.referenceSpeed,100);assert.equal(slow.links[1].met,true);
});
test('apply recomputes values, checks stale inputs, rejects duplicate/forged gear, and cannot mutate base account',()=>{
 const {account,team,report}=solved(),p=report.alternatives.find(p=>p.eligible),before=JSON.stringify(account);p.builds[0].stats.total.spd=999999;const plan=validateBalanceProposal(account,team,{},[],[],report.signature,p);assert.notEqual(plan.configs[0].manual.sheet.spd,999999);assert.equal(plan.plannedRunes.accountStamp,`${account.id}:${account.importedAt}`);assert.equal(plan.leaderKey,team.leaderKey);assert.equal(JSON.stringify(account),before);
 assert.throws(()=>validateBalanceProposal(account,{...team,name:'edited'},{},[],[],report.signature,p),/mudaram/);const duplicate=structuredClone(p);duplicate.builds[1].runeIds=duplicate.builds[0].runeIds;assert.throws(()=>validateBalanceProposal(account,team,{},[],[],report.signature,duplicate),/repetidas/);const missing=structuredClone(p);missing.builds[0].runeIds[0]=99999999;assert.throws(()=>validateBalanceProposal(account,team,{},[],[],report.signature,missing),/indisponíveis/);
 const projected=balanceTeamForProposal(team,report.alternatives[0]);assert.equal(projected.configs[0].manual.base.hp,account.units.find(u=>u.id===projected.configs[0].unitId).base.hp);
});
test('worker dispatcher reports actual progress, failures and completion with no decorative delays',()=>{
 const {account,team}=fixture(),events=[];handleTeamBalanceRequest({type:'search',account,team},e=>events.push(e));assert.ok(events.some(e=>e.type==='progress'&&e.percent>0&&e.percent<100));assert.equal(events.at(-2).percent,100);assert.equal(events.at(-1).type,'result');assert.ok(events.at(-1).report.checked>0);const errors=[];handleTeamBalanceRequest({type:'search',account:null,team},e=>errors.push(e));assert.equal(errors[0].type,'error');assert.match(errors[0].message,/SWEX/);
});
test('empty selection and missing account fail clearly; free mode retains independent values without rewriting legacy auto mode',()=>{
 const {team}=fixture();assert.throws(()=>searchTeamBalance(null,team),/SWEX/);team.configs[1].masterId=null;assert.throws(()=>searchTeamBalance(quickPresetAccount(),team),/cada slot/);const {team:manual}=fixture();manual.speedMode='free';assert.equal(quickOrderLocked(manual),false);assert.deepEqual(autoTuneQuickTeam(manual).configs.map(c=>c.manual.sheet),manual.configs.map(c=>c.manual.sheet));
});
test('mandatory Violent/Will and SPD main survive the complete joint search and revalidation',()=>{
 const {account,team}=fixture();for(const c of team.configs)c.balance={sets:[{set:13,required:true},{set:15,required:true}],mains:{2:{stat:8,required:true}}};const r=searchTeamBalance(account,team);assert.ok(r.alternatives.some(p=>p.eligible));for(const p of r.alternatives)if(p.eligible){for(const b of p.builds){assert.ok(b.counts[13]>=4&&b.counts[15]>=2);assert.equal(account.runes.find(r=>b.runeIds.includes(r.id)&&r.slot===2).main[0],8);}assert.doesNotThrow(()=>validateBalanceProposal(account,team,{},[],[],r.signature,p));}
});
test('a partially strict search never labels an interrupted pair viable, while allowing the other pair to approximate',()=>{
 const {account,team}=fixture();team.balanceLinks={[`${team.configs[0].key}>${team.configs[1].key}`]:'strict'};const r=searchTeamBalance(account,team);assert.ok(r.checked>0);for(const p of r.alternatives){assert.equal(p.timing.links[0].mode,'strict');assert.equal(p.timing.links[1].mode,'near');if(p.eligible)assert.equal(p.timing.links[0].met,true);else if(!p.timing.links[0].met)assert.ok(p.hard>0);}
});
test('incomplete equipped sheets can still search free gear; an empty inventory is an honest empty result',()=>{
 const {account,team}=fixture();account.runes=[];account.units.forEach(u=>u.runeIds=[]);team.plannedRunes.byConfig={};const r=searchTeamBalance(account,team);assert.equal(r.baseline,null);assert.deepEqual(r.alternatives,[]);assert.equal(r.checked,0);
});
test('visual timing and worker timing use the same scenario and guaranteed speed buff, without changing original manual sheets',()=>{
 const {team}=timingFixture();const before=JSON.stringify(team),timing=balanceCurrentTiming(team);assert.ok(timing.preview.scenario.log.some(e=>e.type==='speed_buff'));assert.equal(JSON.stringify(team),before);assert.ok(timing.preview.scenario.firstReady.every(t=>Number.isInteger(t.tick)));
});

test('calculator exports keep the same real first-rotation ticks, including Adriana SPD buff and reference enemy',()=>{
 const {team}=timingFixture();team.balanceEnabled=true;const expected=balanceCurrentTiming(team),image=createInfographic(team,null);assert.deepEqual(image.turns.map(t=>t.tick),expected.preview.turns.map(t=>t.tick));assert.equal(image.referenceEnemy,expected.referenceSpeed);
});
test('SPD minimum is combat SPD and includes the leader/tower bonus exactly once',()=>{
 const {account,team}=fixture();team.configs[0].balance={minimums:{spd:240}};const r=searchTeamBalance(account,team);assert.ok(r.alternatives.some(p=>p.eligible));for(const p of r.alternatives.filter(p=>p.eligible)){const b=p.builds[0],check=p.checks[team.configs[0].key].find(c=>c.stat==='spd');assert.equal(check.actual,b.stats.combat.spd);assert.ok(check.actual>=240);assert.doesNotThrow(()=>validateBalanceProposal(account,team,{},[],[],r.signature,p));}
});
test('exported balance goals use the chosen minima, distinguish combat SPD and label optional targets',()=>{
 const {account,team}=fixture();team.balanceEnabled=true;team.configs[0].balance={minimums:{spd:240,cr:85},required:{cr:false}};const image=createInfographic(team,account),goals=image.monsters[0].goals;
 assert.deepEqual(goals.find(g=>g.key==='spd'),{key:'spd',value:240,additional:false,combat:true,preferred:false});assert.equal(goals.find(g=>g.key==='cr').value,85);assert.equal(goals.find(g=>g.key==='cr').preferred,true);
 const legacy=createInfographic({...team,balanceEnabled:false},account);assert.equal(legacy.monsters[0].goals.find(g=>g.key==='cr').value,15);
});
