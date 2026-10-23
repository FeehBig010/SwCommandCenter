import test from 'node:test';
import assert from 'node:assert/strict';
import {collabMapping,collabPortraitTarget} from '../src/core/collab-mapping.js';
import {monsterImageSources,resolveMonsterImageSources} from '../src/core/monsters.js';
import {normalizeAccount} from '../src/core/data.js';
import {MONSTER_IMAGE_INDEX_URL,COMMUNITY_MONSTER_CDN} from '../src/core/monster-image-index.js';

test('Ciri maps legacy/current SWEX master IDs and localized names to each original awakened elemental portrait',()=>{
 const elements=['Água','Fogo','Vento','Luz','Escuridão'];
 for(let e=1;e<=5;e++){
  for(const source of [29300+e,29310+e]){
   assert.equal(collabMapping[source],29710+e);
   assert.deepEqual(monsterImageSources(source),monsterImageSources(29710+e));
  }
  assert.equal(collabPortraitTarget(null,`Ciri (${elements[e-1]})`),29710+e);
  assert.equal(collabPortraitTarget(null,'Ciri',e),29710+e);
 }
 assert.equal(collabPortraitTarget(null,'Ciri'),29711);
 assert.ok(monsterImageSources(29701)[0].endsWith('unit_icon_0151_0_1.png'));
});

test('Witcher and Street Fighter always preserve the element across both exported ID forms',()=>{
 for(const [source,target] of [[292,296],[293,297],[294,298],[295,299],[240,245],[241,246],[242,247],[243,248],[244,249]])for(let e=1;e<=5;e++)for(const state of [0,10])assert.equal(collabPortraitTarget(source*100+state+e,''),target*100+10+e);
 assert.equal(collabPortraitTarget(17111,'Theomars'),null);
});

test('SWEX Ciri retains its account instance ID while portrait lookup uses unit_master_id',async()=>{
 const account=normalizeAccount({wizard_id:1,runes:[],unit_list:[{unit_id:987654321,unit_master_id:29313,con:700,atk:800,def:650,spd:103,class:6,unit_level:40,runes:[{rune_id:1,slot_no:2,set_id:3,class:6,upgrade_curr:15,pri_eff:[8,42],sec_eff:[]}]}]});
 const unit=account.units[0];assert.equal(unit.id,987654321);assert.equal(unit.master,29313);assert.equal(unit.name,'Ciri');
 const calls=[],fetcher=async url=>{calls.push(url);return {ok:true,json:async()=>url===MONSTER_IMAGE_INDEX_URL?{'29313':'unit_icon_old_ciri.png','29713':'unit_icon_0151_1_3.png'}:{version:1,monsters:{}}};};
 const sources=await resolveMonsterImageSources(unit.master,{name:unit.name,element:unit.element,fetcher});
 assert.equal(sources[0],`${COMMUNITY_MONSTER_CDN}unit_icon_0151_1_3.png`);
 assert.ok(calls.every(url=>!url.includes('987654321')));assert.ok(sources.every(url=>!url.includes('unit_icon_old_ciri')));
});
