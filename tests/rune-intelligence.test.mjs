import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeRunes,runeBaseSpd,runeQuality,runeGaps,reappEligibility,innatePriority,planReapps,reappSettings} from '../src/core/rune-intelligence.js';
import {normalizeAccount} from '../src/core/data.js';
import {accountSnapshot} from '../src/core/account-snapshot.js';
import {requiresLogin} from '../src/core/navigation-access.js';
const now=Date.parse('2026-11-06T12:00:00Z');
const rune=(id=1,patch={})=>({id,slot:4,set:13,stars:6,level:15,originalQuality:5,quality:5,owner:0,ancient:false,locked:false,main:[2,63],innate:[12,8],subs:[[8,6,0,4],[4,8,0,0],[6,8,0,0],[9,6,0,0]],...patch});
const account=(runes=[rune()],patch={})=>({version:1,id:'A',name:'Conta fictícia',importedAt:new Date(now).toISOString(),units:[],runes,artifacts:[],crafts:[],...patch});
const rawRune=(id=1,patch={})=>({rune_id:id,slot_no:4,set_id:13,class:6,upgrade_curr:15,extra:5,rank:5,occupied_id:0,pri_eff:[2,63],prefix_eff:[12,8],sec_eff:[[8,16,0,5],[4,8,0,0],[6,8,0,0],[9,6,0,0]],...patch});
const rawUnit={unit_id:7,unit_master_id:10111,unit_level:40,class:6,con:500,atk:600,def:600,spd:100,critical_rate:15,critical_damage:50,resist:15,accuracy:0};
function analyze(a,context={}){return analyzeRunes(a,{now,...context});}
test('SWEX deduplicates root/equipped/storage units, preserves original quality and normalized effects without mutating input',()=>{
 const raw={wizard_info:{wizard_id:42},runes:[rawRune()],unit_list:[{...rawUnit,unit_storage:1,runes:[rawRune()]},{...rawUnit,unit_id:8,runes:[rawRune(2,{class:16,extra:15,rank:15})]}],rune_lock_list:[2]};const before=structuredClone(raw),a=normalizeAccount(raw);
 assert.equal(a.runes.length,2);assert.equal(a.units.length,2);assert.equal(a.runes[0].owner,7);assert.equal(a.runes[1].ancient,true);assert.equal(a.runes[1].originalQuality,5);assert.equal(a.runes[1].locked,true);assert.deepEqual(a.runes[0].innate,[12,8]);assert.deepEqual(a.runes[0].subs[0],[8,16,0,5]);assert.equal(runeBaseSpd(a.runes[0]),16);assert.deepEqual(raw,before);
 const copy=accountSnapshot(a);assert.equal(copy.runes[1].originalQuality,5);assert.equal(copy.runes[1].quality,5);assert.deepEqual(copy.runes[0].subs[0],[8,16,0,5]);
});
test('legacy rarity is never inferred from +12 rank or four subs, and private backups keep unknown values unknown',()=>{
 const a=normalizeAccount({runes:[rawRune(1,{extra:undefined})],unit_list:[rawUnit]});assert.equal(a.runes[0].originalQuality,undefined);assert.equal(accountSnapshot(a).runes[0].originalQuality,undefined);const result=analyze(a);assert.equal(result.rows[0].classification,'REVISAR');assert.ok(result.warnings.some(w=>/raridade original/.test(w)));
});
test('IDs deduplicate only inside each account; same rune IDs and builds from another account remain isolated',()=>{
 const a=account([rune(),rune()],{id:'A'}),b=account([rune(1,{ancient:true})],{id:'B'});const report=analyze(a,{teams:[{accountId:'B',plannedRunes:{accountStamp:'B:'+a.importedAt,byConfig:{x:[1]}}}]});assert.equal(report.rows.length,1);assert.equal(report.rows[0].key,'A:1');assert.equal(report.rows[0].classification,'REAPP');assert.equal(analyze(b).rows[0].key,'B:1');assert.equal(analyze(b).summary.ancient,1);assert.equal(report.summary.ancient,0);
});
test('base SPD excludes grind exactly once, also ignores innate and main SPD',()=>{
 assert.equal(runeBaseSpd(rune(1,{main:[8,42],innate:[8,6],subs:[[8,19,0,5]]})),19);assert.equal(runeBaseSpd(rune(1,{subs:[[2,8,0,10]]})),0);
});
test('conservative eligibility requires original Legend 6 stars +12, selected innate, SPD below ceiling and valid set/pool',()=>{
 assert.equal(reappEligibility(rune()).eligible,true);
 for(const patch of [{stars:5},{originalQuality:4},{originalQuality:undefined},{level:9},{level:NaN},{set:25},{set:99},{slot:1,main:[2,63]},{main:[2,0]},{subs:[[2,8],[8,6],[4,8],[9,6]]},{pool:'rta'},{subs:[]},{subs:[[8,6],[8,5],[2,8],[4,8]]},{innate:[12,5]},{innate:[]},{subs:[[8,20],[2,8],[4,8],[9,6]]}])assert.equal(reappEligibility(rune(1,patch)).eligible,false,JSON.stringify(patch));
 assert.equal(reappEligibility(rune(1,{innate:[11,7]}),{advancedInnates:true}).eligible,true);
 for(const [stat,value] of [[12,6],[12,8],[9,5],[9,6],[10,7],[11,8]])assert.equal(innatePriority(rune(1,{innate:[stat,value]})).preferred,true);
 assert.equal(reappEligibility(rune(1,{subs:[[8,21],[10,7],[4,8],[9,6]]}),{maxBaseSpd:22}).eligible,true);
});
test('low speed alone does not condemn a good damage/bulk rune',()=>{
 const r=rune(1,{subs:[[4,32,0,0],[9,18,0,0],[10,28,0,0],[6,24,0,0]]});assert.ok(runeQuality(r)>=75);assert.equal(analyze(account([r])).rows[0].classification,'PROTEGER');
 const fast=rune(2,{subs:[[8,22,0,0],[4,8,0,0],[6,8,0,0],[9,6,0,0]]});assert.equal(analyze(account([fast])).rows[0].classification,'PROTEGER');
});
test('equipped, stale-owner, game lock, local lock, reserved, preset and planned builds stay protected',()=>{
 for(const [a,context] of [
  [account([rune(1,{owner:7})]),{}],[account([rune(1,{locked:true})]),{}],
  [account(),{options:{localLocks:{runeIds:[1]}}}],[account(),{reservedIds:[1]}],
  [account([rune()],{units:[{id:7,name:'Fictício',runeIds:[1]}]}),{options:{localLocks:{unitIds:[7]}}}],
  [account([rune()],{accountPresets:[{name:'Preset',equipment:[{runeIds:[1]}]}]}),{}],
  [account(),{teams:[{name:'Build',plannedRunes:{accountStamp:'A:'+new Date(now).toISOString(),byConfig:{x:[1]}}}]}],
  [account([rune()],{equipmentPools:{rta:{assignments:{7:[1]}}}}),{}]
 ]){const row=analyze(a,context).rows[0];assert.equal(row.classification,'PROTEGER');assert.equal(row.improvements.length,0);}
 const equipped=account([rune(1,{owner:7})]);assert.equal(analyze(equipped,{settings:{protectEquipped:false}}).rows[0].protected,false);
});
test('gaps separate normal/Ancient, exact set/slot/main and show honest averages, deficits and distribution',()=>{
 const rows=[rune(),rune(2,{subs:[[8,24,0,5],[4,16,0,0],[6,8,0,0],[9,6,0,0]]}),rune(3,{ancient:true}),rune(4,{main:[10,80]})],g=runeGaps(rows).find(g=>!g.ancient&&g.main===2);assert.equal(g.count,2);assert.equal(g.fast,1);assert.equal(g.meanSpd,15);assert.equal(g.maxSpd,24);assert.equal(g.deficit,2);assert.deepEqual(g.attributes[4],{count:2,mean:12});assert.equal(runeGaps(rows).length,3);assert.equal(runeGaps(rows,{targetSpd:25,targetCount:1}).find(x=>x.key===g.key).deficit,1);
});
test('ranking is deterministic under shuffled inventory and accounts for real scarcity and configured priorities',()=>{
 const a=account([rune(9),rune(2),rune(7)]),before=structuredClone(a),x=analyze(a),y=analyze({...a,runes:a.runes.toReversed()});assert.deepEqual(x.rows.map(r=>[r.rune.id,r.score]),y.rows.map(r=>[r.rune.id,r.score]));assert.deepEqual(x.rows.map(r=>r.rune.id),[2,7,9]);assert.deepEqual(a,before);assert.ok(x.rows[0].factors.some(f=>f.points<0));assert.ok(x.rows[0].factors.some(f=>f.points>0));assert.equal(x.rows[0].score,Math.max(0,Math.min(100,x.rows[0].factors.reduce((s,f)=>s+f.points,0))));
 const base=analyze(account()).rows[0].score,off=analyze(account(),{settings:{prioritySets:[],prioritySlots:[]}}).rows[0].score;assert.equal(base-off,15);
});
test('only compatible legal actual gem/grind stock produces proposals; enchant, main/innate and slot rules are enforced',()=>{
 const crafts=[{id:1,kind:'grind',stat:8,set:13,ancient:false,grade:5,quantity:1},{id:2,kind:'gem',stat:12,set:13,ancient:false,grade:5,quantity:1},{id:3,kind:'grind',stat:8,set:3,ancient:false,grade:5,quantity:1}];
 const r=rune(),a=account([r],{crafts}),before=structuredClone(a),row=analyze(a).rows[0];assert.equal(row.classification,'GEMAR/GRINDAR');assert.ok(row.improvements.some(c=>c.craftId===1&&c.from===10&&c.to===11));assert.ok(row.improvements.every(c=>c.craftId!==2&&c.craftId!==3));assert.deepEqual(a,before);
 assert.equal(analyze(account([rune(1,{ancient:true})],{crafts})).rows[0].improvements.length,0);assert.equal(analyze(account([rune(1,{level:9})],{crafts})).rows[0].improvements.length,0);
 const g=analyze(account([rune(1,{subs:[[8,6,0,5],[3,20,1,0],[6,8,0,0],[9,6,0,0]]})],{crafts:[{id:4,kind:'gem',stat:2,set:13,ancient:false,grade:5,quantity:1}]})).rows[0];assert.ok(g.improvements.every(c=>c.index===1&&c.stat===2));
});
test('planned budgets are manual, pools separate, no success guarantee and one initial attempt per eligible rune',()=>{
 const report=analyze(account([rune(1),rune(2),rune(3,{ancient:true})]),{settings:{normalBudget:1,ancientBudget:200,batchSize:1}});assert.equal(report.plan.normal.plannedAttempts,1);assert.equal(report.plan.normal.remaining,0);assert.equal(report.plan.ancient.plannedAttempts,1);assert.equal(report.plan.ancient.remaining,199);assert.deepEqual(report.plan.ancient.stages[0].runeIds,[3]);assert.equal(planReapps([]).normal.plannedAttempts,0);assert.equal(reappSettings({normalBudget:-4}).normalBudget,0);
});
test('empty and stale inventories report uncertainty, and the module keeps existing local-account authorization rules',()=>{
 assert.equal(analyze(null).rows.length,0);assert.ok(analyze(account([])).warnings.length);assert.ok(analyze(account([rune()],{importedAt:'2020-01-01'})).warnings.some(w=>/antiga/.test(w)));assert.equal(requiresLogin('rune-intelligence'),true);assert.equal(requiresLogin('rune-intelligence',{id:'A'}),false);
});

