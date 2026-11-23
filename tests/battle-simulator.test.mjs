import assert from 'node:assert/strict';
import {test} from 'node:test';
import {battleFromHash,battleLink,normalizeBattle,runBattle} from '../src/core/battle-simulator.js';

const unit = (key, spd, atb=0, skills=[]) => ({key,master:26811,spd,atb,skills});
const skill = (trigger, ...effects) => ({name:'Teste',trigger,effects});
const battle = (...units) => ({version:1,name:'Simulação · teste',turns:8,units});
const run = (...units) => runBattle(battle(...units),String);

test('Siege uses ticks, overflow, existing tie policy and immediate speed changes', () => {
  const first=run(unit('a1',300),unit('a2',280),unit('e1',290));
  assert.deepEqual(first.turns.slice(0,3).map(t=>[t.key,t.tick]),[['a1',5],['e1',6],['a2',7]]);
  assert.ok(first.turns[0].atb>100);
  assert.equal(run(unit('a1',290),unit('e1',290)).turns[0].key,'e1');
  assert.equal(run(unit('a1',280),unit('e1',290)).turns[0].key,'e1');
});

test('turn-zero effects run sequentially and dynamically target the lowest eligible ATB', () => {
  const opener=unit('a1',300,20,[skill('initial',
    {type:'boost',target:'lowestAlly',condition:'below',threshold:30,amount:50},
    {type:'boost',target:'lowestAlly',condition:'below',threshold:30,amount:50},
    {type:'boost',target:'lowestAlly',condition:'below',threshold:10,amount:50},
  )]);
  const result=run(opener,unit('a2',200),unit('e1',250));
  assert.deepEqual(result.log.slice(0,3).map(e=>[e.tick,e.targets]),[[0,['a2']],[0,['a1']],[0,[]]]);
  assert.equal(result.turns[0].key,'a1');
});

test('repeat and one-off effects respect turns, immunity and status expiration', () => {
  const result=run(unit('a1',300,95,[
    skill('initial',{type:'immunity',target:'specific',specific:'e1',duration:1}),
    skill('repeat',{type:'stun',target:'enemy',duration:1}),
    skill('once',{type:'speed_buff',target:'self',duration:1}),
  ]),unit('e1',260,75));
  assert.ok(result.log.some(e=>e.type==='immune'));
  assert.equal(result.log.filter(e=>e.type==='speed_buff').length,1);
  assert.ok(result.log.some(e=>e.type==='expired'&&e.field==='speedBuff'));
  assert.ok(result.turns.some(t=>t.key==='e1'&&t.disabled));
});

test('versioned JSON and hash link round-trip without account state', () => {
  const data=battle(unit('a1',290),unit('e1',280));
  const link=battleLink({...data,account:{secret:true}},'https://example.com/#/battle-simulator');
  assert.deepEqual(battleFromHash(new URL(link).hash),normalizeBattle(data));
  assert.ok(!link.includes('secret'));
  assert.throws(()=>normalizeBattle(battle(unit('a1',200),unit('a1',210))),/posições únicas/);
});
