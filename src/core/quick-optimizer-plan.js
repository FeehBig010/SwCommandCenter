import {makeTeam,STATS} from './data.js';
import {equivalentMonsters} from './CollabMapping.js';
// Transfer goals, never fictitious manual sheets or equipment, into the real optimizer.
export function quickOptimizerPlan(quick,account){
 if(!account)throw new Error('Importe seu SWEX para buscar runas no inventário da conta.');
 if(!['siege','arena'].includes(quick.gameMode))throw new Error('Abra Siege ou Arena para construir este time no Otimizador Avançado.');
 const used=new Set(),configs=quick.configs.map(c=>{
  const unit=account.units.filter(u=>!used.has(u.id)&&equivalentMonsters(u.master,c.masterId)).sort((a,b)=>Number(b.id===c.unitId)-Number(a.id===c.unitId)||b.level-a.level)[0];
  if(!unit)throw new Error(`${c.label}: nenhuma cópia disponível na conta. Confira o SWEX.`);used.add(unit.id);
  const {manual,...config}=c;
  return {...config,unitId:unit.id,masterId:unit.master,label:unit.name,enabled:true,goals:Object.fromEntries(STATS.map(k=>[k,c.goals[k]!==''&&c.goals[k]!=null?c.goals[k]:Math.max(0,Number(manual.sheet[k])-(c.basis==='bonus'&&!['cr','cd','res','acc'].includes(k)?unit.base[k]:0))]))};
 });
 return {...makeTeam(quick.gameMode),name:quick.name,autoName:quick.autoName,origin:'calculator',sourceDeckId:null,sourceAccountId:account.id,leaderIndex:quick.leaderIndex||0,optimizerSpeedSync:true,combatScenario:structuredClone(quick.combatScenario||{enemies:[],events:[]}),configs};
}
