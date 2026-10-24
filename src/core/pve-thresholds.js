import waves from './cairos-waves.json' with {type:'json'};
export const LEGACY_ACCURACY={gb12:65,db12:85,nb12:45};
export function bossAccuracyTarget(stage){return LEGACY_ACCURACY[stage]??waves[stage]?.accuracy??null;}
export const R5_EHP_REFERENCE=150000;
