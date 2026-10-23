import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeAccount} from '../src/core/data.js';import {extractAccountPresets} from '../src/core/decks.js';
import {hydrateAccountPresets,syncCairosPlans,accountPresetPage} from '../src/core/account-teams.js';
import {cairosStagesForPresets} from '../src/core/pve.js';import {cleanAccountPayload,restoreAccountPayload} from '../src/core/clean-account-payload.js';
function raw(){return {wizard_id:1,runes:[],unit_list:[{unit_id:101,unit_master_id:10914,con:700,atk:800,def:650,spd:100,runes:[{rune_id:1,slot_no:2,set_id:3,class:6,upgrade_curr:15,pri_eff:[8,42],sec_eff:[]}]},{unit_id:102,unit_master_id:99991,unit_name:'Agrius',con:700,atk:800,def:650,spd:99,runes:[{rune_id:2,slot_no:2,set_id:3,class:6,upgrade_curr:15,pri_eff:[8,42],sec_eff:[]}]}],deck_list:[{deck_id:1,name:'Dragão · Teon e Agrius',dungeon_id:9011,unit_id_list:[101,102,0,999]}],defense_deck_list:[{unit_id_list:[101,102,0]}],world_arena_deck_list:[{unit_id_list:[101,102]}]};}
test('mandatory Dragon Teon/Agrius roster preserves provided identities, runes, order and five slots including nulls',()=>{const a=normalizeAccount(raw()),p=hydrateAccountPresets(a).find(p=>p.dungeon==='dbah');assert.equal(p.members[0].name,'Teon');assert.equal(p.members[1].name,'Agrius');assert.equal(p.members[0].runes[0].id,1);assert.equal(p.members[1].runes[0].id,2);assert.deepEqual(p.unitIds,[101,102,null,null,null]);assert.deepEqual(p.members.slice(2),[null,null,null]);assert.equal(syncCairosPlans(a).dbah.configs.length,5);const restored=restoreAccountPayload(cleanAccountPayload(a),'owner');assert.equal(restored.units[1].name,'Agrius');assert.deepEqual(restored.accountPresets.find(p=>p.dungeon==='dbah').unitIds,[101,102,null,null,null]);});
test('untyped PvE decks remain visible as unclassified destination while explicit RTA remains isolated',()=>{const r=raw();r.deck_list.push([101,null,102],{name:'Meu outro PvE',unit_id_list:[101,102]},{mode:'world_arena',unit_id_list:[101]});const a=normalizeAccount(r);assert.ok(a.accountPresets.some(p=>p.dungeon==='pve-other'));assert.ok(cairosStagesForPresets(a.accountPresets).some(s=>s[0]==='pve-other'));assert.ok(a.accountPresets.some(p=>p.gameMode==='rta'));assert.ok(syncCairosPlans(a)['pve-other']);});
test('iterative extraction keeps deep decks, arbitrary deck count and all unit positions without truncation',()=>{let nested={dungeon_name:'DBAH',unit_id_list:[1,2,3,4,5,6,7,8]};for(let i=0;i<40;i++)nested={child:nested};const presets=extractAccountPresets({nested,many:Array.from({length:75},(_,i)=>({name:`Deck${i}`,unit_id_list:[1,0]}))},Array.from({length:8},(_,i)=>({id:i+1})),'pve');assert.equal(presets.length,76);assert.deepEqual(presets[0].unitIds,[1,2,3,4,5,6,7,8]);assert.ok(presets.slice(1).every(p=>p.unitIds.length===5&&p.unitIds[1]===null));});

