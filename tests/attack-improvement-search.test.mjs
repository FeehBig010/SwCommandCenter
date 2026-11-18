import test from 'node:test';
import assert from 'node:assert/strict';
import { searchAttackImprovements, diagnoseAttackTradeoffs } from '../src/core/attack-tradeoffs.js';
import { fixture, freeFrom } from './fixtures/attack-tradeoffs.mjs';
import { makeTeam, DEFAULT_OPTIONS } from '../src/core/data.js';
import { accountStamp } from '../src/core/loadouts.js';

test('T3-01: dois ataques Siege podem usar a mesma runa em planos separados com 18 IDs unicos',()=>{
 const { account, team } = fixture();
 const rune = freeFrom(account, 1, { spd: 25, newId: 101 });

 // Outro time de ataque Siege que tem a runa 101 em seu plano
 const otherAttack = {
  ...makeTeam('siege'),
  id: 'other-attack-preset',
  name: 'Ataque 2 Siege',
  mode: 'attack',
  gameMode: 'siege',
  plannedRunes: {
   accountStamp: accountStamp(account),
   byConfig: { slotA: [101] }
  }
 };

 const report = searchAttackImprovements(account, team, DEFAULT_OPTIONS, [], [team, otherAttack], { focus: 'spd', maxLoss: 20 });
 assert.ok(report.proposals.length > 0, 'Deve encontrar proposta');
 
 for (const p of report.proposals) {
  const allIds = p.builds.flatMap(b => b.runeIds);
  assert.equal(allIds.length, 18, 'Time de Siege de 3 monstros deve ter 18 runas no total');
  assert.equal(new Set(allIds).size, 18, 'Todas as 18 runas dentro da proposta devem ser estritamente unicas');
  for (const build of p.builds) {
   assert.equal(build.runeIds.length, 6, 'Cada monstro deve ter exatamente 6 runas');
   assert.equal(new Set(build.runeIds).size, 6, 'Cada monstro deve ter 6 slots distintos');
  }
 }
});

test('T3-02: monstro externo tem runa superior; a busca a escolhe e identifica a origem nos transfers',()=>{
 const { account, team } = fixture();

 // Monstro externo no inventario
 const outsideUnit = {
  id: 77,
  master: 12345,
  name: 'Savannah',
  level: 40,
  base: { hp: 10000, atk: 800, def: 600, spd: 100, cr: 15, cd: 50, res: 15, acc: 0 },
  runeIds: [701],
  artifactIds: []
 };
 account.units.push(outsideUnit);
 account.runes.push({
  id: 701,
  slot: 1,
  owner: 77,
  set: 13,
  stars: 6,
  level: 15,
  main: [3, 160],
  innate: [],
  subs: [[8, 45, 0, 0]] // Runa de SPD significativamente superior
 });

 const report = searchAttackImprovements(account, team, DEFAULT_OPTIONS, [], [team], { focus: 'spd', maxLoss: 20 });
 assert.ok(report.proposals.length > 0, 'Deve encontrar proposta com a runa de Savannah');

 const proposalUsing701 = report.proposals.find(p => p.builds.some(b => b.runeIds.includes(701)));
 assert.ok(proposalUsing701, 'Ao menos uma proposta deve incluir a runa 701');

 const memberUsing701 = proposalUsing701.members.find(m => m.transfers.some(t => t.runeId === 701));
 assert.ok(memberUsing701, 'O monstro que recebeu a runa 701 deve registrar a transferencia');
 const transfer = memberUsing701.transfers.find(t => t.runeId === 701);
 assert.equal(transfer.from, 'Savannah', 'A origem da runa deve indicar Savannah');
});

test('T3-03: swap entre integrantes do time produz 18 IDs unicos e sem duplicacao',()=>{
 const { account, team } = fixture();

 // Injeta uma runa externa muito veloz em Savannah que estimula um swap em cadeia entre os membros da equipe
 account.units.push({
  id: 77,
  master: 12345,
  name: 'Savannah',
  level: 40,
  base: { hp: 10000, atk: 800, def: 600, spd: 100, cr: 15, cd: 50, res: 15, acc: 0 },
  runeIds: [701],
  artifactIds: []
 });
 account.runes.push({
  id: 701,
  slot: 1,
  owner: 77,
  set: 13,
  stars: 6,
  level: 15,
  main: [3, 160],
  innate: [],
  subs: [[8, 45, 0, 0]]
 });

 const report = searchAttackImprovements(account, team, DEFAULT_OPTIONS, [], [team], { focus: 'spd', maxLoss: 20 });
 assert.ok(report.proposals.length > 0, 'Deve gerar propostas com swaps válidos');

 const proposalWithSwap = report.proposals.find(p => 
  p.members.some(m => m.transfers.some(t => ['Lushen', 'Julie', 'Iris'].includes(t.from)))
 );
 assert.ok(proposalWithSwap, 'Deve encontrar ao menos uma proposta onde houve swap de runas entre integrantes do time');

 for (const p of report.proposals) {
  const ids = p.builds.flatMap(b => b.runeIds);
  assert.equal(new Set(ids).size, 18, 'Nunca deve haver duplicacao de runa na equipe conjunta');
  assert.equal(ids.length, 18, 'A equipe deve ter exatamente 18 runas no total');
 }
});

test('T3-04: mesma copia fisica repetida ou inventario insuficiente falha com seguranca',()=>{
 const { account, team } = fixture();

 // Copia repetida da mesma unidade fisica no slot 1 e 2
 const duplicateTeam = {
  ...team,
  configs: [
   { ...team.configs[0], key: 'slot-1', unitId: 1 },
   { ...team.configs[1], key: 'slot-2', unitId: 1 },
   { ...team.configs[2], key: 'slot-3', unitId: 3 }
  ]
 };

 assert.throws(
  () => searchAttackImprovements(account, duplicateTeam, DEFAULT_OPTIONS, [], [duplicateTeam]),
  /cópia distinta/i
 );

 // Inventario insuficiente: removemos todas as runas de slot 4 exceto as equipadas
 // e bloqueamos as equipadas do slot 4
 const blockedOptions = {
  ...DEFAULT_OPTIONS,
  blockedRuneIds: [4, 10, 16] // Todas as runas de slot 4 do time
 };
 const insufficientReport = searchAttackImprovements(account, team, blockedOptions, [], [team], { focus: 'spd', maxLoss: 0 });
 assert.equal(insufficientReport.status, 'none', 'Deve reportar status none quando nao houver distribuicao possivel');
 assert.equal(insufficientReport.proposals.length, 0, 'Nao deve gerar propostas incompletas');
});
