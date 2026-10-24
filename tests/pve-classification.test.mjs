import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeAccount,blankConfig,makeTeam,restoreTeam} from '../src/core/data.js';
import {classifyDeck} from '../src/core/decks.js';
import {PVE_AREAS,cairosStagesForPresets} from '../src/core/pve.js';
import {pveSlots} from '../src/core/pve-stages.js';
import {syncCairosPlans,teamFromGameDeck} from '../src/core/account-teams.js';
import {presetsForArea} from '../src/core/deckManager.js';
import {hydratePveTeam} from '../src/core/pve-intelligence.js';
import {migratePvePlans,upgradePveAccount} from '../src/core/pve-migration.js';
import {cleanAccountPayload,restoreAccountPayload} from '../src/core/clean-account-payload.js';
import {accountSnapshot} from '../src/core/account-snapshot.js';
const raw=()=>({wizard_id:123,runes:[],unit_list:Array.from({length:6},(_,i)=>({unit_id:i+1,unit_master_id:13413,unit_level:40,class:6,attribute:3,con:700,atk:800,def:600,spd:100,accuracy:45,runes:[{rune_id:i+1,slot_no:2,set_id:3,class:6,upgrade_curr:15,pri_eff:[8,42],sec_eff:[]}]}))});
test('Cairos has exactly five main destinations and three B10 destinations, without B12 or Other',()=>{
 assert.deepEqual(cairosStagesForPresets().map(s=>s[0]),['gbah','dbah','nbah','sf10','pc10','gb10','db10','nb10']);
 for(const [dungeon_id,expected] of [[8001,'gb10'],[9001,'db10'],[6001,'nb10'],[8011,'gbah'],[9011,'dbah'],[6011,'nbah']])assert.equal(classifyDeck({dungeon_id}).dungeon,expected);
 assert.equal(classifyDeck({dungeon_id:8001,floor:12}).dungeon,'gbah');assert.equal(classifyDeck({dungeon_name:'DB12'}).dungeon,'dbah');
 assert.ok(Object.values(PVE_AREAS).every(a=>a.stages.every(([key])=>!key.endsWith('other'))));
});
test('dimensional ID codebook distinguishes runes, 2A and predator, including Sacréon and Inferath',()=>{
 for(const [region,code] of [['ellunia',1],['karzhan',2],['lumel',3],['khalderun',4],['sacreon',5],['inferath',6]])for(const [part,kind] of [[101,'runes'],[201,'2a']]){
  const id=code*1000+part;
  assert.deepEqual(classifyDeck({sourceKey:'deck_recent_list',type:16,sub_type:id}),{gameMode:'dimensional',dungeon:`${region}-${kind}`});
  assert.deepEqual(classifyDeck({dungeon_id:id,deck_name:'Dragão Abissal'}),{gameMode:'dimensional',dungeon:`${region}-${kind}`});
 }
 assert.equal(classifyDeck({sourceKey:'deck_list',deck_type:26,deck_seq:201}).dungeon,'ellunia-runes');
 assert.equal(classifyDeck({sourceKey:'deck_list',deck_type:26,deck_seq:101}).dungeon,'karzhan-runes');
 assert.equal(classifyDeck({sourceKey:'deck_recent_list',type:16,sub_type:5202}).dungeon,'sacreon-2a');
 assert.equal(classifyDeck({dungeon_id:5301}).dungeon,'sacreon-predator');assert.equal(pveSlots('dimensional','sacreon-predator'),5);
});
test('saved/recent namespaces route ToA, Raid and five Rift beasts without confusing Labyrinth or elemental Halls',()=>{
 for(const [type,seq,target] of [[24,202,'dbah'],[25,101,'ice-beast'],[25,201,'fire-beast'],[25,301,'wind-beast'],[25,401,'light-beast'],[25,501,'dark-beast'],[3,1,'r5'],[6,1,'toa-saved'],[27,1001,'toahell']])assert.equal(classifyDeck({sourceKey:'deck_list',deck_type:type,deck_seq:seq}).dungeon,target);
 for(const [type,seq,target] of [[4,5,'toan'],[5,5,'toah'],[20,103,'toahell'],[9,5,'r5'],[8,1001,'ice-beast'],[8,2001,'fire-beast'],[8,3001,'wind-beast'],[8,4001,'light-beast'],[8,5001,'dark-beast']])assert.equal(classifyDeck({sourceKey:'deck_recent_list',type,sub_type:seq}).dungeon,target);
 for(const type of [4,5,7,8,9,10,11])assert.equal(classifyDeck({sourceKey:'deck_list',deck_type:type,deck_seq:1}).dungeon,null);
 assert.equal(classifyDeck({sourceKey:'deck_recent_list',type:15,sub_type:201}).gameMode,null);
 assert.equal(classifyDeck({dungeon_id:2001},'dungeon').gameMode,null);assert.equal(classifyDeck({dungeon_id:2001},'elemental_rift_dungeon').dungeon,'fire-beast');
 assert.equal(classifyDeck({sourceKey:'deck_list',deck_type:26,deck_seq:999999}).dungeon,null);
});
test('one import mounts all targeted destinations and hydrates exact equipment, null slots and native counts',()=>{
 const r=raw();r.deck_list=[{deck_type:24,deck_seq:202,unit_id_list:[1,null,3,4,5]},{deck_type:26,deck_seq:501,unit_id_list:[1,2,3,4]}];r.deck_recent_list=[{type:16,sub_type:5201,unit_id_list:[4,null,2,1]},{type:16,sub_type:5301,unit_id_list:[1,2,3,4,5]},{type:5,sub_type:5,unit_id_list:[1,2,3,4,5]},{type:9,sub_type:5,unit_id_list:[1,2,3,4,5,6]},{type:8,sub_type:5001,unit_id_list:[1,2,3,4,5,6]}];
 const a=normalizeAccount(r),plans=syncCairosPlans(a);assert.equal(plans.dbah.configs.length,5);assert.equal(plans.r5.configs.length,6);assert.equal(plans['sacreon-2a'].configs.length,4);assert.equal(plans['sacreon-predator'].configs.length,5);
 assert.deepEqual(plans['sacreon-2a'].configs.map(c=>c.unitId),[4,null,2,1]);
 const filled=hydratePveTeam(plans['sacreon-2a'],a);assert.equal(filled.configs[0].masterId,13413);assert.equal(filled.configs[0].goals.spd,142);assert.equal(filled.configs[0].goals.hp,10500);assert.equal(filled.configs[1].enabled,false);
 assert.equal(presetsForArea(a.accountPresets,'dimensional','sacreon-runes').length,1);assert.equal(presetsForArea(a.accountPresets,'dimensional','sacreon-2a').length,1);
 for(const restored of [restoreAccountPayload(cleanAccountPayload(a),'owner'),accountSnapshot(a)])assert.deepEqual(restored.accountPresets.map(p=>[p.gameMode,p.dungeon,p.sourceMeta]),a.accountPresets.map(p=>[p.gameMode,p.dungeon,p.sourceMeta]));
 assert.equal(restoreTeam(plans['sacreon-predator']).configs.length,5);
});
test('B12 cache migration preserves both edited teams, alternate presets and rune plans',()=>{
 const a={...makeTeam('cairos'),dungeon:'gb12',name:'B12 editado',sourceDeckId:'legacy',plannedRunes:{custom:true}},b={...makeTeam('cairos'),dungeon:'gbah',name:'Abissal editado',sourceDeckId:'abyss'};
 a.configs[0].goals.hp=90000;
 const migrated=migratePvePlans({gb12:a,gbah:b,'gb12::alternate':{...a,id:'alt',sourceDeckId:'alternate'}});
 assert.equal(migrated.gbah.name,'B12 editado');assert.equal(migrated.gbah.configs[0].goals.hp,90000);assert.equal(migrated.gbah.plannedRunes.custom,true);
 assert.equal(migrated['gbah::abyss'].name,'Abissal editado');assert.equal(migrated['gbah::alternate'].id,'alt');assert.equal(migrated.gb12,undefined);
 const collisions=migratePvePlans({gbah:a,gb12:{...a,id:'second'},'gb12::third':{...a,id:'third'}});assert.equal(new Set(Object.values(collisions).map(t=>t.id)).size,3);
 const recovered=upgradePveAccount({accountPresets:[{gameMode:'dimensional',dungeon:'dimensional-other',sourceKey:'deck_recent_list',sourceMeta:{type:16,sub_type:5202}},{gameMode:'cairos',dungeon:'db12'}]});assert.equal(recovered.accountPresets[0].dungeon,'sacreon-2a');assert.equal(recovered.accountPresets[1].dungeon,'dbah');
});
