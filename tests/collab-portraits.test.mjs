import test from 'node:test';
import assert from 'node:assert/strict';
import {COLLAB_PORTRAIT_FILES} from '../src/core/collab-portrait-files.js';
import {monsterMasterId,monsterImageSources,resolveMonsterImageSources} from '../src/core/monsters.js';
import {normalizeAccount} from '../src/core/data.js';
import {MONSTER_IMAGE_INDEX_URL,COMMUNITY_MONSTER_CDN} from '../src/core/monster-image-index.js';

test('Ciri uses the exact exported master ID and never an original counterpart or display-name alias',()=>{
 for(let e=1;e<=5;e++)for(const state of [0,10]){
  const id=29300+state+e,filename=`unit_icon_0142_1_${e}.png`;
  assert.equal(COLLAB_PORTRAIT_FILES[id],filename);
  assert.ok(monsterImageSources(id,{name:'Rigna (Água)',element:1})[0].endsWith(filename));
 }
 assert.ok(monsterImageSources(29701,{name:'Ciri'})[0].endsWith('unit_icon_0151_0_1.png'));
 assert.ok(monsterImageSources(29711,{name:'Ciri'})[0].endsWith('unit_icon_0151_1_1.png'));
 assert.deepEqual(monsterImageSources(null,{name:'Ciri',element:3}),[]);
});

test('raw SWEX unit_master_id takes priority and instance IDs or invalid identifiers never become avatar keys',async()=>{
 assert.equal(monsterMasterId({unit_id:987654321,unit_master_id:'29313',master:29713}),29313);
 assert.equal(monsterMasterId({id:987654321,master:29313}),29313);
 for(const input of [{unit_id:29313},{id:29313},{unit_master_id:null,master:29313},true,'Ciri',0,NaN,[],1.5]){
  assert.equal(monsterMasterId(input),null);assert.deepEqual(monsterImageSources(input),[]);
  assert.deepEqual(await resolveMonsterImageSources(input,{name:'Ciri',fetcher:()=>{throw new Error('No request permitted');}}),[]);
 }
});

test('SWEX import retains the account instance and resolves Ciri, her counterpart and awakening separately',async()=>{
 const account=normalizeAccount({wizard_id:1,runes:[],unit_list:[{unit_id:987654321,unit_master_id:29313,con:700,atk:800,def:650,spd:103,class:6,unit_level:40,runes:[{rune_id:1,slot_no:2,set_id:3,class:6,upgrade_curr:15,pri_eff:[8,42],sec_eff:[]}]}]});
 const unit=account.units[0];assert.equal(unit.id,987654321);assert.equal(unit.master,29313);
 const calls=[],fetcher=async url=>{calls.push(url);return {ok:true,json:async()=>url===MONSTER_IMAGE_INDEX_URL?{'29313':'unit_icon_0142_1_3.png','29713':'unit_icon_0151_1_3.png','29703':'unit_icon_0151_0_3.png'}:{version:1,monsters:{},names:{ciri:'unit_icon_wrong_by_name.png'}}};};
 const [collab,original,unawakened]=await Promise.all([resolveMonsterImageSources(unit,{fetcher}),resolveMonsterImageSources(29713,{fetcher}),resolveMonsterImageSources(29703,{fetcher})]);
 assert.equal(collab[0],`${COMMUNITY_MONSTER_CDN}unit_icon_0142_1_3.png`);
 assert.equal(original[0],`${COMMUNITY_MONSTER_CDN}unit_icon_0151_1_3.png`);
 assert.equal(unawakened[0],`${COMMUNITY_MONSTER_CDN}unit_icon_0151_0_3.png`);
 assert.equal(calls.length,2);assert.ok(calls.every(url=>!url.includes('987654321')));
});

test('an unknown ID cannot pick a same-name API record with another master ID',async()=>{
 const calls=[],fetcher=async url=>{calls.push(url);return {ok:true,json:async()=>url===MONSTER_IMAGE_INDEX_URL?{}:url.includes('api/v2')?{results:[{com2us_id:29713,name:'Ciri',image_filename:'unit_icon_wrong.png'}]}:{version:1,monsters:{},names:{ciri:'unit_icon_wrong.png'}}};};
 assert.deepEqual(await resolveMonsterImageSources(99973,{name:'Ciri',element:3,fetcher}),[]);
 assert.ok(calls.some(url=>url.endsWith('?com2us_id=99973')));assert.ok(calls.every(url=>!url.includes('?name=')));
});
