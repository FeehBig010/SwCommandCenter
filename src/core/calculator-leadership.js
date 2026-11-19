import {normalizeLeader,leaderApplies,LEADER_SCOPES,LEADER_STATS} from './leaders.js';
const elements={1:'Água',2:'Fogo',3:'Vento',4:'Luz',5:'Escuridão'};
// Presentation only. The existing combat engine remains responsible for bonuses.
export function calculatorLeadership(team={}){
 const selected=(team.configs||[]).filter(c=>c.masterId&&c.enabled!==false),total=selected.length;
 const base={total,affected:0,key:team.leaderKey||null};
 if(!team.leader){const manual=Number(team.leaderSpd)||0;return manual>0?{...base,state:'manual',name:'Liderança manual',effect:`+${manual}% SPD`,scope:'Manual',affected:total,description:'Bônus informado manualmente, sem monstro líder associado.'}:{...base,state:'none',name:'Sem líder',effect:'Escolha a liderança em um card',scope:'',description:'A liderança e o abridor podem ser monstros diferentes.'};}
 let leader;try{leader=normalizeLeader(team.leader);}catch{return {...base,state:'invalid',name:'Liderança inválida',effect:'Revisar liderança',scope:'',description:'Os dados salvos de liderança precisam ser revisados.'};}
 const source=(team.configs||[]).find(c=>c.key===team.leaderKey&&c.masterId),affected=selected.filter(c=>leaderApplies(leader,{master:c.masterId,element:c.masterId%10},team.gameMode||'siege')).length;
 const state=!total?'pending':!affected?'inactive':affected<total?'partial':'active';
 return {...base,key:source?.key||null,state,name:source?.label||'Liderança informada',effect:`+${leader.value}% ${LEADER_STATS[leader.stat]}`,scope:leader.scope==='element'?elements[leader.element]:LEADER_SCOPES[leader.scope],affected,
 description:state==='pending'?'Selecione os monstros para conferir a aplicação.':state==='inactive'?'Não se aplica aos monstros neste modo.':state==='partial'?`Aplica-se a ${affected} de ${total} monstros selecionados.`:'Aplica-se a todos os monstros selecionados.'};
}

export function calculatorReference(team={},preview=null,timing=null){
 const configured=(Array.isArray(team.combatScenario?.enemies)?team.combatScenario.enemies:[]).filter(e=>Number.isFinite(Number(e.spd))&&Number(e.spd)>0);
 const format=speed=>`${Number(Number(speed).toFixed(2))} SPD`;
 if(configured.length>1)return {value:`${configured.length} adversários`,detail:'Velocidades informadas no cenário'};
 if(configured.length===1)return {value:format(configured[0].spd),detail:'SPD informada no cenário'};
 const speed=Number(timing?.referenceSpeed||preview?.referenceEnemy||team.enemyCombatSpd),automatic=timing?timing.automaticReference:!!preview?.referenceEnemy;
 if(!Number.isFinite(speed)||speed<=0)return {value:'Não informada',detail:'Configure na aba Inimigo'};
 return {value:format(speed),detail:automatic?(team.referencePolicy==='near-tie'?'Automática · quase empate com o abridor':'Automática · abridor −1 SPD'):'Referência configurada'};
}
