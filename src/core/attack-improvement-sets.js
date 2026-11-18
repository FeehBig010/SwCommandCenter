import { FOUR, SETS } from './data.js';

/**
 * Calculates required rune sets for an attack config under the given strategy.
 * 
 * - In 'improve-preset' strategy:
 *   If config.attackSetPolicy !== 'required', sets are FREE by default (returns only user-selected config.sets,
 *   without inheriting baseline.counts).
 *   If config.attackSetPolicy === 'required', sets in baseline are also required (legacy behavior).
 * 
 * - In 'legacy' strategy:
 *   Always inherits baseline.counts into required sets.
 * 
 * @param {object} config - Monster slot config (sets, attackSetPolicy, etc.)
 * @param {object} baselineBuild - Equipped baseline build with counts
 * @param {string} [strategy='improve-preset'] - 'improve-preset' | 'legacy'
 * @returns {number[]} Array of required set IDs (repeated according to piece count: e.g. [13, 13] for Swift)
 */
export function requiredAttackSets(config, baselineBuild, strategy = 'improve-preset') {
  const isFree = strategy === 'improve-preset' && config?.attackSetPolicy !== 'required';
  const required = {};

  // User-chosen explicit sets in config.sets (e.g. [13, 15])
  for (const id of config?.sets?.filter(Boolean) || []) {
    required[id] = (required[id] || 0) + 1;
  }

  // If not free, inherit existing sets from baseline
  if (!isFree && baselineBuild?.counts) {
    for (const [id, n] of Object.entries(baselineBuild.counts)) {
      const piecesPerSet = FOUR.has(Number(id)) ? 4 : 2;
      const completeSets = Math.floor(n / piecesPerSet);
      required[id] = Math.max(required[id] || 0, completeSets);
    }
  }

  return Object.entries(required).flatMap(([id, n]) => Array(n).fill(Number(id)));
}

/**
 * Validates that required sets do not exceed 6 rune slots.
 * 
 * @param {number[]} sets - Array of set IDs
 * @throws {Error} If total rune pieces needed exceed 6
 */
export function validateAttackSetsCapacity(sets) {
  if (!Array.isArray(sets)) return true;
  const pieces = sets.reduce((sum, id) => sum + (FOUR.has(Number(id)) ? 4 : 2), 0);
  if (pieces > 6) {
    throw new Error('Os conjuntos equipados e exigidos não cabem nos 6 espaços de runas (ultrapassam 6 espaços). Ajuste os conjuntos antes da busca.');
  }
  return true;
}
