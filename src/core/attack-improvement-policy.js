import { lockContext } from './locks.js';
import { runeConflictApplies } from './siege-central.js';
import { plannedReservations } from './loadouts.js';
import { SETS } from './data.js';

/**
 * Resolves the eligible and blocked rune pool for an individual attack team optimization.
 * 
 * Rules for 'improve-preset' strategy:
 * 1. Another Siege attack preset does NOT block runes: different attacks happen sequentially.
 * 2. Simultaneous defenses (t.mode === 'defense' or runeConflictApplies(t, account)) DO block runes.
 * 3. Explicitly blocked rune IDs, local rune locks, in-game locks (if respectLocks is active),
 *    and runes belonging to locked units ARE blocked.
 * 4. Runes equipped on outside units (not in the attack team) ARE eligible, provided their owner is not locked.
 * 5. Explicitly passed reservedIds ARE blocked.
 * 6. RTA-exclusive pool runes (rune.pool === 'rta') ARE blocked.
 * 7. Intangible (set 25) or unknown sets ARE blocked.
 * 8. Runes below options.minLevel ARE blocked.
 * 
 * @param {object} account
 * @param {object} team
 * @param {object[]} [allTeams=[team]]
 * @param {object} [options={}]
 * @param {number[]} [reservedIds=[]]
 * @returns {{ blockedRuneIds: Set<number>, eligibleRuneIds: Set<number>, reasons: Map<number, string> }}
 */
export function resolveAttackRunePolicy(account, team, allTeams = [team], options = {}, reservedIds = []) {
  if (!account || !Array.isArray(account.runes)) {
    return { blockedRuneIds: new Set(), eligibleRuneIds: new Set(), reasons: new Map() };
  }

  const blockedRuneIds = new Set();
  const eligibleRuneIds = new Set();
  const reasons = new Map();

  const block = (id, reason) => {
    if (!Number.isSafeInteger(id)) return;
    blockedRuneIds.add(id);
    if (!reasons.has(id)) {
      reasons.set(id, reason);
    }
  };

  // 1. Explicit reserved IDs
  if (Array.isArray(reservedIds)) {
    for (const id of reservedIds) {
      block(id, 'Runa reservada por outro plano ou sessão');
    }
  }

  // 2. Explicitly blocked IDs from options
  if (Array.isArray(options.blockedRuneIds)) {
    for (const id of options.blockedRuneIds) {
      block(id, 'Runa bloqueada explicitamente nas opções');
    }
  }

  // 3. Local locks (locks.runes and locks.units)
  const locks = lockContext(account, options);
  for (const id of locks.runes) {
    block(id, 'Runa com trava manual ou de proteção local');
  }

  // 4. Simultaneous defenses and GvG defense conflicts
  // Attacks from other teams (mode === 'attack') are allowed to share runes because attacks are sequential.
  // Defenses (mode === 'defense') or teams where runeConflictApplies returns true must have their planned runes reserved.
  const simultaneousTeams = allTeams.filter(t => 
    t && t.id !== team.id && (t.mode === 'defense' || runeConflictApplies(t, account, t.gameMode || 'siege'))
  );
  const defenseReserved = plannedReservations(simultaneousTeams, account, team.id);
  for (const id of defenseReserved) {
    block(id, 'Runa reservada para defesa simultânea');
  }

  for (const defTeam of simultaneousTeams) {
    if (defTeam.mode === 'defense') {
      for (const config of defTeam.configs || []) {
        if (config.enabled !== false && config.unitId) {
          const unit = account.units?.find(u => u.id === config.unitId);
          if (unit?.runeIds) {
            for (const rId of unit.runeIds) {
              block(rId, 'Runa em uso por defesa simultânea');
            }
          }
        }
      }
    }
  }

  // 5. Evaluate all runes in account
  const minLevel = Number(options.minLevel || 0);
  const respectLocks = Boolean(options.respectLocks);

  for (const rune of account.runes) {
    if (!rune || !rune.id) continue;

    // RTA pool exclusion
    if (rune.pool === 'rta') {
      block(rune.id, 'Runa do inventário exclusivo de RTA');
      continue;
    }

    // Unknown or Intangible set
    if (rune.set === 25 || !SETS[rune.set]) {
      block(rune.id, 'Conjunto Intangible ou desconhecido');
      continue;
    }

    // In-game lock
    if (respectLocks && rune.locked) {
      block(rune.id, 'Runa travada no jogo');
      continue;
    }

    // Owner is a locked unit
    if (rune.owner && locks.units.has(rune.owner)) {
      block(rune.id, 'Monstro proprietário com trava de proteção local');
      continue;
    }

    // Min level check
    if (rune.level < minLevel) {
      block(rune.id, 'Nível inferior ao filtro mínimo');
      continue;
    }

    // If already blocked by previous conditions
    if (blockedRuneIds.has(rune.id)) {
      continue;
    }

    // Rune is eligible!
    eligibleRuneIds.add(rune.id);
  }

  return { blockedRuneIds, eligibleRuneIds, reasons };
}
