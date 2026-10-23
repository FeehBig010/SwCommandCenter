import test from 'node:test';
import assert from 'node:assert/strict';
import {blankConfig,makeTeam} from '../src/core/data.js';
import {equippedBuild} from '../src/core/optimizer.js';
import {defenseCatalog} from '../src/core/defense-planner.js';
import {accountStamp} from '../src/core/loadouts.js';
import {personalSiegeTeams,siegeGuildRecords,copySiegeToPersonal,siegeRuneConflicts,canEditSiegeRecord} from '../src/core/siege-central.js';
import {newTemplate,cleanTemplate} from '../src/core/guild.js';
import {pageFromLocation} from '../src/lib/auth.js';
function fixture(){
 const masters=[18913,19411,13413],account={id:'account',importedAt:'now',towers:{glorySpd:15,guildSpd:5},artifacts:[{id:901,main:[100,1500],subs:[],type:1}],runes:[],units:masters.map((master,i)=>({id:100+i,master,name:['Tiana','Galleon','Lushen'][i],level:40,base:{hp:10000,atk:800,def:600,spd:100,cr:15,cd:50,res:15,acc:0},runeIds:Array.from({length:6},(_,s)=>i*10+s+1),artifactIds:i===0?[901]:[]}))};
 for(const u of account.units)for(let s=1;s<=6;s++)account.runes.push({id:u.runeIds[s-1],slot:s,set:s<=4?13:15,stars:6,level:15,owner:u.id,main:s===2?[8,42]:[1,1000],innate:[],subs:[]});
 const team={...makeTeam('siege'),name:'Modelo da guilda',mode:'attack',towerSpd:0,guildSpd:0,configs:account.units.map(u=>({...blankConfig(),masterId:u.master,label:u.name,sets:[13,15],goals:{...blankConfig().goals,hp:35000,spd:210},basis:'total'}))};
 return {account,record:{key:'template:1',id:'1',kind:'template',name:team.name,team}};
}
test('guild copy hydrates real account equipment and stats while preserving goals independently',()=>{
 const {account,record}=fixture(),source=structuredClone(record),inventory=structuredClone(account);
 // Foreign IDs may collide with a completely different monster on this account.
 record.team.configs[0].unitId=102;record.team.plannedRunes={accountStamp:accountStamp(account),byConfig:{foreign:[999]}};
 const {team,missing}=copySiegeToPersonal(record,account);assert.deepEqual(missing,[]);assert.deepEqual(team.configs.map(c=>c.unitId),[100,101,102]);assert.equal(team.towerSpd,15);assert.equal(team.guildSpd,5);assert.equal(team.mode,'attack');assert.equal(team.plannedRunes,undefined);
 const build=equippedBuild(account,team,team.configs[0]);assert.equal(build.stats.total.spd,142);assert.equal(build.stats.total.hp,16500);assert.deepEqual(build.runeIds,account.units[0].runeIds);
 assert.equal(team.configs[0].goals.hp,35000);team.configs[0].goals.hp=40000;team.configs[0].sets.push(1);assert.equal(record.team.configs[0].goals.hp,35000);assert.deepEqual(record.team.configs[0].sets,source.team.configs[0].sets);assert.deepEqual(account,inventory);assert.notEqual(team.id,record.team.id);
});
test('repeated monsters require distinct exact masters; missing copies remain editable pending slots',()=>{
 const {account,record}=fixture();record.team.configs[1]=structuredClone(record.team.configs[0]);account.units.push({...account.units[0],id:104,level:35});
 assert.deepEqual(copySiegeToPersonal(record,account).team.configs.map(c=>c.unitId),[100,104,102]);account.units.pop();const result=copySiegeToPersonal(record,account);assert.deepEqual(result.missing,['Tiana']);assert.equal(result.team.configs[1].unitId,null);assert.equal(result.team.configs[1].masterId,18913);assert.equal(result.team.configs[1].enabled,true);
 assert.throws(()=>copySiegeToPersonal(record,null),/Importe/);assert.throws(()=>copySiegeToPersonal({...record,team:{...record.team,gameMode:'arena'}},account),/três slots/);
});
test('copying a counter preserves enemy context without foreign equipment or mutable template links',()=>{
 const {account,record}=fixture();record.counter={enemyDefense:[{masterId:19614,label:'Molly'}]};const {team}=copySiegeToPersonal(record,account);assert.deepEqual(team.enemyDefense,record.counter.enemyDefense);team.enemyDefense[0].label='editado';assert.equal(record.counter.enemyDefense[0].label,'Molly');assert.equal(team.sourceAccountId,account.id);
});
test('personal list and rune conflict checker include SWEX equipment, plans, same-team repeats and current optimized builds',()=>{
 const {account,record}=fixture(),a=copySiegeToPersonal(record,account).team,b=copySiegeToPersonal(record,account).team;b.name='Outro time';
 assert.equal(siegeRuneConflicts(account,[a]).length,0);assert.equal(siegeRuneConflicts(account,[a,b]).length,18);
 b.configs[1].enabled=false;b.configs[2].enabled=false;assert.equal(siegeRuneConflicts(account,[a,b]).length,6);
 b.plannedRunes={accountStamp:accountStamp(account),byConfig:{[b.configs[0].key]:[11,12]}};assert.deepEqual(siegeRuneConflicts(account,[a,b]).map(c=>c.runeId),[11,12]);
 b.plannedRunes.accountStamp='old';assert.deepEqual(siegeRuneConflicts(account,[a,b]).map(c=>c.runeId),[1,2,3,4,5,6]);
 const builds=[{teamId:b.id,key:b.configs[0].key,unitId:100,runeIds:[21,22,21]}];assert.deepEqual(siegeRuneConflicts(account,[a,b],builds).map(c=>c.runeId),[21,22]);
 a.configs[1].unitId=100;assert.equal(siegeRuneConflicts(account,[a]).length,6);assert.equal(siegeRuneConflicts(null,[a]).length,0);
 assert.deepEqual(personalSiegeTeams([a,makeTeam('arena'),makeTeam('cairos')]),[a]);
});
test('guild records are scoped to active membership, and common members cannot modify models they own',()=>{
 const {record}=fixture(),row={id:'cloud',name:'Shared',owner_id:'member',guild_id:'g1',visibility:'guild',kind:'template',payload:{version:1,team:record.team}};
 const local={id:'local',name:'Modelo local',team:record.team};const records=siegeGuildRecords([local],[],[row,{...row,id:'private',visibility:'private'},{...row,id:'other',guild_id:'g2'},{...row,id:'arena',payload:{team:makeTeam('arena')}}],'g1');
 assert.deepEqual(records.map(r=>r.key),['cloud:cloud','template:local']);assert.equal(canEditSiegeRecord(records[0],{isLeader:false},{user:{id:'member'}}),false);assert.equal(canEditSiegeRecord(records[0],{isLeader:true},{user:{id:'member'}}),true);assert.equal(canEditSiegeRecord(records[0],{isLeader:true},{user:{id:'other'}}),false);assert.equal(canEditSiegeRecord(records[1],{isLeader:true},{user:{id:'other'}}),true);assert.deepEqual(siegeGuildRecords(),[]);assert.equal(siegeGuildRecords([],[],[row],null).length,0);
});
test('legacy guild URLs resolve to the Central and template export preserves attack/defense role',()=>{
 assert.equal(pageFromLocation({hash:'#/guild'}),'siege');assert.equal(pageFromLocation({hash:'#/siege'}),'siege');const {record}=fixture(),draft=newTemplate();draft.team=record.team;draft.name='Ofensa';const clean=cleanTemplate(draft);assert.equal(clean.team.mode,'attack');assert.equal(defenseCatalog([],null,[clean]).length,0);assert.equal(defenseCatalog([],null,[{...clean,team:{...clean.team,mode:'defense'}}]).length,1);assert.equal(cleanTemplate({...draft,team:{...draft.team,mode:'defense'}}).team.mode,'defense');
});
