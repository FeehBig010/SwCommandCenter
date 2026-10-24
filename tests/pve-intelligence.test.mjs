import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAccount,STATS} from '../src/core/data.js';
import {teamFromGameDeck,selectPvePreset} from '../src/core/account-teams.js';
import {hydratePveTeam,pveMemberStats,pveHydrationKey,raidFrontlineReport,bossAccuracyTarget} from '../src/core/pve-intelligence.js';
import {cairosAccuracyTarget} from '../src/core/cairos-checklist.js';

function fixture(){return normalizeAccount({wizard_id:1,runes:[],unit_list:Array.from({length:6},(_,i)=>({unit_id:i+1,unit_master_id:18913,unit_level:40,class:6,con:700+i*100,atk:800,def:650,spd:100+i,critical_rate:15,critical_damage:50,resist:15,accuracy:10+i,runes:Array.from({length:6},(_,j)=>({rune_id:i*6+j+1,slot_no:j+1,set_id:j<4?3:15,class:6,upgrade_curr:15,pri_eff:j===1?[8,42]:[1,100],sec_eff:[]})),artifacts:i===0?[{rid:1,type:1,attribute:3,pri_eff:[100,1500],sec_eff:[]}]:[]})),deck_list:[{deck_id:1,dungeon_id:8001,floor:12,unit_id_list:[1,2,3,4,5]},{deck_id:2,dungeon_id:8001,floor:12,unit_id_list:[6,null,2,3,4]},{deck_id:3,dungeon_id:9001,unit_id_list:[6,5,4,3,2]},{deck_id:4,dungeon_name:'ToA Hard',unit_id_list:[1,2,3,4,5]}],raid_deck:{party_id:'alpha',unit_id_list:[1,2,0,0,3,4,5,6]}});}
test('PvE source presets hydrate all eight real stats and preserve user goals across selections',()=>{
 const account=fixture(),decks=account.accountPresets.filter(p=>p.dungeon==='gbah'),first=hydratePveTeam(teamFromGameDeck(decks[0],account),account);
 assert.equal(first.configs.length,5);
 for(const c of first.configs){const current=pveMemberStats(account,first,c);for(const stat of STATS)assert.equal(c.goals[stat],current.stats.total[stat]);}
 assert.equal(first.configs[0].goals.hp,12500); // Base + rune flats + artifact.
 first.configs[0].goals.hp='90000';const signature=pveHydrationKey(first,account);first.configs[0].goals.spd='';assert.equal(pveHydrationKey(first,account),signature,'typing/clearing does not retrigger hydration');
 let plans=selectPvePreset({gbah:first},'gbah',decks[1],account,first);plans.gbah=hydratePveTeam(plans.gbah,account);assert.deepEqual(plans.gbah.configs.map(c=>c.unitId),[6,null,2,3,4]);assert.equal(plans.gbah.configs[1].goals.hp,'');
 plans=selectPvePreset(plans,'gbah',decks[0],account,plans.gbah);assert.equal(plans.gbah.configs[0].goals.hp,'90000');
 const db=hydratePveTeam(teamFromGameDeck(account.accountPresets.find(p=>p.dungeon==='db10'),account),account);assert.equal(db.configs[0].unitId,6);assert.notEqual(db.configs[0].goals.hp,90000);
});
test('B12 accuracy references are stage-specific and shared with checklist calculations',()=>{
 assert.equal(bossAccuracyTarget('gb12'),65);assert.equal(bossAccuracyTarget('db12'),85);assert.equal(cairosAccuracyTarget({dungeon:'db12'}),85);assert.equal(cairosAccuracyTarget({dungeon:'gb12'}),65);assert.equal(cairosAccuracyTarget({dungeon:'gbah'}),35);assert.equal(cairosAccuracyTarget({dungeon:'dbah'}),65);assert.equal(bossAccuracyTarget('unknown-stage'),null);
});
test('Raid native formation, combat goals and EHP use actual equipment plus leaders exactly once',()=>{
 const account=fixture(),deck=account.accountPresets.find(p=>p.dungeon==='r5');
 const source={...teamFromGameDeck(deck,account),raid:true,raidLeaders:[{stat:'hp',value:33,scope:'general'},{stat:'def',value:33,scope:'general'}]},team=hydratePveTeam(source,account);
 assert.equal(team.configs.length,6);assert.equal(team.raidFormationSource,'swex');assert.deepEqual(team.configs.map(c=>c.raidPosition),['front','front','back','back','back','back']);
 const first=pveMemberStats(account,team,team.configs[0]);assert.equal(team.configs[0].goals.hp,first.combat.hp);assert.equal(first.combat.hp,15965);assert.equal(first.combat.def,865);
 let report=raidFrontlineReport(account,{...team,frontlineEhpTarget:1});assert.equal(report.members.length,2);assert.equal(report.members[0].ehp,Math.floor(15965*(1140+3.5*865)/1000));assert.equal(report.members[0].met,true);
 report=raidFrontlineReport(account,{...team,frontlineEhpTarget:10000000});assert.ok(report.members.every(m=>!m.met));
 const partial={...account,runes:account.runes.filter(r=>r.id!==1)};assert.equal(raidFrontlineReport(partial,{...team,frontlineEhpTarget:1}).members[0].met,false,'partial gear cannot get a safe badge');
 team.configs[2].raidPosition='front';assert.equal(raidFrontlineReport(account,team).members.length,3);
 deck.sourceUnitIds=[3,4,null,null,1,2,5,6];assert.deepEqual(hydratePveTeam(team,account).configs.map(c=>c.raidPosition),['back','back','front','front','back','back']);
 const manual=hydratePveTeam({...team,raidFormationSource:'manual'},account);assert.equal(manual.raidFormationSource,'manual');assert.equal(manual.configs[0].raidPosition,'front');
});
test('source equipment artifacts and total/bonus conversion match the selected preset',()=>{
 const account=fixture(),deck=account.accountPresets.find(p=>p.dungeon==='gbah');deck.equipment=[{unitId:1,runeIds:account.units[0].runeIds,artifactIds:[]}];
 const team=hydratePveTeam(teamFromGameDeck(deck,account),account);assert.equal(team.configs[0].goals.hp,11000);
 const previous=pveHydrationKey(team,account);team.configs[0].basis='bonus';assert.notEqual(pveHydrationKey(team,account),previous);const converted=hydratePveTeam(team,account);assert.equal(converted.configs[0].goals.hp,500);assert.equal(converted.configs[0].goals.acc,10);
 assert.deepEqual(hydratePveTeam({...team,configs:[]},null).configs,[]);
});
