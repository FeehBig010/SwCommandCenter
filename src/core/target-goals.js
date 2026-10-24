import {normalizeLeader} from './leaders.js';
import {normalizeCombat,normalizeScenario} from './speedTuner.js';
// A detached snapshot of the portable guild template. Keys refer to cloned slots,
// never to another account's monster instances or rune IDs.
export const TARGET_STATS=['hp','def','spd','atk','cr','cd','res','acc'];
const SUPPORTED_SETS=new Set([1,2,3,4,5,6,7,8,10,11,13,14,15,16,17,18,19,20,21,22,23,24]);
const FOUR_PIECE=new Set([3,5,8,10,11,13]);
export function snapshotTargetGoals(source,clone){
 return {version:1,sourceName:String(source.name||clone.name).slice(0,100),leaderIndex:source.leaderIndex||0,leader:structuredClone(source.leader||null),autoOpener:source.autoOpener!==false,enemyCombatSpd:Number(source.enemyCombatSpd)||0,combatScenario:structuredClone(source.combatScenario||{enemies:[],events:[]}),configs:clone.configs.map((c,i)=>{
  const original=source.configs[i];return {key:c.key,masterId:original.masterId,label:original.label,basis:original.basis,goals:structuredClone(original.goals),sets:[...original.sets],combatSpd:Number(original.combatSpd)||0,maxTick:Number(original.maxTick)||0,combat:structuredClone(original.combat||{}),artifacts:original.artifacts!==false};
 })};
}
export function targetGoalsOf(team){
 const target=team?.target_goals;
 if(!target||target.version!==1||!Array.isArray(target.configs)||target.configs.length!==3||new Set(target.configs.map(c=>c.key)).size!==3)throw new Error('Metas alvo ausentes ou incompatíveis. Copie novamente o modelo da guilda.');
 for(const c of target.configs){if(typeof c.key!=='string'||!Number.isSafeInteger(c.masterId)||c.masterId<=0||!c.goals||typeof c.goals!=='object'||Array.isArray(c.goals)||!Array.isArray(c.sets)||c.sets.length>3||c.sets.some(id=>!SUPPORTED_SETS.has(id))||c.sets.reduce((n,id)=>n+(FOUR_PIECE.has(id)?4:2),0)>6||!Number.isFinite(c.combatSpd)||c.combatSpd<0||c.combatSpd>10000||!Number.isInteger(c.maxTick)||c.maxTick<0||c.maxTick>10000||TARGET_STATS.some(k=>c.goals?.[k]!==''&&c.goals?.[k]!=null&&(!Number.isFinite(Number(c.goals[k]))||Number(c.goals[k])<0)))throw new Error('Metas alvo inválidas. Copie novamente o modelo da guilda.');}
 return target;
}
export function targetIssue(team,account){
 try{
  const target=targetGoalsOf(team);
  if(team.gameMode!=='siege'||team.configs.length!==3||target.configs.some(t=>!team.configs.some(c=>c.key===t.key&&c.masterId===t.masterId&&c.enabled!==false)))return 'A composição mudou. Restaure os três monstros do modelo antes de bater a meta.';
  const units=target.configs.map(t=>account?.units.find(u=>u.id===team.configs.find(c=>c.key===t.key)?.unitId&&u.master===t.masterId));
  if(units.some(u=>!u))return 'Selecione uma cópia da sua conta para cada monstro do modelo.';
  if(new Set(units.map(u=>u.id)).size!==3)return 'Use três cópias distintas da sua conta.';
  if(!target.configs.some(c=>Object.values(c.goals).some(v=>Number(v)>0)||c.sets.length||c.combatSpd>0||c.maxTick>0))return 'O modelo não informa metas numéricas ou conjuntos de runas.';
  return '';
 }catch(e){return e.message;}
}
export function targetSetReport(counts,sets=[]){
 const req={};for(const id of sets)req[id]=(req[id]||0)+(FOUR_PIECE.has(id)?4:2);
 return Object.entries(req).map(([id,pieces])=>({id:Number(id),pieces,actual:counts[id]||0,missing:Math.max(0,pieces-(counts[id]||0)),met:(counts[id]||0)>=pieces}));
}
// Normalize differences so HP cannot drown out SPD, ACC or other smaller stats.
// During the rune beam, only the expected additional contribution is scaled.
export function targetDistance(stats,config,counts={},progress=1){
 let distance=0;
 for(const key of TARGET_STATS){const target=Number(config.goals[key]);if(!(target>0))continue;
  const total=config.basis==='total'||['cr','cd','res','acc'].includes(key),actual=stats[total?'total':'bonus'][key],base=total?stats.total[key]-stats.bonus[key]:0,desired=base+(target-base)*progress;
  distance+=Math.abs(actual-desired)/Math.max(1,target);
 }
 if(Number(config.combatSpd)>0){const target=Number(config.combatSpd),actual=stats.combat?.spd??stats.total.spd;distance+=Math.abs(actual-target)/target*progress;}
 const sets=targetSetReport(counts,config.sets);if(sets.length)distance+=sets.reduce((sum,s)=>sum+Math.max(0,s.pieces*progress-s.actual)/s.pieces,0)/sets.length;
 return distance;
}

// Plan import creates fresh config keys; bind the snapshot to those new slots
// using a whitelist, instead of losing it or retaining foreign references.
export function rebindTargetGoals(raw,exportedConfigs,importedConfigs){
 const target=targetGoalsOf({target_goals:raw}),leaderIndex=Number(target.leaderIndex||0),enemyCombatSpd=Number(target.enemyCombatSpd||0);
 if(!Number.isInteger(leaderIndex)||leaderIndex<0||leaderIndex>2||!Number.isFinite(enemyCombatSpd)||enemyCombatSpd<0||enemyCombatSpd>1000)throw new Error('Contexto das metas alvo inválido.');
 const configs=target.configs.map(t=>{const index=exportedConfigs.findIndex(c=>c.key===t.key),own=importedConfigs[index];if(!own||own.masterId!==t.masterId)throw new Error('As metas alvo não correspondem aos monstros do plano.');return own;});
 const source={name:String(target.sourceName||'Time clonado').slice(0,100),leader:normalizeLeader(target.leader),leaderIndex,enemyCombatSpd,autoOpener:target.autoOpener!==false,combatScenario:normalizeScenario(target.combatScenario),configs:target.configs.map(c=>({masterId:c.masterId,label:String(c.label||'Monstro').slice(0,80),basis:c.basis==='total'?'total':'bonus',goals:Object.fromEntries(TARGET_STATS.map(k=>[k,c.goals[k]===''||c.goals[k]==null?'':Number(c.goals[k])])),sets:[...c.sets],combatSpd:c.combatSpd,maxTick:c.maxTick,combat:normalizeCombat(c.combat),artifacts:c.artifacts!==false}))};
 return snapshotTargetGoals(source,{name:source.name,configs});
}
