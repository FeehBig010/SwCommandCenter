import test from 'node:test';
import assert from 'node:assert/strict';
import {blankConfig,makeTeam} from '../src/core/data.js';
import {equippedBuild} from '../src/core/optimizer.js';
import {defenseCatalog} from '../src/core/defense-planner.js';
import {accountStamp} from '../src/core/loadouts.js';
import {personalSiegeTeams,siegeGuildRecords,copySiegeToPersonal,siegeRuneConflicts,canEditSiegeRecord,siegeComparisonRows,counterDefenseSeed,runeConflictApplies} from '../src/core/siege-central.js';
import {cleanSiegeCounter} from '../src/core/siege.js';
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

test('rune warnings apply only to defenses or GvG; player labels cannot enable them',()=>{
 const attack={...makeTeam('siege'),mode:'attack',name:'Guild War / GvG attack'};
 assert.equal(runeConflictApplies(attack),false);
 assert.equal(runeConflictApplies({...attack,mode:'defense'}),true);
 assert.equal(runeConflictApplies(attack,null,'gvg'),true);
 assert.equal(runeConflictApplies({...attack,gameMode:'gvg'}),true);
 assert.equal(runeConflictApplies(null),false);
});

test('GvG warnings recognize saved and recent SWEX metadata without treating Siege as GvG',()=>{
 const account={accountPresets:[
  {id:'saved-gvg',sourceKey:'deck_list',sourceMeta:{deck_type:2}},
  {id:'saved-siege',sourceKey:'deck_list',sourceMeta:{deck_type:22}},
  {id:'recent-gvg',sourceKey:'deck_recent_list',sourceMeta:{type:6}},
  {id:'recent-siege',sourceKey:'deck_recent_list',sourceMeta:{type:7}},
 ]};
 for(const [sourceDeckId,expected] of [['saved-gvg',true],['saved-siege',false],['recent-gvg',true],['recent-siege',false],['guild_battle_attack_deck:1',true],['world_guild_battle:1',true],['guildsiege_attack_deck:1',false]]){
  assert.equal(runeConflictApplies({mode:'attack',gameMode:'siege',sourceDeckId},account),expected,sourceDeckId);
 }
});

test('eligible conflict pool ignores ordinary attacks but retains conflicts between defenses and GvG',()=>{
 const {account,record}=fixture(),attack=copySiegeToPersonal(record,account).team,defense={...copySiegeToPersonal(record,account).team,mode:'defense'};
 const eligible=teams=>teams.filter(t=>runeConflictApplies(t,account));
 assert.equal(siegeRuneConflicts(account,eligible([attack,defense])).length,0);
 const secondDefense={...copySiegeToPersonal(record,account).team,mode:'defense'};
 assert.equal(siegeRuneConflicts(account,eligible([attack,defense,secondDefense])).length,18);
 const gvg={...attack,sourceDeckId:'guild_battle_attack_deck:1'};
 assert.equal(siegeRuneConflicts(account,eligible([gvg,defense])).length,18);
});
test('legacy guild URLs resolve to the Central and template export preserves attack/defense role',()=>{
 assert.equal(pageFromLocation({hash:'#/guild'}),'siege');assert.equal(pageFromLocation({hash:'#/siege'}),'siege');const {record}=fixture(),draft=newTemplate();draft.team=record.team;draft.name='Ofensa';const clean=cleanTemplate(draft);assert.equal(clean.team.mode,'attack');assert.equal(defenseCatalog([],null,[clean]).length,0);assert.equal(defenseCatalog([],null,[{...clean,team:{...clean.team,mode:'defense'}}]).length,1);assert.equal(cleanTemplate({...draft,team:{...draft.team,mode:'defense'}}).team.mode,'defense');
});

test('comparison rows group counters with the matching trio and leader, preserving duplicates and unassigned attacks',()=>{
 const {record}=fixture(),defense={...record,key:'defense',name:'Defesa alvo',team:{...record.team,mode:'defense',leader:null}};
 const makeCounter=(key,members=defense.team.configs,leader=null,index=0)=>{
  const counter=cleanSiegeCounter({name:key,offense:record.team,enemyDefense:members,siege:{defenseLeader:leader,defenseLeaderIndex:index}});
  return {...record,key,counter,team:counter.offense};
 };
 const a=makeCounter('A'),b=makeCounter('B',[...defense.team.configs].reverse());
 const leader={stat:'spd',value:24,scope:'guild',element:0},c=makeCounter('C',defense.team.configs,leader,0),d=makeCounter('D',defense.team.configs,leader,1);
 const duplicate=makeCounter('Repeated',[defense.team.configs[0],defense.team.configs[0],defense.team.configs[2]]);
 const source=[a,b,defense,c,d,duplicate,record],snapshot=structuredClone(source),rows=siegeComparisonRows(source);
 assert.equal(rows.length,5);assert.deepEqual(rows[0].attacks.map(r=>r.key),['A','B']);assert.equal(rows[0].name,'Defesa alvo');
 assert.equal(rows.at(-1).members.length,0);assert.equal(rows.at(-1).attacks[0],record);assert.deepEqual(source,snapshot);
 assert.deepEqual(siegeComparisonRows([]),[]);
});

test('inline counter seeds preserve defense speed context and leader without sharing mutable data',()=>{
 const {record}=fixture(),defense={...record,team:{...record.team,mode:'defense',leader:null,configs:record.team.configs.map(c=>({...c,basis:'bonus',goals:{...c.goals,spd:103},maxTick:6}))}};
 const seed=counterDefenseSeed(siegeComparisonRows([defense])[0]);
 assert.equal(seed.enemyDefense[0].bonusSpd,103);assert.equal(seed.enemyDefense[0].maxTick,6);
 const counter=cleanSiegeCounter({name:'Inline',offense:record.team,enemyDefense:seed.enemyDefense,siege:seed});
 assert.equal(counter.enemyDefense[0].bonusSpd,103);assert.equal(counter.enemyDefense[0].maxTick,6);
 assert.equal(counter.siege.defenseLeader,null);seed.enemyDefense[0].sets.push(1);assert.deepEqual(defense.team.configs[0].sets,[13,15]);
 counter.enemyDefense[0].maxTick=1.5;assert.throws(()=>cleanSiegeCounter(counter),/inteiros/);
});

test('cloud counter edits require an author with leadership; local counters stay editable',()=>{
 const {record}=fixture(),counter={...record,counter:{},cloud:true,row:{owner_id:'author'}};
 assert.equal(canEditSiegeRecord(counter,{isLeader:false},{user:{id:'author'}}),false);
 assert.ok(canEditSiegeRecord(counter,{isLeader:true},{user:{id:'author'}}));
 assert.equal(canEditSiegeRecord(counter,{isLeader:true},{user:{id:'other'}}),false);
 assert.ok(canEditSiegeRecord({...counter,cloud:false},{isLeader:false},null));
 assert.equal(canEditSiegeRecord(record,{isLeader:false},{user:{id:'author'}}),false);
});
