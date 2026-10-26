import test from 'node:test';
import assert from 'node:assert/strict';
import {filterSiegeDefenses,siegeKillRanks,siegeCounterContext} from '../src/core/siege-search.js';
import {siegeAccountTimeline} from '../src/core/siege-timeline.js';
import {copySiegeToPersonal} from '../src/core/siege-central.js';
import {tickTimeline} from '../src/core/tick-timeline.js';
import {blankConfig,makeTeam} from '../src/core/data.js';
import {collabMapping} from '../src/core/CollabMapping.js';
import {targetIssue,rebindTargetGoals} from '../src/core/target-goals.js';

const member=(masterId,label,extra={})=>({masterId,label,...extra});
const rows=[
 {key:'seara',members:[member(15713,'Seara'),member(18913,'Tiana'),member(13811,'Camilla')],attacks:[]},
 {key:'sekhmet',members:[member(20512,'Sekhmet'),member(15713,'Seara'),member(19614,'Molly')],attacks:[]},
 {key:'laima',members:[member(15714,'Laima'),member(13811,'Camilla'),member(19614,'Molly')],attacks:[{name:'Seara',team:{configs:[member(15713,'Seara')]}}]},
 {key:'accent',members:[member(10101,'Espadachim Mágica (Água)'),member(20512,'Sekhmet'),member(20512,'Sekhmet')],attacks:[]},
];
function fixture(){
 const units=[15714,20615,13811].map((master,i)=>({id:i+1,master,name:['Laima','Amduat','Camilla'][i],level:40,base:{hp:10000,atk:800,def:600,spd:100,cr:15,cd:50,res:15,acc:0},runeIds:Array.from({length:6},(_,s)=>i*10+s+1),artifactIds:[]}));
 const account={id:'synthetic',towers:{glorySpd:15,guildSpd:0},units,runes:units.flatMap(u=>u.runeIds.map((id,i)=>({id,owner:u.id,slot:i+1,set:1,stars:6,level:15,main:i===1?[8,42]:[1,1000],innate:[],subs:[[8,i===1?0:i===0?39:30,0,0]]}))),artifacts:[]};
 const team={...makeTeam('siege'),name:'Ataque',mode:'attack',towerSpd:15,guildSpd:0,autoOpener:false,configs:units.map(u=>({...blankConfig(u,u.name),masterId:u.master,unitId:u.id,goals:{spd:9999},combatSpd:9999}))};
 return {account,team};
}
test('live search narrows from the first letter using enemy-name prefixes, independently of attack titles',()=>{
 assert.deepEqual(filterSiegeDefenses(rows,{query:'S'}).map(r=>r.key),['seara','sekhmet','accent']);
 assert.deepEqual(filterSiegeDefenses(rows,{query:'SeArA'}).map(r=>r.key),['seara','sekhmet']);
 assert.deepEqual(filterSiegeDefenses(rows,{query:'ara'}),[]);
 assert.deepEqual(filterSiegeDefenses(rows,{query:'magica agua'}).map(r=>r.key),['accent']);
 assert.deepEqual(filterSiegeDefenses(rows,{query:'Seara Molly'}).map(r=>r.key),['sekhmet']);
 assert.equal(filterSiegeDefenses(rows,{query:''}).length,4);
});
test('directed slots override global text, accumulate without positional assumptions and count duplicate monsters',()=>{
 assert.deepEqual(filterSiegeDefenses(rows,{query:'Laima',slots:[15713]}).map(r=>r.key),['seara','sekhmet']);
 assert.deepEqual(filterSiegeDefenses(rows,{slots:[15713,19614]}).map(r=>r.key),['sekhmet']);
 assert.deepEqual(filterSiegeDefenses(rows,{slots:[20512,20512]}).map(r=>r.key),['accent']);
 assert.equal(filterSiegeDefenses(rows,{slots:[20512,20512,20512]}).length,0);
});
test('focus ranks follow faces when grouped defense order differs, including two copies of a monster',()=>{
 const members=[member(1,'A'),member(2,'B'),member(1,'A')],counter={enemyDefense:[members[1],members[0],members[2]],siege:{killOrder:[2,0,1]}};
 assert.deepEqual(siegeKillRanks(members,counter),[3,2,1]);assert.deepEqual(siegeKillRanks(members,null),[null,null,null]);
});
test('timeline uses actual rune stats instead of target goals and retains same-tick grouping',()=>{
 const {account,team}=fixture(),before=structuredClone({account,team}),preview=siegeAccountTimeline(account,team);
 assert.deepEqual(preview.actors.map(a=>a.spd),[316,316,316]);
 assert.deepEqual(tickTimeline(preview).cells.map(c=>[c.tick,c.members.length]),[[5,3]]);
 assert.deepEqual({account,team},before);
});
test('real combat SPD includes the account leader, artifacts and buffs exactly once',()=>{
 const {account,team}=fixture();team.leader={stat:'spd',value:24,scope:'general',element:0};
 team.configs[0].combat={artifactSpd:10,speedBuff:true};
 const preview=siegeAccountTimeline(account,team);
 assert.equal(preview.actors[0].spd,455); // (316 + 24 + 10) * 1.3.
 assert.equal(preview.actors[1].spd,340);
});
test('reference deadlines are plotted without inventing enemy speed or changing combat',()=>{
 const {account,team}=fixture(),original=siegeAccountTimeline(account,team);
 team.enemyDefense=[member(15713,'Seara',{maxTick:4}),member(19614,'Molly'),member(20512,'Sekhmet')];
 const preview=siegeAccountTimeline(account,team),model=tickTimeline(preview);
 assert.equal(preview.actors.length,3);assert.deepEqual(preview.turns,original.turns);
 assert.deepEqual(preview.unknownDefense,['Molly','Sekhmet']);assert.equal(model.cells[0].tick,4);
 assert.equal(model.cells[0].members[0].spd,null);assert.equal(model.cells[0].members[0].referenceOnly,true);
});
test('explicit enemy speeds share the real simulation, without duplicate inferred enemies',()=>{
 const {account,team}=fixture();team.enemyDefense=[member(20615,'Amduat',{bonusSpd:500})];team.combatScenario={enemies:[{master:20615,label:'Amduat',spd:250}],events:[]};
 const preview=siegeAccountTimeline(account,team);
 assert.equal(preview.actors.filter(a=>a.enemy).length,1);
 assert.equal(preview.scenario.firstReady.find(a=>a.enemy).tick,5); // Amduat gains ATB from allied actions.
});
test('a user-supplied enemy speed remains a nameless reference, never an invented defender build',()=>{
 const {account,team}=fixture();team.enemyCombatSpd=320;team.enemyDefense=[member(15713,'Seara')];
 const preview=siegeAccountTimeline(account,team),enemy=preview.actors.find(a=>a.enemy);
 assert.equal(enemy.name,'Referência inimiga');assert.equal(enemy.master,undefined);assert.equal(enemy.spd,320);assert.deepEqual(preview.unknownDefense,['Seara']);
});
test('known bonus SPD and defense leader are used only when saved; missing units do not block other portraits',()=>{
 const {account,team}=fixture();team.enemyDefense=[member(15713,'Seara',{bonusSpd:160})];team.siege={defenseLeader:{stat:'spd',value:24,scope:'general',element:0}};
 const preview=siegeAccountTimeline(account,team);assert.ok(preview.actors.find(a=>a.enemy).spd>260);
 team.configs[1].unitId=null;const partial=siegeAccountTimeline(account,team);
 assert.equal(partial.complete,true);assert.equal(partial.actors.filter(a=>!a.enemy).length,2);assert.deepEqual(partial.missing,['Amduat']);
});
test('Siege clone matches verified collab equivalents, preserves targets and never reuses account instances',()=>{
 const {account,team}=fixture(),[collab,original]=Object.entries(collabMapping)[0];
 account.units[0].master=Number(original);team.configs[0].masterId=Number(collab);
 const complete=copySiegeToPersonal({team,name:'Equivalente'},account).team;
 assert.equal(targetIssue(complete,account),'');
 const imported=complete.configs.map((c,i)=>({...c,key:`imported:${i}`}));
 assert.equal(rebindTargetGoals(complete.target_goals,complete.configs,imported).configs[0].masterId,Number(collab));
 team.configs[1].masterId=Number(collab);
 const source=structuredClone(team),result=copySiegeToPersonal({team,name:'Collab'},account);
 assert.equal(result.team.configs[0].unitId,1);assert.equal(result.team.configs[0].masterId,Number(original));
 assert.equal(result.team.configs[1].unitId,null);assert.ok(result.team.target_goals);assert.deepEqual(team,source);
});

test('grouped defense speed observations are inherited by the copied counter without changing its focus indices',()=>{
 const enemies=[member(15713,'Seara'),member(19614,'Molly'),member(13811,'Camilla')];
 const record={counter:{enemyDefense:enemies,siege:{killOrder:[1,0,2]}}},before=structuredClone(record);
 const resolved=siegeCounterContext(record,[{...enemies[2],combatSpd:270},{...enemies[0],bonusSpd:190},{...enemies[1],maxTick:7}]);
 assert.equal(resolved.counter.enemyDefense[0].bonusSpd,190);assert.equal(resolved.counter.enemyDefense[1].maxTick,7);assert.equal(resolved.counter.enemyDefense[2].combatSpd,270);
 assert.deepEqual(resolved.counter.siege.killOrder,[1,0,2]);assert.deepEqual(record,before);
});
