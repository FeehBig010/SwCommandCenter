import test from 'node:test';import assert from 'node:assert/strict';
import {simulateRuneImprovement,projectRuneImprovement} from '../src/core/rune-workshop.js';
import {requiresLogin} from '../src/core/navigation-access.js';
const rune=()=>({id:1,owner:7,set:3,slot:2,stars:6,level:15,ancient:false,main:[2,63],innate:[],subs:[[8,15,0,0],[4,8,0,0],[6,8,0,0],[9,6,0,0]]});
test('virtual SPD grind 15 to 20 projects exactly +5 on equipped monster without mutating SWEX',()=>{
 const original=rune(),snapshot=JSON.stringify(original),draft=simulateRuneImprovement(original,{kind:'grind',index:0,stat:8,value:5});
 const account={runes:[original],units:[{id:7,name:'Teon',master:10914,runeIds:[1],artifactIds:[],base:{hp:10000,atk:800,def:600,spd:100,cr:15,cd:50,res:15,acc:0}}],artifacts:[]};
 const projection=projectRuneImprovement(account,original,draft);assert.equal(draft.subs[0][1]+draft.subs[0][3],20);assert.equal(projection.before.spd,115);assert.equal(projection.after.spd,120);assert.equal(projection.gains.spd,5);assert.equal(JSON.stringify(original),snapshot);assert.equal(account.runes[0],original);
});
test('gem locks one secondary slot and retains constraints across subsequent virtual changes',()=>{
 const original=rune(),draft=simulateRuneImprovement(original,{kind:'gem',index:3,stat:12,value:11});assert.deepEqual(draft.subs[3],[12,11,1,0]);assert.throws(()=>simulateRuneImprovement(draft,{kind:'gem',index:2,stat:11,value:11}),/Somente um slot/);
 assert.throws(()=>simulateRuneImprovement(original,{kind:'gem',index:3,stat:4,value:10}),/não permitido/);
 assert.throws(()=>simulateRuneImprovement(original,{kind:'grind',index:0,stat:8,value:6}),/limite/);
 assert.throws(()=>simulateRuneImprovement(original,{kind:'grind',index:0,stat:8,value:1.5}),/limite/);
 assert.throws(()=>simulateRuneImprovement({...original,stars:5},{kind:'grind',index:0,stat:8,value:5}),/seis estrelas/);
});
test('Ancient ceilings remain distinct and unequipped runes do not project a fabricated owner',()=>{
 const r={...rune(),ancient:true},draft=simulateRuneImprovement(r,{kind:'grind',index:0,stat:8,value:6});assert.equal(draft.subs[0][3],6);assert.throws(()=>simulateRuneImprovement(r,{kind:'grind',index:0,stat:8,value:7}),/limite/);assert.equal(projectRuneImprovement({units:[],runes:[r]},r,draft),null);assert.equal(requiresLogin('workshop'),true);assert.equal(requiresLogin('quick'),false);
});
