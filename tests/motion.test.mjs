import test from 'node:test';
import assert from 'node:assert/strict';
import {stepSpring,springAtRest,MOTION_SPRING,parseMotionDuration} from '../src/core/motion.js';
import {APPEARANCE_KEY,readAppearance,setAppearance,getAppearance,subscribeAppearance} from '../src/lib/appearance.js';

test('UI spring converges without large bounce and returns exactly to its resting tolerance',()=>{
 let state={position:0,velocity:0};
 for(let i=0;i<180;i++){state=stepSpring(state.position,state.velocity,1,1/60);assert.ok(Number.isFinite(state.position));assert.ok(state.position>=0&&state.position<1.02);}
 assert.ok(springAtRest(state,1));
 for(let i=0;i<180;i++)state=stepSpring(state.position,state.velocity,0,1/60);
 assert.ok(springAtRest(state,0));assert.deepEqual(MOTION_SPRING,{stiffness:280,damping:30,mass:1});
});
test('UI physics clamps long frames and ignores zero or negative elapsed time',()=>{
 assert.deepEqual(stepSpring(0,0,1,30),stepSpring(0,0,1,.032));
 for(const seconds of [0,-1,NaN])assert.deepEqual(stepSpring(.4,.2,1,seconds),{position:.4,velocity:.2});
});
test('motion tokens use milliseconds or seconds and reject unavailable duration values',()=>{
 assert.equal(parseMotionDuration('160ms'),160);assert.equal(parseMotionDuration(' .28s '),280);
 assert.equal(parseMotionDuration('0ms'),0);assert.equal(parseMotionDuration('',190),190);assert.equal(parseMotionDuration('-1s',190),190);
});
test('Office/War preference is isolated from account storage and notifies only actual changes',()=>{
 const data=new Map([['account','private snapshot'],['teams','presets']]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 let changes=0;const unsubscribe=subscribeAppearance(()=>changes++);
 try{
  assert.equal(readAppearance(storage),'war');assert.equal(setAppearance('office',storage),true);assert.equal(getAppearance(),'office');assert.equal(changes,1);
  setAppearance('office',storage);assert.equal(changes,1);assert.equal(readAppearance(storage),'office');
  assert.equal(setAppearance('invalid',storage),false);assert.equal(changes,1);
  assert.equal(data.get('account'),'private snapshot');assert.equal(data.get('teams'),'presets');assert.equal(data.size,3);assert.equal(data.get(APPEARANCE_KEY),'office');
  setAppearance('war',storage);assert.equal(changes,2);unsubscribe();setAppearance('office',storage);assert.equal(changes,2);
 }finally{unsubscribe();setAppearance('war',storage);}
});
test('blocked or invalid preference storage never prevents opening the application',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};
 assert.equal(readAppearance(blocked),'war');assert.equal(readAppearance({getItem:()=>'<invalid>'}),'war');
 assert.equal(setAppearance('office',blocked),true);assert.equal(getAppearance(),'office');setAppearance('war',blocked);
});
