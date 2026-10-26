import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeDashboard,swexFreshness} from '../src/core/dashboard-analysis.js';
import {extractAccountResources,cleanAccountResources} from '../src/core/account-resources.js';
import {normalizeAccount} from '../src/core/data.js';
import {accountSnapshot} from '../src/core/account-snapshot.js';
import {runeEfficiency} from '../src/core/accountDiagnostic.js';
const rune=(id,extra={})=>({id,slot:(id-1)%6+1,set:13,stars:6,level:15,owner:0,main:[1,2448],innate:[],subs:[[8,18,0,3],[2,8,0,0]],...extra});
function fixture(){
 const units=[1,2,3].map(id=>({id,master:10111,name:`Monstro ${id}`,runeIds:Array.from({length:6},(_,j)=>(id-1)*6+j+1)}));
 const runes=units.flatMap(u=>u.runeIds.map(id=>rune(id,{owner:u.id}))).concat([rune(19),rune(20,{locked:true}),rune(21,{stars:5}),rune(22,{owner:99}),rune(23,{pool:'rta'}),rune(24),rune(25),rune(26),rune(27)]);
 const teams=[{id:'def1',gameMode:'siege',mode:'defense',sourceDeckId:'json1',configs:units.map(u=>({key:`c${u.id}`,unitId:u.id,enabled:true}))},{id:'def2',gameMode:'siege',mode:'defense',configs:[{unitId:1},{unitId:null},{unitId:3}]}];
 return {account:{id:'test',name:'Invocador',importedAt:'2026-10-26T10:00:00Z',units,runes,accountPresets:[],resources:{dimensionalEnergy:{current:92,max:100}}},teams};
}
test('dimensional energy uses its exact SWEX field, retains zero and does not invent a cap',()=>{
 assert.deepEqual(extractAccountResources({dimension_hole_info:{energy:0}}),{dimensionalEnergy:{current:0,max:null}});
 assert.deepEqual(extractAccountResources({dimension_hole_info:{energy:'92',energy_max:100}}),{dimensionalEnergy:{current:92,max:100}});
 assert.deepEqual(extractAccountResources({wizard_info:{wizard_energy:99,darkportal_energy:6}}),{});
 assert.deepEqual(cleanAccountResources({dimensionalEnergy:{current:120,max:100}}),{dimensionalEnergy:{current:120,max:100}});
 for(const current of [null,undefined,'',true,-1,1.3,'oops'])assert.deepEqual(cleanAccountResources({dimensionalEnergy:{current,max:100}}),{});
});
test('normalizer and local snapshot retain only verified resource fields',()=>{
 const raw={wizard_info:{wizard_id:1,wizard_name:'Test'},unit_list:[{unit_id:1,unit_master_id:10111,con:500,atk:500,def:500,spd:100,critical_rate:15,critical_damage:50,resist:15,accuracy:0,attribute:1,unit_level:40,class:6}],runes:[{rune_id:1,slot_no:1,set_id:13,class:6,upgrade_curr:15,pri_eff:[3,160],prefix_eff:[],sec_eff:[]}]};
 const account=normalizeAccount({...raw,dimension_hole_info:{energy:12,max_energy:100,secret:'private'}});
 assert.deepEqual(account.resources,{dimensionalEnergy:{current:12,max:100}});
 assert.deepEqual(accountSnapshot({...account,resources:{...account.resources,token:'private'}}).resources,account.resources);
 assert.equal(normalizeAccount(raw).resources,undefined);
});
test('scanner excludes equipped, reserved, locked, RTA and planned runes and never mutates account',()=>{
 const {account,teams}=fixture();teams.push({id:'plan',configs:[{key:'planned',unitId:1}],plannedRunes:{accountStamp:`${account.id}:${account.importedAt}`,byConfig:{planned:[27]}}});
 account.accountPresets=[{id:'rta',gameMode:'rta',equipment:[{unitId:1,runeIds:[19]}]},{id:'json1',gameMode:'siege',mode:'defense',unitIds:[1,2,3],equipment:[{unitId:1,runeIds:[26]}]}];
 const before=JSON.stringify({account,teams}),report=analyzeDashboard(account,{teams,reservedIds:[24],options:{blockedRuneIds:[25]}});
 assert.deepEqual(report.insights.find(i=>i.kind==='speed').action.runeIds,[19]);
 assert.equal(JSON.stringify({account,teams}),before);
 assert.equal(report.insights.length,3);assert.deepEqual(report.defenses,{total:2,equipped:1,incomplete:1});
 assert.equal(report.insights.find(i=>i.kind==='will').count,3);
 assert.equal(report.insights.find(i=>i.kind==='equipment').action.teamId,'def2');
 assert.deepEqual(report.energy,{current:92,max:100});
});
test('readiness requires distinct units and all six rune slots; Will is a review only on complete teams',()=>{
 const {account,teams}=fixture();account.runes[0].set=15;account.runes[1].set=15;
 let report=analyzeDashboard(account,{teams});assert.equal(report.insights.find(i=>i.kind==='will').count,2);
 teams[0].configs[1].unitId=1;report=analyzeDashboard(account,{teams});assert.equal(report.defenses.equipped,0);assert.equal(report.insights.some(i=>i.kind==='will'),false);
 teams[0].configs[1].unitId=2;account.runes[0].slot=2;assert.equal(analyzeDashboard(account,{teams}).defenses.equipped,0);
});
test('top rune efficiency averages at most 100 eligible runes, excluding grinds like the existing engine',()=>{
 const {account}=fixture();account.runes=Array.from({length:110},(_,i)=>rune(i+1,{subs:[[8,i%25,0,5]]}));
 const expected=account.runes.map(runeEfficiency).sort((a,b)=>b-a).slice(0,100);
 const report=analyzeDashboard(account);assert.equal(report.efficiencySample,100);assert.equal(report.efficiency,Math.round(expected.reduce((a,b)=>a+b,0)/100*10)/10);
 account.runes=[];assert.equal(analyzeDashboard(account).efficiency,null);
});
test('missing areas and energy produce empty honest results',()=>{
 const report=analyzeDashboard({id:1,units:[],runes:[]});assert.equal(report.energy,null);assert.equal(report.defenses.total,0);assert.deepEqual(report.insights,[]);
});
test('SWEX freshness distinguishes recent, old, invalid and future timestamps',()=>{
 const now=Date.parse('2026-10-26T10:00:00Z');
 assert.equal(swexFreshness('2026-10-26T09:00:00Z',now),'fresh');assert.equal(swexFreshness('2026-10-24T09:00:00Z',now),'stale');assert.equal(swexFreshness(null,now),'unknown');assert.equal(swexFreshness('2026-10-27T09:00:00Z',now),'unknown');
});
