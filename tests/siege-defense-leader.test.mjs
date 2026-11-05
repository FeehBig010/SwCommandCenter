import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogLeader} from '../src/core/leader-catalog.js';
import {MONSTER_CATALOG} from '../src/core/monsters.js';
import {normalizeDefenseIdentity} from '../src/core/defense-identity.js';
import {cleanSiegeTarget,personalSiegeConfrontations} from '../src/core/siege-attack-desk.js';
import {cleanSiegeCounter} from '../src/core/siege.js';
import {quickPresetAccount} from './fixtures/quick-presets.mjs';
import {teamFromGameDeck} from '../src/core/account-teams.js';
import {portableTeam,cleanMatchup} from '../src/core/hub.js';
const leader={stat:'spd',value:28,scope:'guild',element:0};
const members=[{masterId:29705,label:'Fiona'},{masterId:27013,label:'Chamomile'},{masterId:27011,label:'Rosemary'}];
test('Fiona uses exact awakened ID with verified 28% guild SPD; unawakened unit remains distinct',()=>{
 assert.deepEqual(catalogLeader(29715),leader);assert.equal(catalogLeader(29705),null);
 assert.equal(MONSTER_CATALOG.find(m=>m.master===29705).name,'Magic Order Swordsinger');assert.equal(MONSTER_CATALOG.find(m=>m.master===29715).name,'Fiona');
 assert.equal(normalizeDefenseIdentity({masterId:29705,label:'Magic Order Swordsinger'}).masterId,29705);
});
test('old manual Fiona defense recovers leader, order and outcomes without touching SWEX or offense',()=>{
 const account=quickPresetAccount(),snapshot=structuredClone(account),offense=portableTeam(teamFromGameDeck(account.accountPresets[0],account),account);
 const target=cleanSiegeTarget({id:'old',members,leaderIndex:0,leader:null});assert.equal(target.members[0].masterId,29715);assert.deepEqual(target.leader,leader);assert.deepEqual(cleanSiegeTarget({...target,leader:null}).leader,leader);
 const raw={name:'Legacy',enemyDefense:members,offense,siege:{defenseLeader:null,defenseLeaderIndex:0,killOrder:[1,0,2]},outcome:'win',notes:'Preservar'};
 for(const clean of [cleanSiegeCounter(raw),cleanMatchup(raw)]){assert.equal(clean.enemyDefense[0].masterId,29715);assert.deepEqual(clean.siege.defenseLeader,leader);assert.deepEqual(clean.siege.killOrder,[1,0,2]);assert.equal(clean.outcome,'win');assert.deepEqual(clean.offense,offense);}
 assert.deepEqual(personalSiegeConfrontations([target],[],[],account)[0].leader,leader);assert.equal(raw.enemyDefense[0].masterId,29705);assert.deepEqual(account,snapshot);
});
