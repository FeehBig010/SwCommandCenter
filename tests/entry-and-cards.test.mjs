import test from 'node:test';import assert from 'node:assert/strict';
import {MONSTER_CATALOG} from '../src/core/monsters.js';
import {filterMonsterOptions} from '../src/core/monster-search.js';
import {presetsForArea,teamsForArea,assertPresetArea} from '../src/core/deckManager.js';
import {quickTeam,quickPreview,selectQuickMonster} from '../src/core/quick-calculator.js';
import {toggleGoalFocus} from '../src/core/team-ux.js';
import {blankConfig,DEFAULT_OPTIONS,normalizeAccount} from '../src/core/data.js';
import {generateCandidates} from '../src/core/optimizer.js';
import {portableTeam} from '../src/core/hub.js';
import {accountSnapshot} from '../src/core/account-snapshot.js';
import {saveAccountCloud,loadAccountCloud} from '../src/lib/account-cloud.js';
import {teamCardHeading,createTeamCard} from '../src/core/team-card.js';
const opts={...DEFAULT_OPTIONS,depth:'fast'};
function fixture(){return normalizeAccount({wizard_info:{wizard_id:10,wizard_name:'QA'},towers:{glorySpd:15,guildSpd:5},deco_list:[{deco_id:6,level:20,secret:'SECRET'}],runes:[],unit_list:[18311,16111,28212].map((master,i)=>({unit_id:i+1,unit_master_id:master,attribute:master%10,unit_level:40,class:6,con:700,atk:800,def:650,spd:100,critical_rate:15,critical_damage:50,resist:15,accuracy:0,skills:[{skill_id:111,level:4},{skill_id:112,level:2}],runes:Array.from({length:6},(_,j)=>({rune_id:i*10+j+1,slot_no:j+1,set_id:j<4?13:15,class:6,upgrade_curr:15,pri_eff:j===1?[8,42]:[1,100],sec_eff:[[2,8,0,5],[8,3,0,2]]}))})),session_key:'SECRET',friend_list:['SECRET']});}

