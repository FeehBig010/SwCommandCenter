import test from 'node:test';
import assert from 'node:assert/strict';
import {monsterPickerOptions,awakenedMonsterId,variantSearchNames,collectionOrder} from '../src/core/monster-variants.js';
import {filterMonsterBrowser,indexMonsterBrowser} from '../src/core/monster-browser.js';
const option=(master,name)=>({master,value:String(master),name,element:master%10});
test('catalog collapses unawakened choices onto verified first awakening while retaining distinct 2A masters',()=>{
 const original=[option(10101,'Fairy'),option(10111,'Elucia'),option(10131,'Elucia')],snapshot=structuredClone(original),choices=monsterPickerOptions(original);
 assert.deepEqual(choices.map(o=>o.master),[10111,10131]);assert.ok(choices.every(o=>o.portraitMaster===o.master));assert.equal(awakenedMonsterId(10101),10111);assert.deepEqual(original,snapshot);
 const prefixed=monsterPickerOptions(original.map(o=>({...o,value:`catalog:${o.master}`})));assert.deepEqual(prefixed.map(o=>o.value),['catalog:10111','catalog:10131']);assert.deepEqual(monsterPickerOptions(prefixed),prefixed);
});
test('search finds collab, original, awakened and family names without crossing elements or changing exact selection IDs',()=>{
 const index=indexMonsterBrowser([option(26311,'Pure Vanilla Cookie'),option(26801,'Pudding Princess'),option(26811,'Adriana'),option(29705,'Magic Order Swordsinger'),option(29315,'Ciri')]);
 for(const query of ['Pure Vanilla Cookie','Adriana','Pudding Princess'])assert.deepEqual(filterMonsterBrowser(index,{query}).map(o=>o.master),[26311,26811]);
 for(const query of ['Fiona','Ciri','Magic Order Swordsinger'])assert.deepEqual(filterMonsterBrowser(index,{query,elements:[5]}).map(o=>o.master),[29315,29715]);
 assert.ok(variantSearchNames(29715).includes('Ciri'));assert.ok(!variantSearchNames(29715).includes('Rigna'));assert.ok(variantSearchNames(31711).includes('Black Tortoise Champion'));assert.equal(awakenedMonsterId(31711),31711);
});
test('owned SWEX instances retain IDs and stats; only portraits gain an awakening and copies stay distinct',()=>{
 const original=[{...option(10101,'Fairy'),value:'unit:42',unitId:42},{...option(10101,'Fairy'),value:'unit:43',unitId:43}],snapshot=structuredClone(original),choices=monsterPickerOptions(original);
 assert.deepEqual(choices.map(o=>[o.value,o.master,o.unitId,o.portraitMaster]),[['unit:42',10101,42,10111],['unit:43',10101,43,10111]]);assert.deepEqual(original,snapshot);
});
test('collection uses ascending game family IDs and elements, independent of alphabetic names or invented dates',()=>{
 const choices=monsterPickerOptions([option(29715,'Fiona'),option(15713,'Seara'),option(10114,'Neal'),option(10112,'Iselia'),option(10111,'Elucia')]);
 assert.deepEqual(choices.map(o=>o.master),[10111,10112,10114,15713,29715]);assert.deepEqual(collectionOrder(29715).slice(0,3),[29700,5,1]);
});

test('current verified releases feed the real catalog: Driana is Wind Justice, awakened 34213 and never Adriana',async()=>{
 const {MONSTER_CATALOG,monsterImageSources}=await import('../src/core/monsters.js');
 const driana=MONSTER_CATALOG.find(o=>o.master===34213);assert.equal(driana.name,'Driana');assert.equal(driana.element,3);
 const index=indexMonsterBrowser(MONSTER_CATALOG);
 for(const query of ['Driana','Justice'])assert.ok(filterMonsterBrowser(index,{query,stars:[5],elements:[3]}).some(o=>o.master===34213));
 assert.ok(!filterMonsterBrowser(index,{query:'Driana',elements:[1]}).some(o=>o.master===34213));assert.equal(MONSTER_CATALOG.find(o=>o.master===26811).name,'Adriana');
 assert.ok(monsterImageSources(34213).some(url=>url.endsWith('/unit_icon_0202_1_3.png')));
 assert.ok(!filterMonsterBrowser(index,{query:'Justice'}).some(o=>o.master===34203));
});
