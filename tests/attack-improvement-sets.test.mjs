import test from 'node:test';
import assert from 'node:assert/strict';
import { requiredAttackSets, validateAttackSetsCapacity } from '../src/core/attack-improvement-sets.js';
import { fixture, freeFrom } from './fixtures/attack-tradeoffs.mjs';
import { DEFAULT_OPTIONS } from '../src/core/data.js';
import { diagnoseAttackTradeoffs } from '../src/core/attack-tradeoffs.js';

test('T2-01: build original Violent/Will com politica free nao herda sets de baseline.counts',()=>{
 const baselineBuild = {
  counts: { 13: 4, 15: 2 } // Swift x4, Will x2
 };
 
 // 1. Config sem sets e com attackSetPolicy padrao ('free')
 const configFree = {
  key: 'slot-1',
  sets: [],
  attackSetPolicy: 'free'
 };

 const setsFree = requiredAttackSets(configFree, baselineBuild, 'improve-preset');
 assert.deepEqual(setsFree, [], 'No modo improve-preset com sets livres, nao deve herdar sets do baseline');

 // 2. Config com set explicito escolhido pelo usuario (ex: apenas Will)
 const configWillOnly = {
  key: 'slot-1',
  sets: [15],
  attackSetPolicy: 'free'
 };
 const setsWillOnly = requiredAttackSets(configWillOnly, baselineBuild, 'improve-preset');
 assert.deepEqual(setsWillOnly, [15], 'Deve exigir apenas o set explicitamente marcado pelo usuario');
});

test('T2-02: politica required ou modo legacy mantem heranca de sets; erro legivel se exceder 6 slots',()=>{
 const baselineBuild = {
  counts: { 13: 4, 15: 2 } // Swift x4, Will x2
 };

 // No modo legacy herda sempre
 const configLegacy = {
  key: 'slot-1',
  sets: [],
  attackSetPolicy: 'free'
 };
 const setsLegacy = requiredAttackSets(configLegacy, baselineBuild, 'legacy');
 assert.ok(setsLegacy.includes(13), 'Modo legacy deve herdar set de 4 pecas');
 assert.ok(setsLegacy.includes(15), 'Modo legacy deve herdar set de 2 pecas');

 // No modo improve-preset com attackSetPolicy === 'required'
 const configRequired = {
  key: 'slot-1',
  sets: [],
  attackSetPolicy: 'required'
 };
 const setsReq = requiredAttackSets(configRequired, baselineBuild, 'improve-preset');
 assert.ok(setsReq.includes(13) && setsReq.includes(15), 'attackSetPolicy required deve herdar sets do baseline');

 // Validacao de capacidade
 assert.doesNotThrow(() => validateAttackSetsCapacity([13, 15])); // 4 + 2 = 6 pecas (ok)
 assert.throws(
  () => validateAttackSetsCapacity([13, 3]), // 4 + 4 = 8 pecas (excede 6)
  /ultrapassam 6 espaços/i
 );
});

test('T2-03: trocar sets encontra candidatos legais e preserva o baseline SWEX intocado',()=>{
 const { account, team } = fixture();
 // O usuario nao exige sets especificos (sets livres)
 team.configs[0].sets = [];
 
 // Cria um conjunto de runas Swift (set 3) super rapidas para o primeiro monstro
 // O monstro 1 estava equipado originalmente com Violent (set 13) e Will (set 15)
 for (let s = 1; s <= 6; s++) {
  freeFrom(account, s, { spd: 30, newId: 500 + s, set: 3 }); // Swift com SPD
 }

 const beforeAccount = structuredClone(account);
 const beforeTeam = structuredClone(team);

 const options = { ...DEFAULT_OPTIONS, equipped: true, minLevel: 0, artifacts: true };

 // Modo legacy exige Violent/Will herdado do baseline -> nao pode usar Swift
 const legacyReport = diagnoseAttackTradeoffs(account, team, options, [], [team], { focus: 'spd', maxLoss: 20, strategy: 'legacy' });
 assert.ok(legacyReport.proposals.every(p => p.builds[0].runeIds.every(id => id < 500)), 'Modo legacy nao permite trocar de Violent para Swift');

 // Modo improve-preset permite sets livres -> pode usar o Swift superior
 const v3Report = diagnoseAttackTradeoffs(account, team, options, [], [team], { focus: 'spd', maxLoss: 20, strategy: 'improve-preset' });
 assert.ok(v3Report.proposals.length > 0, 'Modo improve-preset deve encontrar propostas com sets livres');
 
 const firstBuild = v3Report.proposals[0].builds[0];
 const usedRunes = firstBuild.runeIds.map(id => account.runes.find(r => r.id === id));
 const swiftCount = usedRunes.filter(r => r.set === 3).length;
 assert.ok(swiftCount >= 4, 'Proposta do modo improve-preset utilizou o set Swift superior');

 // Verifica imutabilidade de account e team
 assert.deepEqual(account, beforeAccount, 'O inventario da conta no SWEX deve permanecer inalterado');
 assert.deepEqual(team.configs[0].sets, beforeTeam.configs[0].sets, 'A configuracao do time deve permanecer inalterada');
});
