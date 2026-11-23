import {simulateCombat} from './speedTuner.js';

export const EFFECTS = {
  boost: 'Aumentar ATB', reduce: 'Reduzir ATB', reset_bar: 'Zerar ATB',
  speed_buff: 'Buff de velocidade', slow: 'Debuff de velocidade',
  stun: 'Atordoar', immunity: 'Imunidade', cleanse: 'Limpar slow e atordoamento',
};
export const TARGETS = {
  self: 'O próprio monstro', ally: 'Equipe do monstro', enemy: 'Equipe adversária',
  lowestAlly: 'Menor ATB da equipe', lowestEnemy: 'Menor ATB adversária', specific: 'Monstro específico',
};
export const DURATIONS = ['speed_buff', 'slow', 'stun', 'immunity'];
export const AMOUNTS = ['boost', 'reduce'];
export const CONDITIONS = {always:'Sem condição', below:'ATB do alvo abaixo de', above:'ATB do alvo a partir de'};
export const TRIGGERS = {initial:'Turno 0', repeat:'A cada turno do monstro', once:'No turno indicado do monstro'};
export const SLOT_KEYS = ['a1','a2','a3','e1','e2','e3'];
export const defaultEffect = () => ({type:'boost', target:'ally', specific:'a1', amount:30, duration:2, condition:'always', threshold:100});
export const defaultSkill = () => ({name:'Nova habilidade', trigger:'once', turn:1, effects:[defaultEffect()]});

const bounded = (value, min, max, fallback) =>
  Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
const integer = (...args) => Math.round(bounded(...args));
const choice = (value, options, fallback) => Object.hasOwn(options, value) ? value : fallback;
const title = (value, fallback) => typeof value === 'string' ? value.trim().slice(0, 80) || fallback : fallback;

export function normalizeBattle(input) {
  if (input?.version !== 1 || !Array.isArray(input.units)) throw new Error('Formato de batalha inválido. Use um JSON de versão 1.');
  if (input.units.length > 6 || new Set(input.units.map(unit => unit?.key)).size !== input.units.length ||
      input.units.some(unit => !SLOT_KEYS.includes(unit?.key))) throw new Error('Use até três posições únicas por equipe.');
  const units = SLOT_KEYS.map(key => {
    const unit = input.units.find(item => item.key === key);
    const skills = Array.isArray(unit?.skills) ? unit.skills.slice(0, 12) : [];
    return {
      key, master: integer(unit?.master, 0, 99999999, 0), spd: integer(unit?.spd, 1, 1000, 200),
      atb: bounded(unit?.atb, 0, 100, 0),
      skills: skills.filter(Boolean).map(skill => ({
        name: title(skill.name, 'Habilidade'), trigger: choice(skill.trigger, TRIGGERS, 'once'),
        turn: integer(skill.turn, 1, 30, 1),
        effects: (Array.isArray(skill.effects) ? skill.effects : []).slice(0, 8).filter(Boolean).map(effect => ({
          type: choice(effect.type, EFFECTS, 'boost'), target: choice(effect.target, TARGETS, 'ally'),
          specific: SLOT_KEYS.includes(effect.specific) ? effect.specific : 'a1',
          amount: bounded(effect.amount, 0, 300, 30), duration: integer(effect.duration, 1, 10, 2),
          condition: choice(effect.condition, CONDITIONS, 'always'),
          threshold: bounded(effect.threshold, 0, 500, 100),
        })),
      })),
    };
  });
  return {version:1, name:title(input.name,'Batalha sem nome'), turns:integer(input.turns,1,30,12), units};
}

function resolveEffects({source, initial}, skills) {
  const matches = skills.filter(skill => initial ? skill.trigger === 'initial' :
    skill.trigger === 'repeat' || (skill.trigger === 'once' && skill.turn === source.turns));
  return matches.flatMap(skill => skill.effects.map(effect => ({
    type:effect.type, label:skill.name, amount:AMOUNTS.includes(effect.type) ? effect.amount : 0,
    duration:DURATIONS.includes(effect.type) ? effect.duration : undefined,
    selectTargets(current) {
      const sameSide = unit => unit.enemy === source.enemy;
      let candidates;
      switch (effect.target) {
        case 'self': candidates = current.filter(unit => unit.key === source.key); break;
        case 'specific': candidates = current.filter(unit => unit.key === effect.specific); break;
        case 'ally': case 'lowestAlly': candidates = current.filter(sameSide); break;
        default: candidates = current.filter(unit => !sameSide(unit));
      }
      if (effect.condition === 'below') candidates = candidates.filter(unit => unit.atb < effect.threshold);
      if (effect.condition === 'above') candidates = candidates.filter(unit => unit.atb >= effect.threshold);
      if (effect.target.startsWith('lowest')) candidates = candidates.sort((a,b) => a.atb-b.atb).slice(0,1);
      return candidates.map(unit => unit.key);
    },
  })));
}

export function runBattle(input, monsterName) {
  const battle = normalizeBattle(input);
  const units = battle.units.filter(unit => unit.master);
  if (!units.length) return null;
  const actors = units.map(unit => ({
    key:unit.key, name:monsterName(unit.master), master:unit.master, enemy:unit.key.startsWith('e'),
    rawSpd:unit.spd, spd:unit.spd, initialAtb:unit.atb,
  }));
  return simulateCombat(actors, {
    maxTurns:battle.turns, captureTickSnapshots:true, captureTickLimit:300,
    resolveActions:context => resolveEffects(context, units.find(unit => unit.key === context.source.key).skills),
  });
}

export function battleLink(input, current) {
  const url = new URL(current);
  url.hash = '/battle-simulator?b=' + encodeURIComponent(JSON.stringify(normalizeBattle(input)));
  return url.href;
}

export function battleFromHash(hash) {
  const encoded = new URLSearchParams(hash.split('?')[1]).get('b');
  if (!encoded) return null;
  if (encoded.length > 300000) throw new Error('Link de batalha excede o limite.');
  return normalizeBattle(JSON.parse(encoded));
}
