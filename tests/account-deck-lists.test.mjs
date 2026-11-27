import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAccountDeckLists} from '../src/core/account-deck-lists.js';

test('empty snapshots retain every established collection contract',()=>{
 const lists=buildAccountDeckLists([]);
 assert.deepEqual(Object.keys(lists),[
  'arenaPresetsByContext','presetsByArea','arenaPresets','deck_list',
  'defense_deck_list','world_arena_deck_list','pveDecksByDungeon',
  'deck_recent_list','party_deck','dungeon_deck'
 ]);
 assert.deepEqual(lists.arenaPresetsByContext,{regular:[],interserver:[]});
 assert.deepEqual(Object.keys(lists.presetsByArea),['siege','arena','rta','cairos','dimensional','rift','toa']);
 assert.deepEqual(lists.pveDecksByDungeon,{});
 for(const [key,value] of Object.entries(lists)) if(Array.isArray(value))assert.deepEqual(value,[],key);
});

test('Arena Regular, Interserver and RTA remain separate and preserve input identity',()=>{
 const regular={id:'reg',gameMode:'arena',arenaContext:'regular'};
 const interserver={id:'inter',gameMode:'arena',arenaContext:'interserver'};
 const unknown={id:'unknown',gameMode:'arena',arenaContext:'future-mode'};
 const rta={id:'rta',gameMode:'rta'};
 const siege={id:'siege',gameMode:'siege'};
 const lists=buildAccountDeckLists([interserver,siege,rta,unknown,regular]);
 assert.deepEqual(lists.arenaPresetsByContext,{regular:[regular],interserver:[interserver]});
 assert.deepEqual(lists.presetsByArea.arena,[interserver,unknown,regular]);
 assert.deepEqual(lists.presetsByArea.rta,[rta]);
 assert.deepEqual(lists.arenaPresets,[interserver,rta,unknown,regular]);
 assert.deepEqual(lists.defense_deck_list,[interserver,siege,unknown,regular]);
 assert.deepEqual(lists.world_arena_deck_list,[rta]);
 assert.equal(lists.presetsByArea.siege[0],siege);
});

test('PvE dungeon and source namespaces group without changing order or object references',()=>{
 const cairos={id:'c',gameMode:'cairos',dungeon:'gbah',sourceKey:'deck_recent_list'};
 const dimensional={id:'d',gameMode:'dimensional',dungeon:'gbah',sourceKey:'party_deck'};
 const rift={id:'r',gameMode:'rift',sourceKey:'dungeon_deck'};
 const toa={id:'t',gameMode:'toa',dungeon:'toan',sourceKey:'deck_recent_list'};
 const rta={id:'a',gameMode:'rta',sourceKey:'dungeon_deck'};
 const lists=buildAccountDeckLists([cairos,dimensional,rift,toa,rta]);
 assert.deepEqual(lists.pveDecksByDungeon,{gbah:[cairos,dimensional],'pve-other':[rift],toan:[toa]});
 assert.deepEqual(lists.deck_recent_list,[cairos,toa]);
 assert.deepEqual(lists.party_deck,[dimensional]);
 assert.deepEqual(lists.dungeon_deck,[rift,rta]);
 assert.deepEqual(lists.deck_list,[cairos,dimensional,rift,toa]);
 assert.equal(lists.pveDecksByDungeon.gbah[0],cairos);
});
