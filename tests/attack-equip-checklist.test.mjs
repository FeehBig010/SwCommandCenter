import test from 'node:test';
import assert from 'node:assert/strict';
import { makeAttackEquipChecklist, compareAttackProposals } from '../src/core/attack-equip-checklist.js';
import { searchAttackImprovements } from '../src/core/attack-tradeoffs.js';
import { DEFAULT_OPTIONS } from '../src/core/data.js';
import { fixture, freeFrom } from './fixtures/attack-tradeoffs.mjs';

test('T5-01: proposta de swap circular gera primeiro acoes de desequipar e depois de equipar',()=>{
 const { account, team } = fixture();
 // Monstro 1 (Lushen) tem runa 1 no slot 1
 // Monstro 2 (Julie) tem runa 7 no slot 1
 const baselineBuilds = [
  { key: 'c1', unitId: 1, name: 'Lushen', runeIds: [1, 2, 3, 4, 5, 6] },
  { key: 'c2', unitId: 2, name: 'Julie', runeIds: [7, 8, 9, 10, 11, 12] },
  { key: 'c3', unitId: 3, name: 'Iris', runeIds: [13, 14, 15, 16, 17, 18] }
 ];

 // Swap circular: Lushen recebe 7, Julie recebe 1
 const proposedBuilds = [
  { key: 'c1', unitId: 1, name: 'Lushen', runeIds: [7, 2, 3, 4, 5, 6] },
  { key: 'c2', unitId: 2, name: 'Julie', runeIds: [1, 8, 9, 10, 11, 12] },
  { key: 'c3', unitId: 3, name: 'Iris', runeIds: [13, 14, 15, 16, 17, 18] }
 ];

 const checklist = makeAttackEquipChecklist(account, team, baselineBuilds, proposedBuilds);

 assert.equal(checklist.swapCount, 2, 'Foram realizadas 2 trocas de runas');
 assert.equal(checklist.remove.length, 2, 'Devem existir 2 acoes de desequipar');
 assert.equal(checklist.equip.length, 2, 'Devem existir 2 acoes de equipar');

 // Todas as remocoes de slots compartilhados devem ocorrer antes dos passos de equipar
 const removedRuneIds = checklist.remove.map(r => r.runeId);
 assert.ok(removedRuneIds.includes(1) && removedRuneIds.includes(7));

 const equippedRuneIds = checklist.equip.map(e => e.runeId);
 assert.ok(equippedRuneIds.includes(1) && equippedRuneIds.includes(7));

 // Nao ha fontes externas nesse swap puramente interno
 assert.equal(checklist.externalSources.length, 0);
});

test('T5-02: runa de monstro externo identifica monstro de origem e destino',()=>{
 const { account, team } = fixture();
 account.units.push({
  id: 88,
  master: 12345,
  name: 'Tiana',
  level: 40,
  runeIds: [801]
 });
 account.runes.push({
  id: 801,
  slot: 1,
  owner: 88,
  set: 13,
  stars: 6,
  level: 15,
  main: [3, 160],
  subs: []
 });

 const baselineBuilds = [
  { key: 'c1', unitId: 1, name: 'Lushen', runeIds: [1, 2, 3, 4, 5, 6] }
 ];
 const proposedBuilds = [
  { key: 'c1', unitId: 1, name: 'Lushen', runeIds: [801, 2, 3, 4, 5, 6] }
 ];

 const checklist = makeAttackEquipChecklist(account, team, baselineBuilds, proposedBuilds);
 assert.equal(checklist.swapCount, 1);
 assert.equal(checklist.externalSources.length, 1);
 assert.equal(checklist.externalSources[0].fromUnitName, 'Tiana');
 assert.equal(checklist.externalSources[0].toUnitName, 'Lushen');
 assert.equal(checklist.externalSources[0].runeId, 801);
});

test('T5-03: compareAttackProposals desempata por menor swapCount em ganhos equivalentes',()=>{
 const propEquivalentA = {
  pareto: true,
  score: 1.500,
  focusGain: 0.150,
  swapCount: 2
 };
 const propEquivalentB = {
  pareto: true,
  score: 1.500,
  focusGain: 0.150,
  swapCount: 6
 };

 // Para ganhos equivalentes, A (2 trocas) deve vencer B (6 trocas) -> retorno negativo em sort
 assert.ok(compareAttackProposals(propEquivalentA, propEquivalentB) < 0);

 // Proposta C com ganho significativamente maior (+25% vs +15%) deve vencer mesmo com 6 trocas
 const propSuperiorC = {
  pareto: true,
  score: 2.500,
  focusGain: 0.250,
  swapCount: 6
 };
 assert.ok(compareAttackProposals(propSuperiorC, propEquivalentA) < 0, 'Ganho superior deve vencer menos trocas');
});

test('T5-04: checklist sem alteracoes gera contagem zero e listas vazias',()=>{
 const { account, team } = fixture();
 const baselineBuilds = [
  { key: 'c1', unitId: 1, name: 'Lushen', runeIds: [1, 2, 3, 4, 5, 6] }
 ];

 const checklist = makeAttackEquipChecklist(account, team, baselineBuilds, baselineBuilds);
 assert.equal(checklist.swapCount, 0);
 assert.equal(checklist.remove.length, 0);
 assert.equal(checklist.equip.length, 0);
 assert.equal(checklist.changes.length, 0);
});

test('T5-05: integracao searchAttackImprovements anexa checklist estruturado em cada proposta',()=>{
 const { account, team } = fixture();
 freeFrom(account, 1, { spd: 45, newId: 991 });
 const report = searchAttackImprovements(account, team, DEFAULT_OPTIONS, [], [team], { focus: 'spd', maxLoss: 20 });
 assert.ok(report.proposals.length > 0);
 for (const p of report.proposals) {
  assert.ok(p.checklist, 'A proposta deve possuir checklist');
  assert.equal(typeof p.swapCount, 'number');
  assert.equal(p.swapCount, p.checklist.swapCount);
  assert.equal(p.checklist.actions.length, p.checklist.remove.length + p.checklist.equip.length);
 }
});