test('object-encoded slot lists and positional references hydrate all sources without moving missing slots',()=>{
 const r=raw();
 r.deck_list={dragon:{dungeon_id:9011,deck_name:'Dragão indexado',leader_unit_id:102,unit_id_list:{1:'101',2:{unit_id:'102'},4:{unit_id:999}}},toa:{dungeon_name:'ToA Hard',unit_list:{0:102,2:101}}};
 r.defense_deck_list=[{deck_name:'Siege',unit_id_list:{1:101,3:102}},{game_mode:'arena',unit_id_list:[{unit_id:102,pos_id:3},{unit_id:101,pos_id:1}]}];
 r.world_arena_deck_list={saved:{unit_list:{1:102,4:101}}};
 const a=normalizeAccount(r),hydrated=hydrateAccountPresets(a),dragon=hydrated.find(p=>p.dungeon==='dbah');
 assert.equal(a.accountPresets.length,5);assert.equal(dragon.leaderIndex,1);
 assert.deepEqual(dragon.unitIds,[101,102,null,null,null]);assert.deepEqual(dragon.missingIds,[999]);
 assert.equal(dragon.members[0].name,'Teon');assert.equal(dragon.members[1].name,'Agrius');
 assert.ok(dragon.members[0].imageUrl);assert.equal(dragon.members[0].runes[0].id,1);assert.ok(dragon.members[0].combat_spd>=142);
 assert.deepEqual(a.accountPresets.find(p=>p.dungeon==='toah').unitIds,[102,null,101,null,null]);
 assert.deepEqual(a.accountPresets.find(p=>p.gameMode==='arena').unitIds,[101,null,102,null]);
 assert.deepEqual(a.accountPresets.find(p=>p.gameMode==='rta').unitIds,[102,null,null,101]);
 assert.deepEqual(syncCairosPlans(a).dbah.configs.map(c=>c.unitId),dragon.unitIds);
 assert.equal(a.presetImport.sources.deck_list.imported,2);assert.equal(a.presetImport.sources.defense_deck_list.imported,2);assert.equal(a.presetImport.sources.world_arena_deck_list.imported,1);
 const restored=restoreAccountPayload(cleanAccountPayload(a),'owner');
 assert.equal(restored.accountPresets.length,5);assert.deepEqual(restored.accountPresets.find(p=>p.dungeon==='dbah').unitIds,dragon.unitIds);assert.equal(hydrateAccountPresets(restored).find(p=>p.dungeon==='dbah').members[0].runes[0].id,1);
});
test('flat monster records group by deck and dungeon, not by unit or repeated composition',()=>{
 const r=raw();r.deck_list=Array.from({length:60},(_,i)=>[{deck_id:i,dungeon_id:9011,unit_id:102,pos_id:2},{deck_id:i,dungeon_id:9011,unit_id:101,pos_id:1},{deck_id:i,dungeon_id:9011,unit_id:999,pos_id:4}]).flat();
 r.deck_list.push({deck_id:0,dungeon_id:8011,unit_id:101,pos_id:1});
 const a=normalizeAccount(r),dragons=a.accountPresets.filter(p=>p.dungeon==='dbah');
 assert.equal(dragons.length,60);assert.equal(new Set(dragons.map(p=>p.id)).size,60);assert.ok(dragons.every(p=>JSON.stringify(p.unitIds)==='[101,102,null,null,null]'));
 assert.equal(a.accountPresets.filter(p=>p.dungeon==='gbah').length,1);assert.equal(Object.keys(syncCairosPlans(a)).length,61);
});
test('empty saved decks, populated alternative fields and inherited leader/name survive extraction',()=>{
 const p=extractAccountPresets({dungeon_name:'DBAH',deck_name:'Dragão',leader_unit_id:102,decks:[{unit_id_list:[]},{monster_ids:[],unit_list:{1:101,2:102}},{unit_id:{1:102,2:101}}]},[{id:101},{id:102}],'pve-default');
 assert.equal(p.length,3);assert.deepEqual(p[0].unitIds,[null,null,null,null,null]);assert.deepEqual(p[1].unitIds,[101,102,null,null,null]);assert.equal(p[1].leaderIndex,1);assert.ok(p.every(p=>p.name==='Dragão'));
 assert.deepEqual(p[2].unitIds,[102,101,null,null,null]);
});
test('import diagnostics distinguish absent/empty sources and unsupported structures without retaining raw social data',()=>{
 const r=raw();r.deck_list=[{unit_id_list:[101,102],secret:'private'},{unit_id_list:'unsupported'}];delete r.defense_deck_list;r.world_arena_deck_list=[];
 const a=normalizeAccount(r);assert.deepEqual(a.presetImport.sources.deck_list,{present:true,hasData:true,imported:1,unrecognized:1});assert.equal(a.presetImport.sources.defense_deck_list.present,false);assert.equal(a.presetImport.sources.world_arena_deck_list.hasData,false);
 assert.ok(!JSON.stringify(a).includes('private'));assert.deepEqual(Object.keys(cleanAccountPayload(a)).sort(),['deck_list','defense_deck_list','runes','unit_list','world_arena_deck_list']);
});
test('account destination preserves active PvE area and handles Rift/ToA-only login and continuation',()=>{
 for(const mode of ['cairos','dimensional','rift','toa','rta'])assert.equal(accountPresetPage({accountPresets:[{gameMode:mode}]}),mode);
 const a={accountPresets:[{gameMode:'siege'},{gameMode:'arena'},{gameMode:'cairos'},{gameMode:'toa'}]};
 assert.equal(accountPresetPage(a,'cairos'),'cairos');assert.equal(accountPresetPage(a,'toa'),'toa');assert.equal(accountPresetPage(a),'siege');assert.equal(accountPresetPage(a,'arena'),'arena');assert.equal(accountPresetPage(null),'siege');
});
test('direct numeric slot maps and malformed slot references keep the rest of each formation',()=>{
 const p=extractAccountPresets({dbah:{1:{unit_id:101},2:{unit_id:102},4:null},toah:{unit_id_list:[101,{deleted:true},102,{unit_id:[101]},null]}},[{id:101},{id:102}],'pve-default');
 assert.equal(p.length,2);assert.deepEqual(p[0].unitIds,[101,102,null,null,null]);assert.deepEqual(p[1].unitIds,[101,null,102,null,null]);
});
test('native PvE namespaces route Rift IDs and trial tower difficulty without confusing elemental Halls or PvP',()=>{
 const p=extractAccountPresets({elemental_rift_dungeon:{2001:{unit_id_list:[101]}},trial_tower:{difficulty:2,unit_id_list:[101]},hall:{dungeon_id:1001,unit_id_list:[101]},arena:{deck_name:'ToA Hard',unit_id_list:[101]}},[{id:101}],'pve-default');
 assert.deepEqual(p.map(p=>[p.gameMode,p.dungeon]),[['rift','fire-beast'],['toa','toah'],['cairos','pve-other'],['arena',null]]);
 const plans=syncCairosPlans({id:'account',units:[{id:101,master:10914,name:'Teon',runeIds:[]}],runes:[],accountPresets:p});
 assert.ok(plans['fire-beast']);assert.ok(plans.toah);assert.ok(plans['pve-other']);
});
test('direct SWEX object-slot formations retain empty objects and null unit references through PvE hydration and cloud restore',()=>{
 const r=raw();r.deck_list={9011:[[{unit_id:'101'},{unit_id:102},{},{unit_id:null},{pos_id:5}]],8011:{1:{unit_id:101},2:{unit_id:null},3:{unit_id:102},4:{}}};
 const a=normalizeAccount(r),decks=hydrateAccountPresets(a);
 assert.equal(a.presetImport.sources.deck_list.imported,2);
 const dragon=decks.find(p=>p.dungeon==='dbah');assert.ok(dragon);
 assert.deepEqual(dragon.unitIds,[101,102,null,null,null]);assert.equal(dragon.members[0].name,'Teon');assert.equal(dragon.members[1].name,'Agrius');assert.equal(dragon.members[0].runes[0].id,1);assert.ok(dragon.members[0].imageUrl);assert.equal(dragon.members[2],null);
 const plans=syncCairosPlans(a);assert.deepEqual(plans.dbah.configs.map(c=>c.unitId),dragon.unitIds);assert.deepEqual(plans.gbah.configs.map(c=>c.unitId),[101,null,102,null,null]);
 const restored=restoreAccountPayload(cleanAccountPayload(a),'owner');assert.deepEqual(syncCairosPlans(restored).dbah.configs.map(c=>c.unitId),dragon.unitIds);
});
test('explicit null unit_id is an empty slot even when the slot object also has its own id',()=>{
 const p=extractAccountPresets({dbah:{unit_id_list:[{unit_id:101},{unit_id:null,id:102},{unit_id:102}]}},[{id:101},{id:102}],'pve-default');
 assert.deepEqual(p[0].unitIds,[101,null,102,null,null]);
});

