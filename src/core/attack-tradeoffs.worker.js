import {restoreSwexAttackReference} from './swex-attack-loadout.js';
import {diagnoseAttackTradeoffs,validateAttackTradeoff} from './attack-tradeoffs.js';
self.onmessage=({data})=>{
 try{
  const args=[data.account,data.team,data.options,data.reservedIds,data.allTeams,data.settings];
  if(data.type==='restore')self.postMessage({type:'validated',plan:restoreSwexAttackReference(data.account,data.team)});
  else if(data.type==='validate')self.postMessage({type:'validated',plan:validateAttackTradeoff(...args,data.signature,data.proposal)});
  else self.postMessage({type:'result',report:diagnoseAttackTradeoffs(...args,progress=>self.postMessage({type:'progress',...progress}))});
 }catch(error){self.postMessage({type:'error',message:error.message||'Não foi possível concluir a busca. O SWEX foi preservado.'});}
};