test('SPD-main runes never create impossible speed-secondary gaps or fake scarcity points',()=>{
 const r=rune(1,{slot:2,main:[8,42],subs:[[2,8,0,0],[4,8,0,0],[6,8,0,0],[9,6,0,0]]}),report=analyze(account([r]));assert.equal(report.gaps[0].speedApplicable,false);assert.equal(report.gaps[0].deficit,0);assert.equal(report.gaps[0].scarcity,0);assert.equal(report.rows[0].factors.find(f=>f.label==='Lacuna da categoria').points,0);assert.ok(report.rows[0].reasons.some(r=>/SPD na principal/.test(r)));
});

test('selected sets and slots are hard Legend-6-star boundaries for lists/planning, with safe migration of old defaults',async()=>{
 const {runeInReappScope,REAPP_DEFAULTS}=await import('../src/core/rune-intelligence.js');
 assert.deepEqual(REAPP_DEFAULTS.prioritySets,[3,10,13,15]);assert.deepEqual(REAPP_DEFAULTS.prioritySlots,[2,3,4,5,6]);
 assert.deepEqual(reappSettings({prioritySets:[3,13,15],prioritySlots:[2,4,6]}).prioritySets,[3,10,13,15]);assert.deepEqual(reappSettings({prioritySets:[3,13,15],selectionVersion:2}).prioritySets,[3,13,15]);assert.deepEqual(reappSettings({prioritySets:[13,10],prioritySlots:[4]}).prioritySets,[13,10]);
 for(const patch of [{set:14},{set:8},{slot:1},{stars:5},{originalQuality:4},{originalQuality:undefined}])assert.equal(runeInReappScope(rune(1,patch)),false,JSON.stringify(patch));
 assert.equal(runeInReappScope(rune(1,{set:10,slot:3})),true);assert.equal(runeInReappScope(rune(),{prioritySets:[]}),false);assert.equal(runeInReappScope(rune(),{prioritySlots:[]}),false);
 const rows=[{classification:'REAPP',rune:rune(1)},{classification:'REAPP',rune:rune(2,{set:14})},{classification:'REAPP',rune:rune(3,{originalQuality:4})},{classification:'REAPP',rune:rune(4,{slot:1})}];assert.equal(planReapps(rows).normal.candidateCount,1);assert.deepEqual(planReapps(rows).normal.stages[0].runeIds,[1]);assert.equal(planReapps(rows,{prioritySets:[]}).normal.plannedAttempts,0);
});