test('explicit Dragon dungeon in party_deck takes priority over legacy R5 fallback and hydrates empty slots',()=>{
 const r=raw();delete r.deck_list;r.party_deck={9011:[{deck_id:7,unit_id_list:[101,null,102,null,null]}]};
 const a=normalizeAccount(r),dragon=hydrateAccountPresets(a).find(p=>p.dungeon==='dbah');
 assert.ok(dragon);assert.equal(dragon.gameMode,'cairos');assert.deepEqual(dragon.unitIds,[101,null,102,null,null]);
 assert.equal(dragon.members[0].name,'Teon');assert.equal(dragon.members[2].name,'Agrius');assert.equal(dragon.members[0].runes[0].id,1);assert.ok(dragon.members[0].sheetStats.spd>=142);
 assert.deepEqual(syncCairosPlans(a).dbah.configs.map(c=>c.unitId),dragon.unitIds);
 assert.equal(a.presetImport.sources.party_deck.imported,1);assert.equal(a.presetImport.sources.party_deck.present,true);
 const restored=restoreAccountPayload(cleanAccountPayload(a),'user');assert.deepEqual(syncCairosPlans(restored).dbah.configs.map(c=>c.unitId),dragon.unitIds);
});

test('real SWEX schema: saved 24/202 and recent 3/2002 hydrate Dragon preset equipment instead of current gear',()=>{
 const r=raw();r.unit_list[1].unit_master_id=34112;delete r.unit_list[1].unit_name;
 const equip=r.unit_list.map(u=>({unit_id:u.unit_id,rune_id_list:u.runes.map(r=>r.rune_id),artifact_id_list:[]}));
 r.runes=r.unit_list.flatMap(u=>u.runes.map(r=>({...r,occupied_id:0})));r.unit_list.forEach(u=>u.runes=[]);
 r.deck_list=[{deck_type:24,deck_seq:202,leader_unit_id:102,unit_id_list:[102,101,0,0,0,0,0,0],equip}];
 r.deck_recent_list=[{type:3,sub_type:2002,leader_unit_id:102,unit_id_list:[102,101,0,0,0,0,0,0],equip}];
 const account=normalizeAccount(r);
 for(const a of [account,restoreAccountPayload(cleanAccountPayload(account),'user')]){
  const decks=hydrateAccountPresets(a).filter(p=>p.dungeon==='dbah');assert.equal(decks.length,2);
  for(const p of decks){assert.equal(p.members[0].name,'Agrius');assert.equal(p.members[1].name,'Teon');assert.equal(p.members[0].runes[0].id,2);assert.equal(p.members[1].runes[0].id,1);assert.equal(p.members[1].sheetStats.spd,142);assert.deepEqual(p.members.slice(2),Array(6).fill(null));assert.equal(p.leaderIndex,0);}
  const plan=syncCairosPlans(a).dbah;assert.deepEqual(plan.plannedRunes.byConfig[plan.configs[0].key],[2]);assert.deepEqual(plan.plannedRunes.byConfig[plan.configs[1].key],[1]);
 }
 assert.equal(account.presetImport.sources.deck_recent_list.imported,1);
});
