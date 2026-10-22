import {diagnoseTeam} from './diagnostics.js';
import {plannedReservations} from './loadouts.js';
self.onmessage=({data})=>{
 for(const team of data.teams){try{const blocked=[...new Set([...data.reservedIds,...plannedReservations(data.allTeams||data.teams,data.account,team.id)])];self.postMessage({type:'report',teamId:team.id,report:diagnoseTeam(data.account,team,data.options,blocked)});}catch(error){self.postMessage({type:'report',teamId:team.id,report:{status:'error',message:error.message}});}}
 self.postMessage({type:'done'});
};
