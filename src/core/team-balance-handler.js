import {searchTeamBalance,validateBalanceProposal} from './team-balance.js';
export function handleTeamBalanceRequest(data,send){try{
 const args=[data.account,data.team,data.options||{},data.reservedIds||[],data.allTeams||[]];
 if(data.type==='search')send({type:'result',report:searchTeamBalance(...args,progress=>send({type:'progress',...progress}))});
 else if(data.type==='validate')send({type:'validated',plan:validateBalanceProposal(...args,data.signature,data.proposal)});
 else throw new Error('Ação de busca inválida.');
}catch(error){send({type:'error',message:error.message||'Não foi possível concluir a busca. O JSON foi preservado.'});}}
