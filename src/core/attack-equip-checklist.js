/**
 * attack-equip-checklist.js
 *
 * Gera checklist executável passo a passo de trocas de runas para presets de ataque.
 * Garante segurança na aplicação:
 * 1. Desequipar primeiro (remove) para liberar slots e evitar conflitos.
 * 2. Equipar depois (equip) na ordem segura.
 * 3. Identifica claramente runas provenientes de monstros externos (externalSources).
 * 4. Desempata propostas equivalentes pela menor quantidade de swaps (compareAttackProposals).
 */

const EPS = 1e-4;

/**
 * Cria o checklist de aplicação de runas comparando a baseline com o proposto.
 * @param {Object} account - Dados da conta SWEX
 * @param {Object} team - Time de ataque
 * @param {Array} baselineBuilds - Builds atuais [{ key, unitId, name, runeIds: [...] }]
 * @param {Array} proposedBuilds - Builds propostas [{ key, unitId, name, runeIds: [...] }]
 * @returns {Object} Checklist com { swapCount, changes, remove, equip, actions, externalSources }
 */
export function makeAttackEquipChecklist(account, team, baselineBuilds = [], proposedBuilds = []) {
  const changes = [];
  const remove = [];
  const equip = [];
  const externalSources = [];

  const teamUnitIds = new Set(
    (team?.configs?.map(c => c.unitId) || baselineBuilds.map(b => b.unitId)).filter(Boolean)
  );

  const baselineMap = new Map();
  baselineBuilds.forEach((build, index) => {
    const key = build.key || (build.unitId ? `unit_${build.unitId}` : `idx_${index}`);
    baselineMap.set(key, build);
  });

  const runesById = new Map((account?.runes || []).map(r => [r.id, r]));
  const unitsById = new Map((account?.units || []).map(u => [u.id, u]));

  // Conjunto de todas as runas pertencentes à baseline do time
  const baselineTeamRuneIds = new Set(
    baselineBuilds.flatMap(b => b.runeIds || [])
  );

  proposedBuilds.forEach((proposed, index) => {
    const key = proposed.key || (proposed.unitId ? `unit_${proposed.unitId}` : `idx_${index}`);
    const baseline = baselineMap.get(key) || baselineBuilds[index];
    if (!baseline) return;

    const unitId = proposed.unitId || baseline.unitId;
    const unitName = proposed.name || baseline.name || (unitId ? unitsById.get(unitId)?.name : `Unidade #${unitId}`);
    const baseRunes = baseline.runeIds || [];
    const propRunes = proposed.runeIds || [];

    for (let slotIdx = 0; slotIdx < 6; slotIdx++) {
      const slot = slotIdx + 1;
      const oldRuneId = baseRunes[slotIdx];
      const newRuneId = propRunes[slotIdx];

      if (oldRuneId !== newRuneId) {
        changes.push({
          unitId,
          unitName,
          slot,
          oldRuneId,
          newRuneId
        });

        if (oldRuneId) {
          remove.push({
            runeId: oldRuneId,
            unitId,
            unitName,
            slot
          });
        }

        if (newRuneId) {
          equip.push({
            runeId: newRuneId,
            unitId,
            unitName,
            slot
          });

          // Verificar se a runa nova veio de monstro externo
          if (!baselineTeamRuneIds.has(newRuneId)) {
            const rune = runesById.get(newRuneId);
            if (rune && rune.owner && !teamUnitIds.has(rune.owner)) {
              const ownerUnit = unitsById.get(rune.owner);
              externalSources.push({
                runeId: newRuneId,
                slot,
                fromUnitId: rune.owner,
                fromUnitName: ownerUnit?.name || `Unidade #${rune.owner}`,
                toUnitId: unitId,
                toUnitName: unitName
              });
            }
          }
        }
      }
    }
  });

  // Ações unificadas em ordem de execução segura: primeiro remoções, depois equipagens
  const actions = [
    ...remove.map(r => ({ type: 'remove', ...r })),
    ...equip.map(e => ({ type: 'equip', ...e }))
  ];

  return {
    swapCount: changes.length,
    changes,
    remove,
    equip,
    actions,
    externalSources
  };
}

/**
 * Ordena propostas de melhoria de ataque considerando:
 * 1. Pareto (sem sacrifício de status) prioritário.
 * 2. Maior Score / Focus Gain.
 * 3. Menor swapCount (menos trocas de runas necessárias) para ganhos equivalentes.
 *
 * @param {Object} a - Proposta A
 * @param {Object} b - Proposta B
 * @returns {number} Negativo se A for melhor, positivo se B for melhor, 0 se iguais.
 */
export function compareAttackProposals(a, b) {
  // 1. Pareto prioritário
  if (Boolean(a.pareto) !== Boolean(b.pareto)) {
    return a.pareto ? -1 : 1;
  }

  // 2. Score com tolerância EPS
  const scoreA = Number(a.score ?? 0);
  const scoreB = Number(b.score ?? 0);
  const scoreDiff = scoreB - scoreA;
  if (Math.abs(scoreDiff) > EPS) {
    return scoreDiff;
  }

  // 3. Focus Gain com tolerância EPS
  const gainA = Number(a.focusGain ?? 0);
  const gainB = Number(b.focusGain ?? 0);
  const gainDiff = gainB - gainA;
  if (Math.abs(gainDiff) > EPS) {
    return gainDiff;
  }

  // 4. Desempate por menor quantidade de trocas de runas
  const swapsA = Number(a.swapCount ?? 0);
  const swapsB = Number(b.swapCount ?? 0);
  if (swapsA !== swapsB) {
    return swapsA - swapsB;
  }

  return 0;
}