test('family search includes all five elements and both awakened/unawakened forms',()=>{
 const family=filterMonsterOptions(MONSTER_CATALOG,'Totemista');assert.equal(family.length,10);assert.deepEqual([...new Set(family.map(m=>m.element))].sort(),[1,2,3,4,5]);for(const name of ['Aaliyah','Nora','Riley','Ella','Maya'])assert.ok(family.some(m=>m.name===name));assert.equal(filterMonsterOptions(MONSTER_CATALOG,'Totemist').length,10);assert.equal(filterMonsterOptions(MONSTER_CATALOG,'Totémista Nora').length,1);
 for(const q of ['Panda','Paladin','Ifrit'])assert.equal(new Set(filterMonsterOptions(MONSTER_CATALOG,q).map(m=>m.element)).size,5);
 assert.equal(filterMonsterOptions(MONSTER_CATALOG,'').length,MONSTER_CATALOG.length);assert.ok(filterMonsterOptions(MONSTER_CATALOG,'a').length>40);
});
test('deck categories and dungeons are strict even with unknown or contradictory metadata',()=>{
 const p=[{id:'a',gameMode:'arena',unitIds:[1,2,3,4]},{id:'s',gameMode:'siege',unitIds:[1,2,3]},{id:'d',gameMode:'cairos',dungeon:'db12',unitIds:[1,2,3,4,5]},{id:'g',gameMode:'cairos',dungeon:'gb12',unitIds:[1,2,3,4,5]},{id:'?',gameMode:null,unitIds:[1,2,3]}];
 assert.deepEqual(presetsForArea(p,'arena').map(p=>p.id),['a']);assert.deepEqual(presetsForArea(p,'siege').map(p=>p.id),['s']);assert.deepEqual(presetsForArea(p,'cairos','db12').map(p=>p.id),['d']);assert.deepEqual(presetsForArea(p,'cairos'),[]);assert.throws(()=>assertPresetArea(p[0],'siege'),/outra área/);
 const teams=p.slice(0,4).map(t=>({...t,configs:t.unitIds.map(()=>({}))}));assert.deepEqual(teamsForArea(teams,'siege').map(t=>t.id),['s']);assert.equal(teamsForArea(teams,'cairos','db12').length,1);
});
test('all four focus buttons combine and removal keeps manual goals; portable copies retain choices',()=>{
 let c={...blankConfig(),masterId:18311,label:'Mihyang',sets:[]};for(const key of ['tank','damage','speed','control'])c=toggleGoalFocus(c,key);assert.equal(c.focuses.length,4);assert.equal(c.goals.hp,40000);assert.equal(c.goals.spd,260);assert.equal(c.goals.cr,100);assert.equal(c.goals.acc,85);
 c.goals.hp=50000;c=toggleGoalFocus(c,'tank');assert.equal(c.focuses.length,3);assert.equal(c.goals.hp,50000);const copy=portableTeam({configs:[c,c,c]});assert.deepEqual(copy.configs[0].focuses,c.focuses);
});
test('combined focuses actually average the optimizer objectives after targets',()=>{
 const account=fixture(),unit=account.units[0],c={...blankConfig(unit),sets:[],goals:{},basis:'total'};const own={...account,runes:account.runes.filter(r=>r.owner===unit.id)};
 const quality=config=>generateCandidates(own,unit,config,opts).candidates[0].utility;
 assert.ok(Math.abs(quality({...c,focuses:['tank','speed']})-(quality({...c,objective:'hp'})+quality({...c,objective:'spd'}))/2)<1e-9);
});
test('manual calculator uses sheet/base/sets and scoped bonuses without account or fake inventory',()=>{
 const team=quickTeam('siege');team.configs=team.configs.map((c,i)=>selectQuickMonster(c,{master:[18311,16111,28212][i],name:['Mihyang','Anavel','Solveig'][i]}));team.towerSpd=15;team.leader={stat:'spd',scope:'guild',value:28,element:0};team.configs.forEach((c,i)=>{c.manual.base.spd=100;c.manual.sheet.spd=200-i*10;});
 const preview=quickPreview(team);assert.equal(preview.complete,true);assert.deepEqual(preview.actors.map(a=>a.spd),[243,233,223]);assert.ok(preview.turns.every(t=>Number.isInteger(t.tick)));team.enemyCombatSpd=300;assert.equal(quickPreview(team).cut,true);
 team.gameMode='arena';assert.equal(quickPreview(team).actors[0].spd,215);team.configs[0].sets=[3,15];assert.equal(quickPreview(team).actors[0].spd,215);team.configs[0].manual.sheet.spd='bad';assert.throws(()=>quickPreview(team),/inválido/);assert.equal(quickTeam('arena').configs.length,4);assert.equal(quickTeam('cairos').configs.length,5);
});
test('normalized private backups strip extras while retaining gear, grinds, skills, towers and decks',()=>{
 const account=fixture();account.session_key='SECRET';account.units[0].social='SECRET';account.runes[0].secret='SECRET';account.accountPresets=[{id:'a',name:'Arena',gameMode:'arena',dungeon:null,unitIds:[1,2,3,null],missingIds:[99],token:'SECRET'}];
 const snapshot=accountSnapshot(account);assert.ok(!JSON.stringify(snapshot).includes('SECRET'));assert.deepEqual(snapshot.units[0].base,account.units[0].base);assert.deepEqual(snapshot.units[0].skillLevels,[{slot:1,level:4},{slot:2,level:2}]);assert.deepEqual(snapshot.runes[0].subs,account.runes[0].subs);assert.equal(snapshot.towers.glorySpd,15);assert.equal(snapshot.towers.records[0].level,20);assert.equal(snapshot.accountPresets[0].gameMode,'arena');assert.throws(()=>accountSnapshot({version:1,units:[],runes:[]}),/inválido/);
});
test('cloud save/load uses the owner key and reparses the whitelist on both directions',async()=>{
 let row;
 const client={from(name){
  assert.equal(name,'account_snapshots');
  return {
   async upsert(value){row=value;return {error:null};},
   select(){return {eq(key,user){
    assert.equal(key,'user_id');assert.equal(user,'owner');
    return {async maybeSingle(){return {data:row?{payload:{...row.payload,session_key:'SECRET'}}:null,error:null};}};
   }};}
  };
 }};
 await saveAccountCloud(client,'owner',fixture());assert.equal(row.user_id,'owner');const loaded=await loadAccountCloud(client,'owner');assert.ok(!JSON.stringify(loaded).includes('SECRET'));await assert.rejects(loadAccountCloud(null,'owner'),/Entre/);
});
test('PvE card titles use exact objectives and dungeon tiers; PvP uses the enemy defense',()=>{
 assert.equal(teamCardHeading({gameMode:'cairos',dungeon:'db12',name:'Time'}).title,"Dragon's Lair B12");assert.equal(teamCardHeading({gameMode:'dimensional',bossName:'Sacreon',stageName:'Castle of Forgotten Heroes Level 5'}).title,'Sacreon - Castle of Forgotten Heroes Level 5');assert.equal(teamCardHeading({gameMode:'siege',enemyDefense:[{label:'Carcano'},{label:'Chilling'},{label:'Triana'}]}).title,'Counter · Carcano / Chilling / Triana');assert.equal(teamCardHeading({gameMode:'arena',mode:'attack'}).kind,'pvp');assert.equal(teamCardHeading({gameMode:'cairos',exportContext:{title:'Boss exato'}}).title,'Boss exato');
});
test('technical card snapshots show leader, true marginal grinds and skill levels without identifiers',()=>{
 const account=fixture(),configs=account.units.map(u=>({...blankConfig(u),sets:[13,15]})),team={gameMode:'cairos',dungeon:'db12',leader:{stat:'spd',scope:'general',value:24},leaderKey:configs[1].key,configs};const card=createTeamCard(team,account),m=card.monsters[0];assert.equal(card.monsters[1].isLeader,true);assert.equal(m.isLeader,false);assert.equal(m.technical.grinds.spd,12);assert.equal(m.technical.total.spd,m.technical.base.spd+m.technical.bonus.spd);assert.ok(m.technical.grinds.hp>0);assert.deepEqual(m.technical.sets,[13,15]);assert.deepEqual(m.skillLevels,[{slot:1,level:4},{slot:2,level:2}]);assert.ok(!JSON.stringify(card).includes('runeIds'));assert.ok(!JSON.stringify(card).includes('unitId'));
});
