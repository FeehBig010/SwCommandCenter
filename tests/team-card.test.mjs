import test from 'node:test';
import assert from 'node:assert/strict';
import { blankConfig } from '../src/core/data.js';
import { cardFileName, createTeamCard } from '../src/core/team-card.js';

const member={id:123,master:19614,name:'Molly'};
function team(){return {name:'Molly · Siege',gameMode:'siege',configs:[{...blankConfig(member),sets:[13,15],mains:{2:8,4:2,6:2},goals:{hp:28001,spd:180},lockSpeedSync:true}]};}

test('PNG eligibility rejects incomplete teams, missing copies and repeated account instances',()=>{
 assert.equal(createTeamCard({configs:[]}),null);
 assert.equal(createTeamCard({configs:[blankConfig()]}),null);
 assert.equal(createTeamCard(team(),{units:[]}),null);
 const t=team();t.configs.push({...t.configs[0],key:'other'});
 assert.equal(createTeamCard(t,{units:[member]}),null);
 // A portable recommendation can request two different copies of the same monster.
 assert.equal(createTeamCard(t).monsters.length,2);
});
test('PNG snapshots contain all active requirements, without hidden slots or private identifiers',()=>{
 const t=team();t.configs.push({...blankConfig(),enabled:false});t.inactiveConfigs=[blankConfig()];
 const account={id:'PRIVATE_ACCOUNT',units:[member],runes:['PRIVATE_INVENTORY']};
 const card=createTeamCard(t,account);
 assert.equal(card.monsters.length,1);assert.equal(card.monsters[0].name,'Molly');
 assert.deepEqual(card.monsters[0].sets,[13,15]);assert.deepEqual(card.monsters[0].mains,{2:8,4:2,6:2});
 assert.equal(card.monsters[0].goals.hp,28001);assert.equal(card.monsters[0].lockSpeedSync,true);
 assert.ok(!JSON.stringify(card).includes('PRIVATE'));assert.ok(!('unitId' in card.monsters[0]));
 t.configs[0].goals.hp=99999;t.configs[0].sets.push(3);assert.equal(card.monsters[0].goals.hp,28001);assert.deepEqual(card.monsters[0].sets,[13,15]);
});
test('guild PNG snapshots retain composition metadata and repeated set badges without an account',()=>{
 const t=team();t.configs[0].sets=[1,1,1];t.towerSpd='15';t.leaderSpd=24;t.enemyCombatSpd=280;t.description='Meta da liderança';
 const card=createTeamCard(t);assert.deepEqual(card.monsters[0].sets,[1,1,1]);
 assert.equal(card.description,'Meta da liderança');assert.equal(card.towerSpd,15);assert.equal(card.leaderSpd,24);assert.equal(card.enemyCombatSpd,280);
});
test('download names keep readable team names while removing filesystem separators',()=>{
 assert.equal(cardFileName('Clã D8stino'),'Clã D8stino-SW-CommandCenter.png');
 assert.equal(cardFileName('Siege/Defesa: A?'),'Siege-Defesa- A--SW-CommandCenter.png');
 assert.equal(cardFileName('   '),'Equipe-SW-CommandCenter.png');
});
