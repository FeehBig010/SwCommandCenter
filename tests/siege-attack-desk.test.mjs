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
