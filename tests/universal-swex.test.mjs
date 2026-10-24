import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeAccount,normalizeAccountAsync} from '../src/core/data.js';
import {discoverDeckSources} from '../src/core/swex-presets.js';
import {syncAccountTeams,syncCairosPlans,hydrateAccountPresets} from '../src/core/account-teams.js';
import {cleanAccountPayload,restoreAccountPayload} from '../src/core/clean-account-payload.js';
function fixture(){return {wizard_id:1,runes:[],unit_list:Array.from({length:6},(_,i)=>({unit_id:i+1,unit_master_id:10914,con:700,atk:800,def:650,spd:100,runes:[{rune_id:i+1,slot_no:2,set_id:3,class:6,upgrade_curr:15,pri_eff:[8,42],sec_eff:[]}]}))};}
test('all formation namespaces coexist; null/object holes and nested WGB/RTA route to native sizes',()=>{
 const r=fixture();r.deck_list=[{deck_type:1,deck_seq:1,unit_id_list:[1,{},3,null,0,0,0,0]},{deck_type:22,deck_seq:1,unit_id_list:[1,null,3,0,0,0,0,0]},{deck_type:24,deck_seq:202,unit_id_list:[1,null,3,4,5,0,0,0]},{deck_type:25,deck_seq:101,unit_id_list:[1,null,3,4,5,6,0,0]},{deck_type:26,deck_seq:101,unit_id_list:[1,{},3,null,0,0,0,0]}];
 r.world={guild_battle:{attack_decks:[{unit_id_list:[1,{},3]}]},world_arena_deck_list:[{unit_id_list:[1,null,3,4]}]};r.trial_tower={decks:[{difficulty:2,unit_id_list:[1,{},3,4,5]}]};
 const a=normalizeAccount(r),teams=syncAccountTeams(a),pve=syncCairosPlans(a);
 assert.deepEqual(new Set(a.accountPresets.map(p=>p.gameMode)),new Set(['arena','siege','cairos','rift','dimensional','rta','toa']));
 assert.ok(teams.filter(t=>t.gameMode==='siege').every(t=>t.configs.length===3&&t.configs[1].unitId===null));assert.equal(teams.find(t=>t.gameMode==='arena').configs.length,4);assert.equal(teams.find(t=>t.gameMode==='rta').configs.length,4);
 assert.equal(pve.dbah.configs.length,5);assert.equal(pve['ice-beast'].configs.length,6);assert.equal(pve['karzhan-runes'].configs.length,4);assert.equal(pve.toah.configs.length,5);
 assert.deepEqual(pve.dbah.configs.map(c=>c.unitId),[1,null,3,4,5]);
 const restored=restoreAccountPayload(cleanAccountPayload(a),'user');assert.equal(restored.accountPresets.length,a.accountPresets.length);assert.equal(syncAccountTeams(restored).length,teams.length);assert.deepEqual(restored.accountPresets.map(p=>[p.gameMode,p.dungeon]).sort(),a.accountPresets.map(p=>[p.gameMode,p.dungeon]).sort());
});
test('eight-position Raid layout imports once, retaining all six monsters and original positions through backup',()=>{
 const r=fixture();r.raid_deck={unit_id_list:[1,2,3,0,4,5,6,0],leader_unit_id:6};const a=normalizeAccount(r),p=a.accountPresets[0];
 assert.equal(a.accountPresets.length,1);assert.deepEqual(p.unitIds,[1,2,3,4,5,6]);assert.equal(p.leaderIndex,5);assert.deepEqual(p.sourceUnitIds,[1,2,3,null,4,5,6,null]);
 const restored=restoreAccountPayload(cleanAccountPayload(a),'user');assert.deepEqual(restored.accountPresets[0].unitIds,p.unitIds);assert.deepEqual(restored.accountPresets[0].sourceUnitIds,p.sourceUnitIds);
});
test('async and sync normalizers agree; progress is monotonic and yields repeatedly during large inventories',async()=>{
 const r=fixture();r.runes=Array.from({length:1024},(_,i)=>({rune_id:100+i,slot_no:2,set_id:3,class:6,upgrade_curr:15,pri_eff:[8,42],sec_eff:[]}));r.deck_list=Array.from({length:300},(_,i)=>({deck_id:i,deck_type:24,deck_seq:202,unit_id_list:[1,null,3,4,5]}));
 const progress=[];let yields=0;const a=await normalizeAccountAsync(r,{onProgress:p=>progress.push(p.percent),yieldControl:async()=>{yields++;}}),b=normalizeAccount(r);
 assert.equal(a.accountPresets.length,300);assert.deepEqual(a.accountPresets,b.accountPresets);assert.ok(yields>5);assert.ok(progress.every((p,i)=>i===0||p>=progress[i-1]));assert.equal(progress.at(-1),88);
});
test('discovery ignores equipment and social trees and retains explicitly typed anonymous nested formations',()=>{
 const r=fixture();r.nested={game_mode:'arena',records:[{unit_id_list:[1,null,3,4]}]};r.chat_log={teams:[[1,2,3]]};r.rune_storage={decks:[[1,2,3]]};
 assert.equal(discoverDeckSources(r).length,1);assert.equal(normalizeAccount(r).accountPresets[0].gameMode,'arena');
});
test('missing/empty sources produce empty states and RTA previews use the separate rune pool',()=>{
 const r=fixture(),a=normalizeAccount(r);assert.deepEqual(a.accountPresets,[]);assert.deepEqual(syncAccountTeams(a),[]);assert.deepEqual(syncCairosPlans(a),{});assert.deepEqual(hydrateAccountPresets(null),[]);
 r.world_arena_deck_list=[{unit_id_list:[1,null,3,4]}];const b=normalizeAccount(r),p=hydrateAccountPresets(b)[0];assert.equal(p.members[0].runes.length,0);assert.equal(p.members[1],null);
});

test('inventory favorites are not teams; a tree of empty areas imports no phantom presets or warnings',()=>{
 const r=fixture();r.favorite_unit_list=[{type:1,unit_id_list:[[1,2,3,4],[1,2,3,4,5,6]]}];r.temporary_defense_deck={guild_siege:[],server_guild_war:[]};
 const a=normalizeAccount(r);assert.deepEqual(a.accountPresets,[]);assert.equal(a.presetImport.sources.temporary_defense_deck.hasData,false);assert.equal(a.presetImport.sources.temporary_defense_deck.unrecognized,0);
});

test('auto-generated Raid groups from separate sources do not merge',()=>{
 const r=fixture();r.raid_deck={unit_id_list:[1,2,3,4,5,6]};r.raid_deck_list=[{unit_id_list:[1,2,3,4,5,6]}];const a=normalizeAccount(r);
 assert.equal(a.accountPresets.length,2);assert.notEqual(a.accountPresets[0].raidPartyId,a.accountPresets[1].raidPartyId);
});
