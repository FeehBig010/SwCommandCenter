import test from 'node:test';
import assert from 'node:assert/strict';
import * as quick from '../src/core/quick-calculator.js';
const config=(i,master=13413)=>{const c=quick.quickConfig(master,`M${i}`);c.key=`slot-${i}`;c.manual.base.spd=100;c.manual.sheet.spd=100;return c;};
const team=(mode='free',masters=[13413,13911,19614])=>({...quick.quickTeam(),speedMode:mode,configs:masters.map((m,i)=>config(i,m))});
const pin=(t,i,tick)=>quick.updateQuickTickTarget(t,t.configs[i].key,tick);
const ready=(t,i)=>quick.quickPreview(t,{includeReference:false,captureReadiness:true}).scenario.firstReady.find(r=>r.key===t.configs[i].key)?.tick;

test('tick6 finds the minimum integer rune SPD, measures readiness separately from queued action and does not mutate',()=>{
 const original=team(),before=structuredClone(original),t=pin(original,0,6),c=t.configs[0];
 assert.equal(quick.quickRuneSpeed(c),124);assert.equal(quick.quickSpeedTarget(t,c).combatSpd,239);assert.equal(c.tickTarget,6);assert.equal(c.tickAudit.status,'met');assert.equal(c.tickAudit.readyTick,6);
 const less=structuredClone(t);less.configs[0].manual.sheet.spd--;assert.equal(ready(less,0),7);assert.deepEqual(original,before);
 const both=pin(t,1,6);assert.equal(both.configs[1].tickAudit.readyTick,6);assert.equal(both.configs[1].tickAudit.actionTick,7);
});
test('leader Swift artifacts and buffs use the combat engine exactly once and recalculate pinned runes',()=>{
 let t=pin(team(),0,6);t=quick.toggleQuickSwift(t,'slot-0',true);assert.equal(quick.quickRuneSpeed(t.configs[0]),99);
 t=quick.autoTuneQuickTeam({...t,leaderSpd:24,configs:t.configs.map((c,i)=>i?c:{...c,combat:{artifactSpd:12}})});
 assert.equal(quick.quickRuneSpeed(t.configs[0]),63);assert.equal(quick.quickSpeedTarget(t,t.configs[0]).combatSpd,239);
 t=quick.autoTuneQuickTeam({...t,configs:t.configs.map((c,i)=>i?c:{...c,combat:{...c.combat,speedBuff:true}})});assert.ok(quick.quickRuneSpeed(t.configs[0])<63);assert.equal(t.configs[0].tickAudit.readyTick,6);
});
test('Bernard boost lets a pinned follower reach tick6 with less SPD and automatic followers respect the pin',()=>{
 let t=team('auto',[11513,19411,13911]);t=pin(t,0,6);t=pin(t,1,6);
 assert.equal(t.configs[1].tickTarget,6);assert.equal(t.configs[1].tickAudit.status,'met');assert.ok(quick.quickRuneSpeed(t.configs[1])<124);assert.equal(ready(t,1),6);
 assert.equal(t.configs[1].syncMinimum,null);assert.equal(t.configs[2].autoSpeed,true);
 const speeds=t.configs.map(c=>c.manual.sheet.spd);t=quick.autoTuneQuickTeam(t);assert.deepEqual(t.configs.map(c=>c.manual.sheet.spd),speeds);
});
test('multiple targets expose actual final readiness and unsafe conflicting order rather than false synchronization',()=>{
 let t=pin(team('auto'),0,8);t=pin(t,1,4);
 assert.equal(t.configs[0].tickAudit.readyTick,8);assert.equal(t.configs[1].tickAudit.readyTick,4);assert.equal(t.syncAudit.safe,false);assert.equal(t.configs[0].tickTarget,8);assert.equal(t.configs[1].tickTarget,4);
 for(let i=0;i<2;i++)assert.equal(t.configs[i].tickAudit.readyTick,ready(t,i));
});
test('invalid targets and empty slots are ignored; unreachable bounds retain last usable speed with an honest audit',()=>{
 const original=team();for(const n of ['',0,-1,31,1.5,'invalid',Infinity])assert.equal(quick.updateQuickTickTarget(original,'slot-0',n),original);
 const empty=quick.quickTeam();assert.equal(quick.updateQuickTickTarget(empty,empty.configs[0].key,6),empty);
 const t=pin(original,0,1);assert.equal(t.configs[0].manual.sheet.spd,100);assert.equal(t.configs[0].tickAudit.status,'unreachable');assert.equal(t.configs[0].tickAudit.readyTick,13);assert.match(t.configs[0].tickAudit.reason,/600/);
});
test('a selected monster converts with empty teammates while preserving original scenario slot references',()=>{
 const t=quick.quickTeam();t.configs[1]=config(1);const next=pin(t,1,6);assert.equal(next.configs[1].tickAudit.readyTick,6);assert.equal(next.configs[1].tickAudit.partial,true);assert.equal(next.configs[1].manual.sheet.spd,224);assert.equal(next.syncAudit?.safe??false,false);
 t.configs[2]=config(2);t.configs[2].manual.sheet.spd=300;t.combatScenario={events:[{afterKey:'ally:2',type:'boost',amount:50,targets:['ally:1']}]};const boosted=pin(t,1,6);assert.equal(quick.quickRuneSpeed(boosted.configs[1]),5);assert.equal(boosted.configs[1].tickAudit.readyTick,6);assert.equal(boosted.configs[1].tickAudit.partial,true);
});
test('forced below-threshold turns and dead units cannot produce a successful full-bar target',()=>{
 const leo=pin(team('free',[16613]),0,1);assert.notEqual(leo.configs[0].tickAudit.status,'met');assert.equal(leo.configs[0].manual.sheet.spd,100);
 const dead=team();dead.configs[0].combat={hpPercent:0};const t=pin(dead,0,6);assert.equal(t.configs[0].tickAudit.status,'unreachable');assert.equal(t.configs[0].manual.sheet.spd,100);
});
test('manual SPD edits switch a pin back to SPD without changing default automatic follower protection',()=>{
 const normal=quick.autoTuneQuickTeam(team('auto'));assert.equal(quick.updateQuickRuneSpeed(normal,'slot-1',50).configs[1].manual.sheet.spd,normal.configs[1].manual.sheet.spd);
 const pinned=pin(normal,1,6),manual=quick.updateQuickRuneSpeed(pinned,'slot-1',70);assert.equal(manual.configs[1].tickTarget,null);assert.equal(quick.quickRuneSpeed(manual.configs[1]),70);assert.equal(manual.configs[1].autoSpeed,false);
 const selected=quick.selectQuickMonster(pinned.configs[1],{master:13911,name:'Julie'});assert.equal(selected.tickTarget,undefined);assert.equal(quick.quickRuneSpeed(selected),0);
});
test('an unmet tick pin never claims team synchronization even when the current slow order is safe',()=>{
 const t=pin(team('auto'),0,1);assert.equal(t.configs[0].tickAudit.status,'unreachable');assert.equal(t.syncAudit.safe,false);
});
test('explicit scenario boost uses original ally slots and reports invalid references without fabricating readiness',()=>{
 let t=team();t.combatScenario={events:[{afterKey:'ally:0',type:'boost',amount:50,targets:['ally:1']}]};t=pin(pin(t,0,6),1,6);assert.equal(quick.quickRuneSpeed(t.configs[1]),5);assert.equal(t.configs[1].tickAudit.readyTick,6);
 const invalid=team();invalid.combatScenario={events:[{afterKey:'ally:5',type:'boost',amount:50,targets:['ally:1']}]};const result=pin(invalid,1,6);assert.equal(result.configs[1].tickAudit.status,'unsupported');assert.equal(result.configs[1].manual.sheet.spd,100);assert.equal(result.syncAudit.safe,false);
});
test('a preset hole marked disabled still reports partial context and never full-team synchronization',()=>{
 const t=quick.quickTeam();t.speedMode='snapshot';t.configs[0]=config(0);t.configs[1].enabled=false;t.configs[2].enabled=false;const result=pin(t,0,6);assert.equal(result.configs[0].tickAudit.partial,true);assert.equal(result.syncAudit.safe,false);
});
test('a displayed inventory proposal measures its own tick rather than inheriting the manual target audit',()=>{
 const t=pin(team(),0,6),displayed={...t,configs:t.configs.map((c,i)=>i?c:{...c,manual:{...c.manual,sheet:{...c.manual.sheet,spd:100}}})};
 assert.equal(displayed.configs[0].tickAudit.readyTick,6);const preview=quick.quickPreview(displayed,{includeReference:false,captureReadiness:true}),observation=quick.quickTickObservation(displayed.configs[0],preview);
 assert.equal(observation.readyTick,13);assert.equal(observation.actionTick,13);assert.equal(observation.met,false);assert.equal(t.configs[0].tickAudit.readyTick,6);
});

