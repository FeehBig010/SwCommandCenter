import {restoreSwexAttackReference} from './swex-attack-loadout.js';
import {diagnoseAttackTradeoffs,validateAttackTradeoff} from './attack-tradeoffs.js';
export function handleAttackTradeoffRequest(data,send){
 try{
  const args=[data.account,data.team,data.options,data.reservedIds,data.allTeams,data.settings];
  if(data.type==='restore')send({type:'validated',plan:restoreSwexAttackReference(data.account,data.team)});
  else if(data.type==='validate')send({type:'validated',plan:validateAttackTradeoff(...args,data.signature,data.proposal)});
  else if(data.type==='search')send({type:'result',report:diagnoseAttackTradeoffs(...args,progress=>send({type:'progress',...progress}))});
  else throw new Error('Ação de trade-off inválida. Faça uma nova busca.');
 }catch(error){send({type:'error',message:error.message||'Não foi possível concluir a busca. O SWEX foi preservado.'});}
}
