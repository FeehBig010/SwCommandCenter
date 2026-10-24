import {normalizeLeader} from './leaders.js';
export const REACTIONS={free_win:{label:'Free Win',icon:'👍',hint:'Relato de execução segura'},rng:{label:'Risco de RNG',icon:'⚠️',hint:'Cuidado com procs de Vio/Stun'},high_runes:{label:'Exige Runamento Alto',icon:'💡',hint:'Necessita de status cravados'}};
// Enemy slot indices, not master IDs: duplicate monsters remain distinct targets.
export function normalizeKillOrder(raw){
 if(raw==null)return [];
 if(!Array.isArray(raw)||raw.length>3||Array.from(raw).some(slot=>!Number.isInteger(slot)||slot<0||slot>2)||new Set(raw).size!==raw.length)throw new Error('Ordem de matar inválida. Use cada alvo uma única vez.');
 return [...raw];
}
export function toggleKillTarget(order,slot){
 if(!Number.isInteger(slot)||slot<0||slot>2)throw new Error('Alvo inválido.');
 const current=normalizeKillOrder(order);return current.includes(slot)?current.filter(target=>target!==slot):[...current,slot];
}
export function normalizeSiegeSpec(raw={}){
 const speedTick=7,index=Number(raw.defenseLeaderIndex??0);
 if(!Number.isInteger(index)||index<0||index>2)throw new Error('Líder da defesa inválido.');
 return {speedTick,killOrder:normalizeKillOrder(raw.killOrder),requireOrder:raw.requireOrder!==false,beforeEnemy:raw.beforeEnemy!==false,defenseLeader:normalizeLeader(raw.defenseLeader),defenseLeaderIndex:index,authorLabel:String(raw.authorLabel||'Membro local').trim().slice(0,80)||'Membro local'};
}
