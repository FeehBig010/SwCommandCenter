export const LEADER_STATS={spd:'SPD',hp:'HP',atk:'ATK',def:'DEF',res:'RES',acc:'ACC',cr:'CR'};
export const LEADER_SCOPES={general:'Geral',guild:'Guilda',element:'Elementar',arena:'Arena',dungeon:'Masmorra'};
export function normalizeLeader(raw){
 if(raw==null)return null;
 const value=Number(raw.value),element=Number(raw.element||0);
 if(!LEADER_STATS[raw.stat]||!LEADER_SCOPES[raw.scope]||!Number.isFinite(value)||value<=0||value>100||!Number.isInteger(element)||element<0||element>5||(raw.scope==='element'&&!element))throw new Error('Habilidade de líder inválida.');
 return {stat:raw.stat,value,scope:raw.scope,element:raw.scope==='element'?element:0};
}
export function leaderApplies(leader,unit,context='siege'){
 if(!leader)return false;
 return leader.scope==='general'||leader.scope==='element'&&Number(unit.element??unit.master%10)===leader.element||leader.scope==='guild'&&context==='siege'||leader.scope==='arena'&&context==='arena'||leader.scope==='dungeon'&&['cairos','dimensional','rift','toa'].includes(context);
}
export function speedLeaderBonus(unit,team){
 if(!team.leader)return Number(team.leaderSpd||0);
 const leader=normalizeLeader(team.leader);
 return leader.stat==='spd'&&leaderApplies(leader,unit,team.gameMode||'siege')?leader.value:0;
}
