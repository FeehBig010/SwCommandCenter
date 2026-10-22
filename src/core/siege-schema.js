import {normalizeLeader} from './leaders.js';
export const REACTIONS={free_win:{label:'Free Win',icon:'👍',hint:'Relato de execução segura'},rng:{label:'Risco de RNG',icon:'⚠️',hint:'Cuidado com procs de Vio/Stun'},high_runes:{label:'Exige Runamento Alto',icon:'💡',hint:'Necessita de status cravados'}};
export function normalizeSiegeSpec(raw={}){
 const speedTick=Number(raw.speedTick??7),index=Number(raw.defenseLeaderIndex??0);
 if(!Number.isFinite(speedTick)||speedTick<1||speedTick>100||!Number.isInteger(index)||index<0||index>2)throw new Error('Tick ou líder da defesa inválido.');
 return {speedTick,requireOrder:raw.requireOrder!==false,beforeEnemy:raw.beforeEnemy!==false,defenseLeader:normalizeLeader(raw.defenseLeader),defenseLeaderIndex:index,authorLabel:String(raw.authorLabel||'Membro local').trim().slice(0,80)||'Membro local'};
}
