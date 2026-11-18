import { optimizerTeamTelemetry } from './optimizer-team-telemetry.js';

/**
 * Derives or validates the turn order of an attack team.
 * 
 * Priority:
 * 1. Explicitly confirmed order from `team.confirmedTurnOrderKeys` (if all keys match active team configs).
 * 2. Simulation-derived turn order from current equipment / telemetry.
 * 3. Fallback to active config keys with a 'partial' warning when telemetry cannot fully simulate.
 * 
 * @param {object} account - Normalized SWEX account
 * @param {object} team - Attack team
 * @param {object} [options={}] - Options (respectLocks, etc.)
 * @returns {{ orderKeys: string[], status: 'complete'|'partial'|'unavailable', source: 'confirmed'|'derived'|'unavailable', warnings: string[] }}
 */
export function deriveAttackOrder(account, team, options = {}) {
  const configs = team?.configs?.filter(c => c.enabled !== false) || [];
  if (!configs.length) {
    return { orderKeys: [], status: 'unavailable', source: 'unavailable', warnings: ['Nenhum monstro configurado no time.'] };
  }

  const validKeys = new Set(configs.map(c => c.key));

  // 1. If user already confirmed turn order
  if (Array.isArray(team.confirmedTurnOrderKeys) && team.confirmedTurnOrderKeys.length === configs.length) {
    const allValid = team.confirmedTurnOrderKeys.every(k => validKeys.has(k)) && new Set(team.confirmedTurnOrderKeys).size === configs.length;
    if (allValid) {
      return { orderKeys: [...team.confirmedTurnOrderKeys], status: 'complete', source: 'confirmed', warnings: [] };
    }
  }

  // 2. Derive from telemetry / simulation
  if (account) {
    try {
      const telemetry = optimizerTeamTelemetry(account, team, options);
      if (telemetry && telemetry.preview && Array.isArray(telemetry.preview.turns)) {
        const alliedTurns = telemetry.preview.turns.filter(t => !t.enemy && validKeys.has(t.key));
        const seen = new Set();
        const orderKeys = [];
        for (const t of alliedTurns) {
          if (!seen.has(t.key)) {
            seen.add(t.key);
            orderKeys.push(t.key);
          }
        }
        if (orderKeys.length === configs.length) {
          return { orderKeys, status: 'complete', source: 'derived', warnings: [] };
        }
        if (orderKeys.length > 0) {
          return { orderKeys, status: 'partial', source: 'derived', warnings: ['Ordem detectada parcialmente. Confirme ou ajuste a ordem dos turnos.'] };
        }
      }
    } catch {
      // Fall through to fallback
    }
  }

  return {
    orderKeys: configs.map(c => c.key),
    status: 'partial',
    source: 'derived',
    warnings: ['Simulação indisponível com o equipamento atual. Revise e confirme a ordem manualmente.']
  };
}

/**
 * Validates candidate timing against functional sync gates.
 * In 'improve-preset' mode, a candidate acting at a later tick is acceptable
 * IF the confirmed allied order is preserved, explicit maxTick deadlines are met,
 * and no new enemy cut occurs.
 * 
 * @param {object} candidateTiming - Output of timing() for candidate builds
 * @param {object} referenceTiming - Output of timing() for baseline builds
 * @param {object} [options={}]
 * @param {string[]} [options.confirmedOrderKeys] - Confirmed target order of keys
 * @param {object[]} [options.configs=[]] - Team monster configs (with maxTick / targetTick)
 * @param {boolean} [options.enemyScenarioKnown=false] - Whether enemy speed/events were provided
 * @returns {{ valid: boolean, certainty: 'scenario'|'partial', reasons: string[] }}
 */
export function validateAttackFunctionalSync(candidateTiming, referenceTiming, options = {}) {
  const configs = options.configs || [];
  const reasons = [];
  const enemyScenarioKnown = Boolean(options.enemyScenarioKnown);
  const certainty = enemyScenarioKnown ? 'scenario' : 'partial';

  if (!candidateTiming || !Array.isArray(candidateTiming.order)) {
    return { valid: false, certainty, reasons: ['Dados de sincronização do candidato ausentes.'] };
  }

  // 1. All active members must have a resolved turn
  if (candidateTiming.order.length !== configs.length) {
    reasons.push('Nem todos os monstros do time possuem um turno determinado na simulação.');
    return { valid: false, certainty, reasons };
  }

  // 2. Turn order check
  const targetOrder = options.confirmedOrderKeys && options.confirmedOrderKeys.length === configs.length
    ? options.confirmedOrderKeys
    : referenceTiming?.order || [];

  if (targetOrder.length === configs.length) {
    const orderMatches = candidateTiming.order.every((k, i) => k === targetOrder[i]);
    if (!orderMatches) {
      reasons.push('A sequência de turnos diverge da ordem funcional confirmada.');
    }
  }

  // 3. Integer ticks, readiness, and explicit deadlines
  for (const c of configs) {
    const action = candidateTiming.action?.[c.key];
    const ready = candidateTiming.ready?.[c.key];

    if (!Number.isInteger(action) || !Number.isInteger(ready)) {
      reasons.push(`Turno ou prontidão inválidos para o slot ${c.key}.`);
      continue;
    }

    if (Number(c.maxTick) > 0 && action > Number(c.maxTick)) {
      reasons.push(`O monstro no slot ${c.key} excedeu o limite máximo de Tick ${c.maxTick} (ação no Tick ${action}).`);
    }

    if (Number(c.combat?.targetTick) > 0 && action > Number(c.combat.targetTick)) {
      reasons.push(`O monstro no slot ${c.key} excedeu a meta de Tick de combate ${c.combat.targetTick} (ação no Tick ${action}).`);
    }

    // 4. Enemy cutting gate (if enemy scenario is known)
    if (enemyScenarioKnown && referenceTiming) {
      const allowedEnemyBefore = referenceTiming.enemyBefore?.[c.key] ?? 0;
      const candidateEnemyBefore = candidateTiming.enemyBefore?.[c.key] ?? 0;
      if (candidateEnemyBefore > allowedEnemyBefore) {
        reasons.push(`O inimigo corta a sequência antes do monstro ${c.key} (${candidateEnemyBefore} ação(ões) inimiga(s) antes).`);
      }
    }
  }

  return {
    valid: reasons.length === 0,
    certainty,
    reasons
  };
}
