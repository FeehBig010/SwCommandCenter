import test from 'node:test';import assert from 'node:assert/strict';
import {STATS,blankConfig,DEFAULT_OPTIONS} from '../src/core/data.js';
import {defenseResourcePolicy,defenseRuneIds,filteredDefenseInventory,jsonDefenseTeams,improveJsonDefenses,verifyDefenseImprovements,applyDefenseImprovements} from '../src/core/defense-resources.js';
import {autoFillTeam} from '../src/core/team-autofill.js';
import {orderRuneSets} from '../src/core/rune-sets.js';
import {generateCandidates} from '../src/core/optimizer.js';
function fixture(){
 const units=Array.from({length:4},(_,i)=>({id:100+i,master:[19614,28515,28212,13413][i],name:['Molly','Vritra','Solveig','Lushen'][i],level:40,element:1,base:{hp:10000,atk:800,def:650,spd:100,cr:15,cd:50,res:15,acc:0},runeIds:Array.from({length:6},(_,s)=>i*10+s+1),artifactIds:[]}));
 const runes=units.flatMap((u,i)=>u.runeIds.map((id,s)=>({id,slot:s+1,set:1,level:15,stars:6,owner:u.id,main:[1,100],innate:[],subs:s===1?[[8,[10,5,1,99][i],0,0]]:[],locked:false})));runes.push({id:900,slot:2,set:1,level:15,stars:6,owner:0,main:[1,100],innate:[],subs:[[8,20,0,0]],locked:false});
 return {id:'account',importedAt:'stamp',units,runes,artifacts:[],towers:{glorySpd:15,guildSpd:0},accountPresets:[{id:'defense',name:'Defesa do JSON',gameMode:'siege',mode:'defense',unitIds:[100,101,102],missingIds:[]},{id:'attack',name:'Ataque do JSON',gameMode:'siege',mode:'attack',unitIds:[103,null,null],missingIds:[]}]};
}
test('restricted inventory removes every defense rune, preserves attacks/free runes and does not mutate SWEX',()=>{
 const a=fixture(),before=structuredClone(a),ids=defenseRuneIds(a),policy=defenseResourcePolicy(a,'restricted'),filtered=filteredDefenseInventory(a,policy);assert.equal(ids.length,18);assert.equal(filtered.runes.length,7);assert.ok(filtered.runes.every(r=>!ids.includes(r.id)));assert.equal(filtered.units[0].runeIds.length,0);assert.equal(filtered.units[3].runeIds.length,6);assert.deepEqual(a,before);assert.equal(filteredDefenseInventory(a,{...policy,accountStamp:'old'}),a);
 const result=generateCandidates(a,a.units[3],{...blankConfig(a.units[3]),sets:[]},{...DEFAULT_OPTIONS,minLevel:0,depth:'fast',blockedRuneIds:ids});assert.ok(result.candidates.length);assert.ok(result.candidates.every(b=>b.runeIds.every(id=>!ids.includes(id))));
});
test('simultaneous safe upgrades propagate freed gear to weaker defenders and never borrow attack runes',()=>{
 const a=fixture(),before=structuredClone(a),p=improveJsonDefenses(a,{depth:'fast'});assert.equal(p.safe,true);assert.ok(p.changes>=3);assert.ok(Object.values(p.assignments).some(ids=>ids.includes(900)));assert.deepEqual(p.members.map(m=>m.after.spd).sort((x,y)=>x-y),[105,110,120]);assert.ok(!Object.values(p.assignments).flat().includes(32));assert.equal(new Set(Object.values(p.assignments).flat()).size,18);for(const m of p.members)for(const k of STATS)assert.ok(m.after[k]>=m.before[k]);assert.deepEqual(a,before);
 const applied=applyDefenseImprovements(a,jsonDefenseTeams(a),p);assert.deepEqual(Object.values(applied[0].plannedRunes.byConfig).flat().sort((x,y)=>x-y),Object.values(p.assignments).flat().sort((x,y)=>x-y));assert.deepEqual(a,before);
});
test('donors cannot lose original HP/DEF/SPD or completed sets, and local locks are hard constraints',()=>{
 const a=fixture();a.runes=a.runes.filter(r=>r.id!==900);a.runes.find(r=>r.id===12).main=[1,1000];a.runes.find(r=>r.id===2).subs=[[8,1,0,0]];a.runes.find(r=>r.id===12).subs=[[8,20,0,0]];
 const p=improveJsonDefenses(a,{localLocks:{unitIds:[102],runeIds:[]}});assert.equal(p.changes,0);assert.deepEqual(p.assignments[101],a.units[1].runeIds);assert.deepEqual(p.assignments[102],a.units[2].runeIds);
 const b=fixture(),locked=improveJsonDefenses(b,{localLocks:{unitIds:[100,101,102],runeIds:[]}});assert.equal(locked.changes,0);
 const c=fixture();c.runes.find(r=>r.id===900).set=13;assert.equal(improveJsonDefenses(c).changes,0);
});
test('application revalidates baseline, foreign resources, duplicate rune IDs and tampered floors',()=>{
 const a=fixture(),p=improveJsonDefenses(a);const foreign=structuredClone(p);foreign.assignments[100][1]=32;assert.throws(()=>verifyDefenseImprovements(a,foreign),/reserva|recursos/);
 const duplicate=structuredClone(p);duplicate.assignments[100][1]=duplicate.assignments[101][1];assert.throws(()=>verifyDefenseImprovements(a,duplicate),/reserva|recursos/);
 const stale=structuredClone(a);stale.importedAt='new';assert.throws(()=>applyDefenseImprovements(stale,[],p),/mudou/);
 const low=structuredClone(p);const next=structuredClone(a);next.runes.find(r=>r.id===900).main=[1,0];low.signature=p.signature;assert.throws(()=>verifyDefenseImprovements(next,low),/mudou/);
 const extra=structuredClone(p);extra.assignments[999]=[];assert.throws(()=>verifyDefenseImprovements(a,extra),/incompatíveis/);
});
test('autofill uses selected loadout and basis for all synchronized controls while retaining custom targets',()=>{
 const a=fixture(),t=jsonDefenseTeams(a)[0];t.configs[0].basis='bonus';t.configs[0].goals.hp=99999;t.configs[0].sets=[15,13];const before=structuredClone(t),filled=autoFillTeam(t,a);assert.equal(filled.configs[0].goals.hp,99999);assert.equal(filled.configs[0].goals.spd,10);assert.equal(filled.configs[0].goals.def,0);assert.equal(filled.configs[0].goals.cr,15);assert.deepEqual(filled.configs[0].sets,[13,15]);assert.ok(STATS.every(k=>filled.configs[1].goals[k]!==''));assert.deepEqual(t,before);assert.deepEqual(orderRuneSets([1,15,13]),[13,1,15]);assert.deepEqual(orderRuneSets([15,3]),[3,15]);
});
test('bounded search and malformed defense loadouts return honest results without changing the inventory',()=>{
 const a=fixture(),p=improveJsonDefenses(a,{},[],()=>{},{maxEvaluations:0});assert.equal(p.exhausted,true);assert.equal(p.changes,0);assert.equal(p.safe,true);a.units[0].runeIds.pop();assert.throws(()=>improveJsonDefenses(a),/seis runas/);assert.deepEqual(defenseRuneIds(null),[]);assert.equal(jsonDefenseTeams(null).length,0);
});
test('selecting an improved loadout refreshes only auto-filled targets and keeps manual goals',()=>{
 const a=fixture(),t=autoFillTeam(jsonDefenseTeams(a)[0],a),first=t.configs[0];first.goals.hp=77777;t.plannedRunes={accountStamp:'account:stamp',byConfig:{[first.key]:a.units[0].runeIds.map(id=>id===2?900:id)}};
 const refreshed=autoFillTeam(t,a);assert.equal(refreshed.configs[0].goals.hp,77777);assert.equal(refreshed.configs[0].goals.spd,120);
});
