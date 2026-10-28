import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,freeFrom} from './fixtures/attack-tradeoffs.mjs';
import {diagnoseAttackTradeoffs} from '../src/core/attack-tradeoffs.js';
import {tradeoffChip,TRADEOFF_LIMIT} from '../src/core/tradeoff-presentation.js';
const options={equipped:true,minLevel:0,artifacts:true,respectLocks:true};
test('actual optimizer Worker dispatches trade-off search, preserves tick order and refuses a forged inverted allocation',async()=>{
 const old=globalThis.self,messages=[];globalThis.self={postMessage:message=>messages.push(message)};
 try{
  await import('../src/core/optimizer.worker.js');
  for(const boost of [false,true]){
   const {account,team}=fixture();if(boost){account.units[0].master=18913;team.configs[0].masterId=18913;team.autoOpener=true;team.enemyCombatSpd=315;}freeFrom(account,1,{spd:8});
   const input={mode:'tradeoff',type:'search',account,team,options,reservedIds:[],allTeams:[team],settings:{focus:'spd',maxLoss:20}};
   messages.length=0;self.onmessage({data:input});assert.ok(messages.some(m=>m.type==='progress'));const result=messages.at(-1);assert.equal(result.type,'result');assert.ok(result.report.proposals.length);
   for(const p of result.report.proposals){assert.deepEqual(p.preview.scenario.firstTurns.filter(t=>!t.enemy).map(t=>t.key),team.configs.map(c=>c.key));assert.ok(p.members.every(m=>Number.isInteger(m.tick)&&Number.isInteger(m.actionTick)&&m.tick<=m.beforeTick));assert.ok(p.builds.every(b=>b.counts[13]>=4&&b.counts[15]>=2));}
   if(boost)assert.ok(result.report.proposals[0].preview.scenario.log.some(e=>e.type==='tiana'));
   self.onmessage({data:{...input,type:'validate',signature:result.report.signature,proposal:result.report.proposals[0]}});assert.equal(messages.at(-1).type,'validated');assert.equal(new Set(Object.values(messages.at(-1).plan.byConfig).flat()).size,18);
   if(!boost){const inverted=structuredClone(result.report.proposals[0]);[inverted.builds[0].runeIds,inverted.builds[1].runeIds]=[inverted.builds[1].runeIds,inverted.builds[0].runeIds];self.onmessage({data:{...input,type:'validate',signature:result.report.signature,proposal:inverted}});assert.equal(messages.at(-1).type,'error');assert.match(messages.at(-1).message,/Ticks e a ordem/);}
  }
  self.onmessage({data:{mode:'tradeoff',type:'unknown'}});assert.equal(messages.at(-1).type,'error');
  const legacy=fixture();legacy.team.configs.forEach(c=>{c.goals=Object.fromEntries(Object.keys(c.goals).map(k=>[k,0]));});messages.length=0;self.onmessage({data:{account:legacy.account,teams:[legacy.team],options:{...options,depth:'fast'},reservedIds:[]}});assert.equal(messages.at(-1).type,'done',JSON.stringify(messages.at(-1)));assert.ok(messages.at(-1).result);
 }finally{globalThis.self=old;}
});
test('equipped Will survives even if only Violent is demanded; incompatible equipped and demanded sets are explicit',()=>{
 const {account,team}=fixture();team.configs.forEach(c=>c.sets=[13]);freeFrom(account,6,{spd:20,set:13});assert.equal(diagnoseAttackTradeoffs(account,team,{...options,equipped:false}).proposals.length,0);
 team.configs[0].sets=[3];assert.throws(()=>diagnoseAttackTradeoffs(account,team,options),/equipados e exigidos não cabem/);
});
test('runes on a different priority attack cannot be borrowed; non-priority donors remain eligible',()=>{
 const {account,team}=fixture();const rune=freeFrom(account,1,{spd:8});rune.owner=99;account.units.push({id:99,name:'Prioritário',master:13413,runeIds:[101],artifactIds:[],base:{...account.units[0].base}});
 const other={id:'priority',mode:'attack',gameMode:'siege',priorityFocus:true,configs:[{key:'protected',unitId:99,enabled:true}]};
 assert.ok(diagnoseAttackTradeoffs(account,team,options,[],[team,other]).proposals.every(p=>p.builds.every(b=>!b.runeIds.includes(101))));
 account.units.find(u=>u.id===99).runeIds=[];assert.ok(diagnoseAttackTradeoffs(account,team,options,[],[team,other]).proposals.every(p=>p.builds.every(b=>!b.runeIds.includes(101))));
 assert.ok(diagnoseAttackTradeoffs(account,team,options,[],[team,{...other,priorityFocus:false}]).proposals.some(p=>p.builds.some(b=>b.runeIds.includes(101))));
});
test('scenario chips communicate losses without claiming an exhaustive global maximum',()=>{
 assert.equal(tradeoffChip({pareto:true}).label,'Otimização Perfeita');assert.equal(tradeoffChip({pareto:false}).label,'Sacrifício Calculado');assert.equal(TRADEOFF_LIMIT.label,'Limite Atingido');assert.match(TRADEOFF_LIMIT.description,/limites desta busca/);assert.doesNotMatch(TRADEOFF_LIMIT.description,/ao máximo|ótimo global/);
});
test('Worker revalidates tick locks after a UI preference change instead of applying a stale proposal',async()=>{
 const old=globalThis.self,messages=[];globalThis.self={postMessage:m=>messages.push(m)};
 try{
  // A unique module URL installs the actual handler on this test's worker scope.
  await import('../src/core/optimizer.worker.js?tick-lock-regression');
  const {account,team}=fixture();freeFrom(account,1,{spd:8});
  const input={mode:'tradeoff',type:'search',account,team,options,reservedIds:[],allTeams:[team],settings:{focus:'spd',maxLoss:20}};
  self.onmessage({data:input});const result=messages.at(-1);assert.equal(result.type,'result');assert.ok(result.report.proposals.length);
  const changed=structuredClone(team);[changed.configs[0],changed.configs[2]]=[changed.configs[2],changed.configs[0]];
  self.onmessage({data:{...input,type:'validate',team:changed,allTeams:[changed],signature:result.report.signature,proposal:result.report.proposals[0]}});
  assert.equal(messages.at(-1).type,'error');assert.match(messages.at(-1).message,/mud|atual|ordem|Tick/i);
 }finally{globalThis.self=old;}
});
