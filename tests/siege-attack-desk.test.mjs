import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanSiegeTarget,siegeTargetKey,registerSiegeTarget,personalSiegeConfrontations} from '../src/core/siege-attack-desk.js';
import {quickPresetAccount} from './fixtures/quick-presets.mjs';
import {teamFromGameDeck} from '../src/core/account-teams.js';
import {portableTeam} from '../src/core/hub.js';
import {cleanSiegeCounter} from '../src/core/siege.js';
const members=[{masterId:15713,label:'Seara'},{masterId:18913,label:'Tiana'},{masterId:13411,label:'Galleon'}];
test('personal enemy catalog validates three IDs and preserves leader while normalizing nonleaders',()=>{
 const t=cleanSiegeTarget({members,leaderIndex:0,leader:null});
 assert.equal(siegeTargetKey(t),siegeTargetKey({...t,members:[members[0],members[2],members[1]]}));
 assert.notEqual(siegeTargetKey(t),siegeTargetKey({...t,leaderIndex:1}));
 assert.throws(()=>cleanSiegeTarget({members:[null,{},null]}),/Complete/);
 assert.throws(()=>cleanSiegeTarget({members:[],leaderIndex:0}),/três/);
 assert.throws(()=>cleanSiegeTarget({members,leaderIndex:3}),/líder/);
 const result=registerSiegeTarget([t],{...t,id:'another'});assert.equal(result.targets.length,1);assert.equal(result.duplicate,true);
});
test('empty defenses survive without counters, no outcomes invented; own defenses never become enemy targets',()=>{
 const account=quickPresetAccount(),team=teamFromGameDeck(account.accountPresets[0],account),target=cleanSiegeTarget({members,leaderIndex:0,leader:null});
 const snapshot=structuredClone(team),counter={...cleanSiegeCounter({name:'Meu ataque',offense:portableTeam(team,account),enemyDefense:members,siege:{defenseLeader:null}}),id:'local',personalTeamId:team.id};
 const rows=personalSiegeConfrontations([target],[counter],[{...team,mode:'defense'}],account);
 assert.equal(rows.length,1);assert.equal(rows[0].attacks.length,1);assert.equal(rows[0].attacks[0].counter.outcome,'unrecorded');assert.equal(rows[0].attacks[0].personalTeamId,team.id);
 assert.equal(personalSiegeConfrontations([target],[],[],account)[0].attacks.length,0);
 assert.deepEqual(personalSiegeConfrontations([],[],[{...team,mode:'defense'}],account),[]);assert.deepEqual(team,snapshot);
 assert.equal(personalSiegeConfrontations([null,target],[],[],account).length,1);
});

test('authorized guild defenses merge into the same live search without duplicating local counters or changing shared data',()=>{
 const account=quickPresetAccount(),team=teamFromGameDeck(account.accountPresets[0],account),counter={...cleanSiegeCounter({name:'Meu ataque',offense:portableTeam(team,account),enemyDefense:members,siege:{defenseLeader:null}}),id:'mine'};
 const local={key:'local:mine',id:'mine',name:'Meu ataque',counter,team:counter.offense};
 const guild={...local,key:'cloud:authorized',id:'authorized',cloud:true,row:{guild_id:'authorized'},name:'Ataque da guilda'};
 const other={...guild,key:'cloud:another',name:'Outra defesa',counter:{...counter,enemyDefense:[members[2],members[0],members[1]]}};
 const snapshot=structuredClone([guild,other]);
 const rows=personalSiegeConfrontations([], [counter], [],account,[local,guild,other]);
 assert.equal(rows.length,2);assert.equal(rows[0].attacks.length,2);assert.deepEqual(rows[0].sources,['Meu acervo','Guilda']);
 assert.equal(rows[0].attacks[1].sharedSource,true);assert.deepEqual([guild,other],snapshot);
});

test('editing a personal defense preserves offense, clears stale results on identity change and leaves guild records untouched',async()=>{
 const {editSiegeConfrontation}=await import('../src/core/siege-attack-desk.js');
 const account=quickPresetAccount(),team=teamFromGameDeck(account.accountPresets[0],account),target=cleanSiegeTarget({members,leaderIndex:0,leader:null});
 const counter={...cleanSiegeCounter({name:'Attack',offense:portableTeam(team,account),enemyDefense:members,siege:{defenseLeader:null,killOrder:[2,0,1]}}),id:'old',outcome:'win',personalTeamId:team.id};
 const guild={key:'cloud:test',id:'shared',name:'Shared',cloud:true,counter,team:counter.offense};
 const row=personalSiegeConfrontations([target],[counter],[],account,[guild])[0],snapshot=structuredClone({counter,guild,team});
 const reordered={...target,members:[members[0],members[2],members[1]]};
 const same=editSiegeConfrontation({targets:[target],matchups:[counter],teams:[team],row,target:reordered});
 assert.equal(same.changed,false);assert.equal(same.matchups[0].id,'old');assert.deepEqual(same.matchups[0].siege.killOrder,[1,0,2]);
 const changed=editSiegeConfrontation({targets:[target],matchups:[counter],teams:[team],row,target:{...target,members:[members[0],members[1],{masterId:10101,label:'Novo'}]}});
 assert.equal(changed.changed,true);assert.notEqual(changed.matchups[0].id,'old');assert.equal(changed.matchups[0].outcome,'unrecorded');assert.deepEqual(changed.matchups[0].offense,counter.offense);assert.equal(changed.matchups[0].personalTeamId,team.id);assert.deepEqual(changed.matchups[0].siege.killOrder,[0,1]);assert.deepEqual({counter,guild,team},snapshot);
 assert.throws(()=>editSiegeConfrontation({row:{...row,sources:['Guilda']},target}),/apenas/);
});
