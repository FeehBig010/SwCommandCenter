import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_OPTIONS} from '../src/core/data.js';
import {fixture} from './fixtures/siege-rotation.mjs';
import * as feature from '../src/core/siege-rotation-optimizer.js';

const options={...DEFAULT_OPTIONS,depth:'fast',minLevel:0,equipped:false};

test('worker objective scores both canonical orders, branches and the unmodified current snapshot',()=>{
 const {account,team,target}=fixture(),before=structuredClone({account,team});
 const r=feature.optimizeSiegeRotation(account,team,target,options);
 assert.equal(r.status,'complete');
 assert.equal(r.alternatives[0].upper,7380);
 assert.equal(r.alternatives[0].lower,5309);
 assert.deepEqual(r.orders.map(order=>order.upper).sort((a,b)=>b-a),[7380,6245]);
 assert.equal(r.alternatives[0].branches[0].win,'abaixo-do-hp');
 assert.equal(r.alternatives[0].branches[1].win,'atinge-hp-no-ramo');
 assert.equal(new Set(r.alternatives[0].builds.flatMap(b=>b.runeIds)).size,18);
 assert.equal(new Set(r.alternatives[0].builds.flatMap(b=>b.artifactIds)).size,3);
 assert.equal(r.alternatives[0].branches[0].actions[2].attackBuff,true);
 assert.ok(r.alternatives.some(row=>row.kind==='current'));
 assert.deepEqual({account,team},before);
});

test('mandatory cut, locks, reservations and duplicate artifacts cannot become a ranked result',()=>{
 const {account,team,target}=fixture();
 assert.equal(feature.optimizeSiegeRotation(account,team,{...target,spd:850},options).status,'no-valid-allocation');
 assert.equal(feature.optimizeSiegeRotation(account,team,target,options,()=>{},[1]).status,'no-valid-allocation');
 const locked=feature.optimizeSiegeRotation(account,team,target,{...options,localLocks:{unitIds:[1]}});
 assert.deepEqual(locked.alternatives[0].builds.find(b=>b.key==='A').runeIds,[1,2,3,4,5,6]);
 account.units[1].artifactIds=[100];
 assert.throws(()=>feature.optimizeSiegeRotation(account,team,target,options),/artefato.*repetido/i);
});

test('unknown ignore ranks a materially better lower-bound alternative without treating the ceiling as guaranteed',()=>{
 const {account,team,target}=fixture();
 account.runes.push({id:90,slot:1,set:1,owner:0,main:[3,350],innate:[],subs:[],level:15,stars:6});
 const result=feature.optimizeSiegeRotation(account,team,{...target,ignorePercent:''},options);
 const [best,robust]=result.alternatives;
 assert.equal(best.kind,'damage');
 assert.equal(robust?.kind,'robust');
 assert.ok(robust.lower>best.lower);
 assert.ok(robust.upper<best.upper);
 assert.ok(best.branches.some(b=>b.risks.some(r=>r.includes('0–100%'))));
 assert.ok(result.checked<=result.limit);
 team.configs[1].maxTick=6;
 assert.equal(feature.optimizeSiegeRotation(account,team,target,options).status,'no-valid-allocation');
});

test('a large eligible pool keeps a synchronized equipped allocation in range of the bounded search',()=>{
 const {account,team,target}=fixture();
 for(let i=1;i<=180;i++)account.runes.push({id:2000+i,slot:1+i%6,set:1,owner:0,main:[3,100+i],innate:[],
  subs:[[8,i%16,0,0],[10,i%13,0,0]],level:15,stars:6});
 const report=feature.optimizeSiegeRotation(account,team,target,options);
 assert.equal(report.status,'complete');
 assert.ok(report.alternatives[0].upper>=7380);
 assert.ok(report.checked<=80);
});
