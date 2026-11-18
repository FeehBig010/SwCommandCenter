import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAttackRunePolicy } from '../src/core/attack-improvement-policy.js';
import { fixture, freeFrom } from './fixtures/attack-tradeoffs.mjs';
import { makeTeam, blankConfig, DEFAULT_OPTIONS } from '../src/core/data.js';
import { diagnoseAttackTradeoffs } from '../src/core/attack-tradeoffs.js';
import { accountStamp } from '../src/core/loadouts.js';

test('T1-01: outro preset de ataque Siege usa a runa 101, mas ela permanece elegivel para o ataque selecionado',()=>{
 const { account, team } = fixture();
 const rune = freeFrom(account, 1, { spd: 8, newId: 101 });
 
 // Cria um segundo ataque Siege que usa a runa 101
 const otherAttack = {
  ...makeTeam('siege'),
  id: 'other-attack',
  name: 'Outro Ataque Siege',
  mode: 'attack',
  gameMode: 'siege',
  isPriority: true,
  plannedRunes: {
   accountStamp: accountStamp(account),
   byConfig: { slot1: [101] }
  }
 };

 const allTeams = [team, otherAttack];
 const policy = resolveAttackRunePolicy(account, team, allTeams);

 assert.ok(policy.eligibleRuneIds.has(101), 'Runa 101 deve ser elegivel para o ataque atual');
 assert.ok(!policy.blockedRuneIds.has(101), 'Runa 101 nao deve ser bloqueada por pertencer a outro ataque');
});

test('T1-02: defesa simultanea reserva a runa 102 ou locks explicitos bloqueiam',()=>{
 const { account, team } = fixture();
 const rune102 = freeFrom(account, 1, { spd: 8, newId: 102 });
 const rune103 = freeFrom(account, 2, { spd: 8, newId: 103 });
 const rune104 = freeFrom(account, 3, { spd: 8, newId: 104 });
 const rune105 = freeFrom(account, 4, { spd: 8, newId: 105 });

 // 1. Defesa simultanea de Siege com plano
 const defenseTeam = {
  ...makeTeam('siege'),
  id: 'def-1',
  name: 'Defesa Torre 12',
  mode: 'defense',
  gameMode: 'siege',
  plannedRunes: {
   accountStamp: accountStamp(account),
   byConfig: { defSlot1: [102] }
  }
 };

 // 2. Lock explicito em options
 const optionsBlocked = { blockedRuneIds: [103] };

 // 3. Lock local de runa
 const optionsLocalLock = { localLocks: { runeIds: [104], unitIds: [] } };

 // 4. Lock do jogo
 rune105.locked = true;
 const optionsGameLock = { respectLocks: true };

 const polDef = resolveAttackRunePolicy(account, team, [team, defenseTeam]);
 assert.ok(polDef.blockedRuneIds.has(102), 'Runa da defesa deve estar bloqueada');
 assert.match(polDef.reasons.get(102), /defesa simultânea/i);

 const polBlocked = resolveAttackRunePolicy(account, team, [team], optionsBlocked);
 assert.ok(polBlocked.blockedRuneIds.has(103), 'Runa em blockedRuneIds deve estar bloqueada');

 const polLocal = resolveAttackRunePolicy(account, team, [team], optionsLocalLock);
 assert.ok(polLocal.blockedRuneIds.has(104), 'Runa com localLock deve estar bloqueada');

 const polGame = resolveAttackRunePolicy(account, team, [team], optionsGameLock);
 assert.ok(polGame.blockedRuneIds.has(105), 'Runa locked no jogo deve estar bloqueada');
});

test('T1-03: runa em monstro externo sem lock e elegivel; pool RTA e Intangible sao bloqueados',()=>{
 const { account, team } = fixture();

 // Adiciona um monstro externo no inventario
 const outsideUnit = {
  id: 99,
  master: 10101,
  name: 'Veromos',
  level: 40,
  base: { hp: 10000, atk: 700, def: 700, spd: 100, cr: 15, cd: 50, res: 15, acc: 0 },
  runeIds: [201],
  artifactIds: []
 };
 account.units.push(outsideUnit);
 account.runes.push({
  id: 201,
  slot: 1,
  owner: 99,
  set: 13,
  stars: 6,
  level: 15,
  main: [3, 160],
  innate: [],
  subs: [[8, 25, 0, 0]]
 });

 // Runa RTA
 account.runes.push({
  id: 202,
  slot: 2,
  owner: 0,
  pool: 'rta',
  set: 13,
  stars: 6,
  level: 15,
  main: [8, 42],
  innate: [],
  subs: []
 });

 // Runa Intangible (set 25)
 account.runes.push({
  id: 203,
  slot: 3,
  owner: 0,
  set: 25,
  stars: 6,
  level: 15,
  main: [5, 160],
  innate: [],
  subs: []
 });

 const policy = resolveAttackRunePolicy(account, team, [team]);
 assert.ok(policy.eligibleRuneIds.has(201), 'Runa em monstro externo sem lock deve ser elegivel');
 assert.ok(policy.blockedRuneIds.has(202), 'Runa RTA deve ser bloqueada');
 assert.match(policy.reasons.get(202), /RTA/i);
 assert.ok(policy.blockedRuneIds.has(203), 'Runa Intangible deve ser bloqueada');

 // Se o monstro externo for travado localmente, sua runa torna-se bloqueada
 const lockedUnitPolicy = resolveAttackRunePolicy(account, team, [team], { localLocks: { unitIds: [99], runeIds: [] } });
 assert.ok(lockedUnitPolicy.blockedRuneIds.has(201), 'Runa de monstro travado deve ser bloqueada');
 assert.match(lockedUnitPolicy.reasons.get(201), /trava/i);
});

test('T1-04: integracao com diagnoseAttackTradeoffs no modo improve-preset',()=>{
 const { account, team } = fixture();
 const rune = freeFrom(account, 1, { spd: 12, newId: 301 });

 // Outro ataque de Siege prioritario que no modo legacy bloquearia a runa
 const otherAttack = {
  ...makeTeam('siege'),
  id: 'other-priority',
  name: 'Outro Ataque Prioritario',
  mode: 'attack',
  gameMode: 'siege',
  priorityFocus: true,
  configs: [{ enabled: true, unitId: 10 }]
 };
 account.units.push({ id: 10, name: 'Perna', runeIds: [301] });
 rune.owner = 10;

 const options = { ...DEFAULT_OPTIONS, equipped: true, minLevel: 0, artifacts: true };

 // No modo legacy, priorityReservations bloqueia runas de outros ataques prioritarios
 const legacyReport = diagnoseAttackTradeoffs(account, team, options, [], [team, otherAttack], { focus: 'spd', maxLoss: 20, strategy: 'legacy' });
 assert.ok(!legacyReport.proposals.some(p => p.builds[0].runeIds.includes(301)), 'No modo legacy a runa de outro ataque prioritario fica bloqueada');

 // No modo improve-preset, outro ataque de Siege nao bloqueia a runa
 const v3Report = diagnoseAttackTradeoffs(account, team, options, [], [team, otherAttack], { focus: 'spd', maxLoss: 20, strategy: 'improve-preset' });
 assert.ok(v3Report.proposals.length > 0, 'No modo improve-preset a runa deve ser elegivel');
 assert.ok(v3Report.proposals[0].builds[0].runeIds.includes(301), 'A proposta deve conseguir usar a runa 301');
});
