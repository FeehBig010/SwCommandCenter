import { makeTeam, blankConfig } from '../../src/core/data.js';

/**
 * Cria fixture realista de um trio de Siege: Bolverk, Woosa e Mo Long.
 * Configuração:
 * - Woosa: Rápido (Swift/Will), base SPD 118, responsável pela imunidade.
 * - Bolverk: Bruiser EHP (Violent/Will), rouba buffs.
 * - Mo Long: Tank/Bruiser (Violent/Will), alto HP.
 */
export function makeBolverkWoosaMoLongFixture() {
  const account = {
    version: 1,
    id: 'siege-bruiser-test',
    importedAt: '2026-11-18T12:00:00Z',
    name: 'Conta Siege Aceite',
    units: [],
    runes: [],
    artifacts: [],
    accountPresets: []
  };

  const trio = [
    { id: 1, name: 'Woosa', master: 14013, baseSpd: 118, hp: 11535, atk: 681, def: 648, targetSpd: 310 },
    { id: 2, name: 'Bolverk', master: 22113, baseSpd: 100, hp: 12510, atk: 670, def: 703, targetSpd: 260 },
    { id: 3, name: 'Mo Long', master: 19813, baseSpd: 100, hp: 12180, atk: 725, def: 659, targetSpd: 250 }
  ];

  trio.forEach((u, i) => {
    const unit = {
      id: u.id,
      master: u.master,
      name: u.name,
      level: 40,
      element: 2, // Water
      base: { hp: u.hp, atk: u.atk, def: u.def, spd: u.baseSpd, cr: 15, cd: 50, res: 15, acc: 0 },
      runeIds: [],
      artifactIds: []
    };
    account.units.push(unit);

    let extraSpd = u.targetSpd - (u.baseSpd + 42); // 42 do slot 2
    let remainingSlots = 5;

    for (let slot = 1; slot <= 6; slot++) {
      const runeId = i * 6 + slot;
      const spd = slot === 2 ? 0 : Math.max(5, Math.ceil(extraSpd / remainingSlots));
      if (slot !== 2) {
        extraSpd -= spd;
        remainingSlots--;
      }

      const main = {
        1: [3, 160],   // ATK flat
        2: [8, 42],    // SPD
        3: [5, 160],   // DEF flat
        4: [2, 63],    // HP%
        5: [1, 2448],  // HP flat
        6: [2, 63]     // HP%
      }[slot];

      // Woosa usa Swift(3) + Will(15), Bolverk e Mo Long usam Violent(13) + Will(15)
      const set = u.name === 'Woosa' ? (slot <= 4 ? 3 : 15) : (slot <= 4 ? 13 : 15);

      account.runes.push({
        id: runeId,
        slot,
        owner: unit.id,
        set,
        stars: 6,
        level: 15,
        main,
        innate: [],
        subs: [
          [8, spd, 0, 0], // SPD
          [2, 12, 0, 0], // HP%
          [6, 10, 0, 0], // DEF%
          [7, 10, 0, 0]  // RES
        ]
      });

      unit.runeIds.push(runeId);
    }
  });

  const team = {
    ...makeTeam('siege'),
    id: 'siege-trio-acceptance',
    name: 'Bolverk Woosa Mo Long',
    mode: 'attack',
    gameMode: 'siege',
    autoOpener: false,
    towerSpd: 15,
    guildSpd: 0,
    leaderSpd: 0,
    enemyCombatSpd: 280, // Inimigo perigoso a 280 de combate
    configs: account.units.map(u => ({
      ...blankConfig(u),
      sets: [],
      strictSets: false,
      goals: { hp: 40000, atk: 1000, def: 1500, spd: 250, cr: 15, cd: 50, res: 100, acc: 0 }
    }))
  };

  return { account, team };
}

/**
 * Cria fixture realista de um quarteto de Arena: Adriana, Sonia, Galleon e Jamire.
 * Configuração de 4 integrantes para validar alocação conjunta de 24 slots.
 */
export function makeArenaCleaveFixture() {
  const account = {
    version: 1,
    id: 'arena-cleave-test',
    importedAt: '2026-11-18T12:00:00Z',
    name: 'Conta Arena Aceite',
    units: [],
    runes: [],
    artifacts: [],
    accountPresets: []
  };

  const quartet = [
    { id: 10, name: 'Adriana', master: 25114, baseSpd: 114, hp: 10875, atk: 703, def: 692, targetSpd: 325, set: 3 },  // Swift
    { id: 20, name: 'Galleon', master: 18911, baseSpd: 108, hp: 10710, atk: 714, def: 648, targetSpd: 280, set: 13 }, // Violent
    { id: 30, name: 'Sonia', master: 24713, baseSpd: 102, hp: 9885, atk: 878, def: 538, targetSpd: 270, set: 3 },     // Swift
    { id: 40, name: 'Jamire', master: 13414, baseSpd: 113, hp: 11370, atk: 692, def: 714, targetSpd: 250, set: 13 }   // Violent
  ];

  quartet.forEach((u, i) => {
    const unit = {
      id: u.id,
      master: u.master,
      name: u.name,
      level: 40,
      element: 1, // Fire/Wind/Water
      base: { hp: u.hp, atk: u.atk, def: u.def, spd: u.baseSpd, cr: 15, cd: 50, res: 15, acc: 0 },
      runeIds: [],
      artifactIds: []
    };
    account.units.push(unit);

    let extraSpd = u.targetSpd - (u.baseSpd + 42);
    let remainingSlots = 5;

    for (let slot = 1; slot <= 6; slot++) {
      const runeId = 1000 + i * 6 + slot;
      const spd = slot === 2 ? 0 : Math.max(4, Math.ceil(extraSpd / remainingSlots));
      if (slot !== 2) {
        extraSpd -= spd;
        remainingSlots--;
      }

      const main = {
        1: [3, 160],
        2: [8, 42],
        3: [5, 160],
        4: [2, 63],
        5: [1, 2448],
        6: [4, 63]
      }[slot];

      const set = slot <= 4 ? u.set : 15; // 4 peças de principal + 2 Will

      account.runes.push({
        id: runeId,
        slot,
        owner: unit.id,
        set,
        stars: 6,
        level: 15,
        main,
        innate: [],
        subs: [
          [8, spd, 0, 0],
          [2, 10, 0, 0],
          [4, 10, 0, 0],
          [10, 7, 0, 0]
        ]
      });

      unit.runeIds.push(runeId);
    }
  });

  const team = {
    ...makeTeam('arena'),
    id: 'arena-quartet-acceptance',
    name: 'Adriana Sonia Galleon Jamire',
    mode: 'attack',
    gameMode: 'arena',
    autoOpener: false,
    towerSpd: 15,
    guildSpd: 0,
    leaderSpd: 24, // Speed lead de Jamire
    enemyCombatSpd: 295,
    configs: account.units.map(u => ({
      ...blankConfig(u),
      sets: [],
      strictSets: false,
      goals: { hp: 30000, atk: 2000, def: 1000, spd: 260, cr: 85, cd: 150, res: 15, acc: 50 }
    }))
  };

  return { account, team };
}
