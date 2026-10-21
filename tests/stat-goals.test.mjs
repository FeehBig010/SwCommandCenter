import test from 'node:test';
import assert from 'node:assert/strict';
import { goalSlider, STAT_RANGES } from '../src/core/stat-goals.js';
import { blankConfig, DEFAULT_OPTIONS } from '../src/core/data.js';
import { optimize } from '../src/core/optimizer.js';

test('suggested ranges retain blank goals and existing manual/imported targets without truncation',()=>{
 assert.deepEqual(STAT_RANGES.hp,{min:0,max:50000});assert.deepEqual(STAT_RANGES.cd,{min:50,max:300});
 assert.equal(goalSlider('cd','').empty,true);assert.equal(goalSlider('cd','').value,50);
 assert.deepEqual(goalSlider('hp','65000'),{min:0,max:65000,value:65000,empty:false});
 assert.deepEqual(goalSlider('cd','20'),{min:20,max:300,value:20,empty:false});
 assert.equal(goalSlider('hp',28001).value,28001);assert.equal(goalSlider('spd','0').empty,false);
});
test('numeric and range target values reach the same optimizer deficit calculation',()=>{
 const unit={id:1,name:'Teste',master:19614,base:{hp:10000,atk:600,def:500,spd:100,cr:15,cd:50,res:15,acc:0},runeIds:[],artifactIds:[]};
 const account={units:[unit],runes:Array.from({length:6},(_,i)=>({id:i+1,slot:i+1,set:13,level:15,owner:0,main:[2,20],innate:[0,0],subs:[]})),artifacts:[]};
 function run(value){const c={...blankConfig(unit),basis:'total',goals:{...blankConfig(unit).goals,hp:value}};return optimize(account,[{id:'t',name:'T',priority:1,configs:[c]}],{...DEFAULT_OPTIONS,depth:'fast'});}
 const typed=run('23500'),ranged=run(String(goalSlider('hp','23500').value));
 assert.equal(typed.status,'approximate');assert.equal(ranged.status,typed.status);
 assert.deepEqual(ranged.builds[0].goals,typed.builds[0].goals);
 assert.equal(ranged.builds[0].goals[0].missing,1500);
 const empty=run('');assert.equal(empty.builds[0].goals.length,0);
});
