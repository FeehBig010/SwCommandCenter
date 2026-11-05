import test from 'node:test';
import assert from 'node:assert/strict';
import {indexMonsterBrowser,filterMonsterBrowser,monsterNaturalStars,toggleMonsterFilter} from '../src/core/monster-browser.js';
const options=[{value:'a',master:10131,name:'Elucia',element:1,stars:6},{value:'b',master:15713,name:'Seara',element:3},{value:'c',master:29715,name:'Fiona',element:5},{value:'d',master:27013,name:'Chamomile',element:3},{value:'e',master:999999,name:'Sem classificação',element:1}];
const index=indexMonsterBrowser(options);
test('catalog starts with all options, uses natural rarity including 2A and never current 6-star grade',()=>{
 assert.deepEqual(filterMonsterBrowser(index),options);assert.equal(monsterNaturalStars(options[0]),3);assert.equal(monsterNaturalStars(options[2]),4);assert.equal(monsterNaturalStars(options[1]),5);assert.equal(monsterNaturalStars(options[4]),null);
 assert.deepEqual(filterMonsterBrowser(index,{stars:[3]}).map(o=>o.value),['a']);
});
test('name, multiple natural rarities and multiple elements combine without duplicate results',()=>{
 assert.deepEqual(filterMonsterBrowser(index,{stars:[3,4],elements:[1,5]}).map(o=>o.value),['a','c']);
 assert.deepEqual(filterMonsterBrowser(index,{query:'fiOnA',stars:[4],elements:[5]}).map(o=>o.value),['c']);
 assert.deepEqual(filterMonsterBrowser(index,{stars:[5],elements:[1]}),[]);
 assert.equal(filterMonsterBrowser(index,{query:'classificacao'}).length,1);
 const selected=[3];assert.deepEqual(toggleMonsterFilter(selected,4),[3,4]);assert.deepEqual(toggleMonsterFilter(selected,3),[]);assert.deepEqual(selected,[3]);
});