test('explicitly applying a real validated inventory alternative preserves its sheets and rune identities and leaves tick input mode',async()=>{
 const {quickPresetAccount}=await import('./fixtures/quick-presets.mjs'),{quickTeamFromPreset}=await import('../src/core/quick-presets.js'),{searchTeamBalance,validateBalanceProposal}=await import('../src/core/team-balance.js');
 const account=quickPresetAccount();let t=quickTeamFromPreset(account.accountPresets[0],account);t.balanceLinks=Object.fromEntries(t.configs.slice(1).map((c,i)=>[`${t.configs[i].key}>${c.key}`,'near']));t=quick.updateQuickTickTarget(t,t.configs[0].key,6);
 const report=searchTeamBalance(account,t,{},[],[]),eligible=report.alternatives.filter(p=>p.eligible);assert.ok(eligible.length>0);assert.deepEqual(eligible[0].builds.map(b=>b.stats.total.spd),[242,207,199]);
 for(const proposal of eligible){const plan=validateBalanceProposal(account,t,{},[],[],report.signature,proposal),before=structuredClone(plan),applied=quick.autoTuneQuickTeam(quick.applyQuickInventoryPlan(plan));assert.deepEqual(applied.configs.map(c=>c.manual.sheet),plan.configs.map(c=>c.manual.sheet));assert.deepEqual(applied.plannedRunes,plan.plannedRunes);assert.ok(applied.configs.every(c=>c.tickTarget==null));assert.deepEqual(plan,before);const deliberate=quick.updateQuickTickTarget(applied,applied.configs[0].key,6);assert.equal(deliberate.configs[0].tickTarget,6);assert.equal(deliberate.configs[0].tickAudit.status,'met');}
});
test('incapacitated consumed turns preserve readiness but never masquerade as actions in manual or proposal audit',()=>{
 const input=team();input.configs[0].combat={disabled:true};const t=pin(input,0,6),audit=t.configs[0].tickAudit;assert.equal(audit.readyTick,6);assert.equal(audit.actionTick,null);assert.equal(audit.disabledTurnTick,6);assert.equal(audit.status,'met');assert.equal(t.syncAudit.safe,false);
 const observed=quick.quickTickObservation(t.configs[0],quick.quickPreview(t,{includeReference:false,captureReadiness:true}));assert.equal(observed.readyTick,6);assert.equal(observed.actionTick,null);assert.equal(observed.disabledTurnTick,6);assert.equal(observed.met,true);
});
