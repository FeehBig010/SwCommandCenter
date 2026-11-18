import test from 'node:test';
import assert from 'node:assert/strict';
import { searchAttackImprovements } from '../src/core/attack-tradeoffs.js';
import { DEFAULT_OPTIONS } from '../src/core/data.js';
import { makeBolverkWoosaMoLongFixture, makeArenaCleaveFixture } from './fixtures/attack-acceptance-fixtures.mjs';

test('T6-01: Aceite Trio de Siege (Bolverk, Woosa, Mo Long) - 18 runas unicas, preservacao de ordem e checklist', () => {
  const { account, team } = makeBolverkWoosaMoLongFixture();

  // Adiciona runa superior no inventario para provocar melhoria
  account.runes.push({
    id: 9901,
    slot: 1,
    owner: 0,
    set: 3, // Swift
    stars: 6,
    level: 15,
    main: [3, 160],
    innate: [],
    subs: [
      [8, 32, 0, 0], // SPD alto
      [2, 20, 0, 0], // HP%
      [6, 15, 0, 0]  // DEF%
    ]
  });

  const report = searchAttackImprovements(
    account,
    team,
    DEFAULT_OPTIONS,
    [],
    [team],
    { focus: 'ehp', maxLoss: 15, depth: 'fast' }
  );

  assert.ok(report.proposals.length > 0, 'Deve encontrar ao menos uma proposta');

  for (const p of report.proposals) {
    const allIds = p.builds.flatMap(b => b.runeIds);
    assert.equal(allIds.length, 18, 'O trio deve totalizar exatamente 18 runas');
    assert.equal(new Set(allIds).size, 18, 'Nenhuma runa pode ser compartilhada no mesmo trio');

    // Woosa deve ser o primeiro monstro aliado a jogar
    const woosaKey = team.configs.find(c => c.unitId === 1)?.key;
    const firstAllyTurn = p.preview.scenario.firstTurns.find(t => !t.enemy);
    assert.equal(firstAllyTurn.key, woosaKey, 'Woosa deve ter a primeira acao aliada para colocar imunidade');

    // Checklist presente
    assert.ok(p.checklist, 'Checklist deve estar presente na proposta');
    assert.equal(p.swapCount, p.checklist.swapCount);
    assert.ok(p.checklist.actions.length > 0);
  }
});

test('T6-02: Aceite Quarteto de Arena (Adriana, Galleon, Sonia, Jamire) - 24 runas unicas e timing anti-corte', () => {
  const { account, team } = makeArenaCleaveFixture();

  // Adiciona runa no inventario para Adriana
  account.runes.push({
    id: 9902,
    slot: 1,
    owner: 0,
    set: 3, // Swift
    stars: 6,
    level: 15,
    main: [3, 160],
    innate: [],
    subs: [
      [8, 35, 0, 0], // SPD 35
      [2, 10, 0, 0]
    ]
  });

  const report = searchAttackImprovements(
    account,
    team,
    DEFAULT_OPTIONS,
    [],
    [team],
    { focus: 'spd', maxLoss: 10, depth: 'fast' }
  );

  assert.ok(report.proposals.length > 0, 'Deve encontrar proposta de Arena');

  for (const p of report.proposals) {
    const allIds = p.builds.flatMap(b => b.runeIds);
    assert.equal(allIds.length, 24, 'O quarteto de Arena deve totalizar exatamente 24 runas');
    assert.equal(new Set(allIds).size, 24, 'Nenhuma runa repetida entre os 4 monstros');

    // Adriana (Id 10) deve jogar antes do inimigo
    const adrianaKey = team.configs.find(c => c.unitId === 10)?.key;
    const adrianaTurn = p.preview.scenario.firstTurns.find(t => t.key === adrianaKey);
    const enemyTurn = p.preview.scenario.firstTurns.find(t => t.enemy);

    if (enemyTurn) {
      assert.ok(adrianaTurn.tick <= enemyTurn.tick, 'Adriana deve agir antes ou no mesmo tick do inimigo (sem corte)');
    }
  }
});

test('T6-03: Benchmarks de Latencia por Profundidade (fast e balanced)', () => {
  const { account, team } = makeBolverkWoosaMoLongFixture();

  // 1. Modo Fast
  const startFast = performance.now();
  const fastReport = searchAttackImprovements(
    account,
    team,
    DEFAULT_OPTIONS,
    [],
    [team],
    { focus: 'spd', maxLoss: 10, depth: 'fast' }
  );
  const fastElapsed = performance.now() - startFast;

  assert.ok(fastElapsed < 3000, `Modo fast deve ser responsivo (<3000ms), levou ${fastElapsed.toFixed(1)}ms`);
  assert.equal(fastReport.settings.depth, 'fast');

  // 2. Modo Balanced
  const startBalanced = performance.now();
  const balancedReport = searchAttackImprovements(
    account,
    team,
    DEFAULT_OPTIONS,
    [],
    [team],
    { focus: 'spd', maxLoss: 10, depth: 'balanced' }
  );
  const balancedElapsed = performance.now() - startBalanced;

  assert.ok(balancedElapsed < 6000, `Modo balanced deve ser estavel (<6000ms), levou ${balancedElapsed.toFixed(1)}ms`);
  assert.equal(balancedReport.settings.depth, 'balanced');
  assert.ok(balancedReport.checked >= fastReport.checked, 'Balanced deve explorar espaco de busca igual ou maior que fast');
});

test('T6-04: Imutabilidade Estrita do SWEX e Ausencia de Efeitos Colaterais', () => {
  const { account, team } = makeBolverkWoosaMoLongFixture();

  const originalAccountSnapshot = JSON.stringify(account);
  const originalTeamSnapshot = JSON.stringify(team);

  // Executa busca consecutiva com diferentes focos
  searchAttackImprovements(account, team, DEFAULT_OPTIONS, [], [team], { focus: 'spd', maxLoss: 20 });
  searchAttackImprovements(account, team, DEFAULT_OPTIONS, [], [team], { focus: 'ehp', maxLoss: 20 });

  const finalAccountSnapshot = JSON.stringify(account);
  const finalTeamSnapshot = JSON.stringify(team);

  assert.equal(
    finalAccountSnapshot,
    originalAccountSnapshot,
    'O payload original do SWEX jamais pode ser modificado pelo otimizador'
  );
  assert.equal(
    finalTeamSnapshot,
    originalTeamSnapshot,
    'O time de entrada e suas configuracoes permanecem intactos'
  );
});

test('T6-05: Resiliencia a Cancelamento com AbortSignal', () => {
  const { account, team } = makeBolverkWoosaMoLongFixture();
  const controller = new AbortController();

  // Aborta previamente
  controller.abort();

  assert.throws(() => {
    searchAttackImprovements(
      account,
      team,
      { ...DEFAULT_OPTIONS, signal: controller.signal },
      [],
      [team],
      { focus: 'spd', maxLoss: 20 }
    );
  }, /Busca cancelada pelo usuário/);
});
