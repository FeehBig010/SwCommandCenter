import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveAttackOrder, validateAttackFunctionalSync } from '../src/core/attack-functional-sync.js';
import { tradeoffTimingValid, searchAttackImprovements, diagnoseAttackTradeoffs } from '../src/core/attack-tradeoffs.js';
import { fixture, freeFrom } from './fixtures/attack-tradeoffs.mjs';
import { DEFAULT_OPTIONS } from '../src/core/data.js';

test('T4-01: deriveAttackOrder valida chaves confirmadas e deriva ordem de simulacao',()=>{
 const { account, team } = fixture();
 const configs = team.configs;
 const validKeys = configs.map(c => c.key);

 // 1. Ordem confirmada pelo usuario
 team.confirmedTurnOrderKeys = [validKeys[0], validKeys[1], validKeys[2]];
 const confirmed = deriveAttackOrder(account, team);
 assert.equal(confirmed.status, 'complete');
 assert.equal(confirmed.source, 'confirmed');
 assert.deepEqual(confirmed.orderKeys, team.confirmedTurnOrderKeys);

 // 2. Ordem com chaves inexistentes/invalidas -> nao aceita como confirmada valida
 team.confirmedTurnOrderKeys = ['chave-fantasma-1', 'chave-fantasma-2', validKeys[0]];
 const invalidConfirmed = deriveAttackOrder(account, team);
 assert.notEqual(invalidConfirmed.source, 'confirmed');

 // 3. Derivacao automatica a partir do baseline
 delete team.confirmedTurnOrderKeys;
 const derived = deriveAttackOrder(account, team);
 assert.equal(derived.status, 'complete');
 assert.equal(derived.orderKeys.length, configs.length);
});

test('T4-02: candidato joga um tick mais tarde que o baseline, mas preserva ordem e anti-corte: VALIDO no modo V3',()=>{
 const configs = [{ key: 'c1' }, { key: 'c2' }, { key: 'c3' }];
 const baselineTiming = {
  order: ['c1', 'c2', 'c3'],
  ready: { c1: 5, c2: 5, c3: 5 },
  action: { c1: 5, c2: 6, c3: 7 },
  enemyBefore: { c1: 0, c2: 0, c3: 0 }
 };

 // Candidato age nos ticks 6, 7, 8 (um tick mais tarde que o baseline)
 const laterCandidateTiming = {
  order: ['c1', 'c2', 'c3'],
  ready: { c1: 6, c2: 6, c3: 6 },
  action: { c1: 6, c2: 7, c3: 8 },
  enemyBefore: { c1: 0, c2: 0, c3: 0 }
 };

 // No modo legacy, tradeoffTimingValid rejeitaria porque action > baseline.action
 assert.equal(tradeoffTimingValid(laterCandidateTiming, baselineTiming, configs), false);

 // No modo V3 (validateAttackFunctionalSync), e valido pois preserva a ordem e sem corte inimigo
 const syncResult = validateAttackFunctionalSync(laterCandidateTiming, baselineTiming, {
  confirmedOrderKeys: ['c1', 'c2', 'c3'],
  configs,
  enemyScenarioKnown: true
 });
 assert.equal(syncResult.valid, true, 'Deve ser valido mesmo agindo um tick mais tarde');
 assert.equal(syncResult.certainty, 'scenario');
});

test('T4-03: candidato inverte ordem, excede maxTick ou permite novo corte inimigo: INVALIDO',()=>{
 const configs = [{ key: 'c1' }, { key: 'c2', maxTick: 7 }, { key: 'c3' }];
 const baselineTiming = {
  order: ['c1', 'c2', 'c3'],
  ready: { c1: 5, c2: 5, c3: 5 },
  action: { c1: 5, c2: 6, c3: 7 },
  enemyBefore: { c1: 0, c2: 0, c3: 0 }
 };

 // 1. Inversao de ordem (c2 joga antes de c1)
 const invertedTiming = {
  order: ['c2', 'c1', 'c3'],
  ready: { c1: 5, c2: 5, c3: 5 },
  action: { c2: 5, c1: 6, c3: 7 },
  enemyBefore: { c1: 0, c2: 0, c3: 0 }
 };
 const resInverted = validateAttackFunctionalSync(invertedTiming, baselineTiming, {
  confirmedOrderKeys: ['c1', 'c2', 'c3'],
  configs
 });
 assert.equal(resInverted.valid, false, 'Inversão de ordem deve invalidar');
 assert.match(resInverted.reasons[0], /ordem|sequência/i);

 // 2. Exceder maxTick (c2 age no tick 8, mas maxTick e 7)
 const exceededMaxTick = {
  order: ['c1', 'c2', 'c3'],
  ready: { c1: 6, c2: 6, c3: 6 },
  action: { c1: 6, c2: 8, c3: 9 },
  enemyBefore: { c1: 0, c2: 0, c3: 0 }
 };
 const resExceeded = validateAttackFunctionalSync(exceededMaxTick, baselineTiming, {
  confirmedOrderKeys: ['c1', 'c2', 'c3'],
  configs
 });
 assert.equal(resExceeded.valid, false, 'Exceder maxTick deve invalidar');
 assert.match(resExceeded.reasons[0], /Tick/i);

 // 3. Novo corte inimigo (inimigo agiu antes de c3)
 const enemyCutTiming = {
  order: ['c1', 'c2', 'c3'],
  ready: { c1: 5, c2: 6, c3: 7 },
  action: { c1: 5, c2: 6, c3: 7 },
  enemyBefore: { c1: 0, c2: 0, c3: 1 }
 };
 const resCut = validateAttackFunctionalSync(enemyCutTiming, baselineTiming, {
  confirmedOrderKeys: ['c1', 'c2', 'c3'],
  configs,
  enemyScenarioKnown: true
 });
 assert.equal(resCut.valid, false, 'Corte inimigo deve invalidar');
 assert.match(resCut.reasons[0], /inimigo/i);
});

test('T4-04: sem dados do inimigo reporta certeza parcial e risco indeterminado',()=>{
 const configs = [{ key: 'c1' }, { key: 'c2' }, { key: 'c3' }];
 const baselineTiming = {
  order: ['c1', 'c2', 'c3'],
  ready: { c1: 5, c2: 5, c3: 5 },
  action: { c1: 5, c2: 6, c3: 7 },
  enemyBefore: { c1: 0, c2: 0, c3: 0 }
 };

 const candidateTiming = {
  order: ['c1', 'c2', 'c3'],
  ready: { c1: 5, c2: 5, c3: 5 },
  action: { c1: 5, c2: 6, c3: 7 },
  enemyBefore: { c1: 0, c2: 0, c3: 0 }
 };

 const res = validateAttackFunctionalSync(candidateTiming, baselineTiming, {
  confirmedOrderKeys: ['c1', 'c2', 'c3'],
  configs,
  enemyScenarioKnown: false
 });
 assert.equal(res.valid, true);
 assert.equal(res.certainty, 'partial', 'Sem inimigo conhecido a certeza deve ser partial');
});
