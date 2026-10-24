import {copyTeamToOptimizer,cloudTeam} from './hub.js';
import {teamsForArea} from './deckManager.js';
import {cleanSiegeCounter} from './siege.js';
import {currentRuneIds} from './loadouts.js';

export const personalSiegeTeams=teams=>teamsForArea(teams,'siege');

// Guild records are portable goals. Account equipment is resolved only after a copy.
export function siegeGuildRecords(templates=[],matchups=[],rows=[],guildId=null){
 const local=templates.map(t=>({key:`template:${t.id}`,id:t.id,kind:'template',name:t.name,description:t.description||'',team:{...t.team,name:t.name,gameMode:'siege',mode:t.team.mode||'defense'},local:t}));
 const counters=matchups.filter(c=>c.offense?.configs?.length===3&&c.enemyDefense?.length===3).flatMap(c=>{try{const counter=cleanSiegeCounter(c);return [{key:`local:${c.id}`,id:c.id,kind:'counter',name:c.name,description:c.notes||'',team:counter.offense,counter,cloud:false,local:c}];}catch{return [];}});
 const shared=rows.filter(r=>guildId&&r.guild_id===guildId&&r.visibility==='guild').flatMap(row=>{
  let counter;try{if(row.kind==='counter')counter=cleanSiegeCounter(row.payload);}catch{return [];}
  const team=counter?.offense||cloudTeam(row);if(!team||!personalSiegeTeams([team]).length)return [];
  return [{key:`cloud:${row.id}`,id:row.id,kind:row.kind,name:row.name,description:row.payload?.notes||team.description||'',team,cloud:true,row,...(row.kind==='counter'?{counter}:{})}];
 });
 return [...shared,...local,...counters];
}

export function canEditSiegeRecord(record,cloud,session){
 return !!record&&(record.counter?(!record.cloud||record.row.owner_id===session?.user?.id):!!cloud?.isLeader&&(!record.cloud||record.row.owner_id===session?.user?.id));
}

// Keep the leader and its position in the key: the same trio with a different
// leader is a different defense. Never infer an enemy from a free-text label.
export function siegeComparisonRows(records=[]){
 const groups=new Map(),unassigned=[];
 for(const record of records){
  const counter=record.counter,isDefense=!counter&&record.team.mode==='defense';
  const members=counter?.enemyDefense||(isDefense?record.team.configs:null);
  if(!members){unassigned.push({key:record.key,name:record.name,members:[],leader:null,attacks:[record],record});continue;}
  const index=counter?.siege.defenseLeaderIndex??record.team.leaderIndex??0;
  const leader=counter?counter.siege.defenseLeader:record.team.leader;
  const leaderKey=leader?[leader.stat,leader.value,leader.scope,leader.element||null,Number(members[index]?.masterId)]:null;
  const key=JSON.stringify([members.map(m=>Number(m.masterId)).sort((a,b)=>a-b),leaderKey]);
  let group=groups.get(key);
  if(!group){group={key,name:isDefense?record.name:'Defesa inimiga',members,leader,attacks:[],record};groups.set(key,group);}
  if(isDefense){group.name=record.name;group.members=members;group.record=record;}
  else group.attacks.push(record);
 }
 return [...groups.values(),...unassigned];
}

export function counterDefenseSeed(group){
 return {enemyDefense:structuredClone(group.members.map(m=>({masterId:m.masterId,label:m.label,sets:m.sets||[],...(m.combat?{combat:m.combat}:{}),...(Number(m.bonusSpd??(m.basis==='bonus'?m.goals?.spd:0))>0?{bonusSpd:Number(m.bonusSpd??m.goals.spd)}:{}),...(Number(m.maxTick)>0?{maxTick:Number(m.maxTick)}:{})}))),defenseLeader:structuredClone(group.leader||null),defenseLeaderIndex:group.record.counter?.siege.defenseLeaderIndex??group.record.team.leaderIndex??0};
}

export function copySiegeToPersonal(record,account){
 if(!account?.units?.length)throw new Error('Importe seu JSON do SWEX antes de sincronizar a composição.');
 if(!personalSiegeTeams([record.team]).length)throw new Error('A Central de Siege aceita composições de três slots.');
 // The portable whitelist drops foreign unit IDs, planned runes and manual sheets.
 const team=copyTeamToOptimizer({...record.team,name:record.name,description:record.description||record.team.description,configs:record.team.configs.map(c=>({...c,unitId:null}))},account);
 team.autoName=false;
 team.sourceAccountId=account.id;
 team.towerSpd=account.towers?.glorySpd??0;
 team.guildSpd=account.towers?.guildSpd??0;
 if(record.counter)team.enemyDefense=structuredClone(record.counter.enemyDefense);
 return {team,missing:team.configs.filter(c=>!c.unitId).map(c=>c.label)};
}

// Include actual equipment as well as local plans, so even an unoptimized imported
// team participates. Repeated references inside a slot are counted only once.
export function siegeRuneConflicts(account,teams,builds=[]){
 if(!account)return [];
 const units=new Map(account.units.map(u=>[u.id,u])),knownRunes=new Set(account.runes.map(r=>r.id)),usage=new Map();
 for(const team of personalSiegeTeams(teams))for(const c of team.configs){
  if(c.enabled===false)continue;
  const unit=units.get(c.unitId);if(!unit)continue;
  const build=builds.find(b=>b.teamId===team.id&&b.key===c.key&&b.unitId===unit.id);
  for(const id of new Set(build?.runeIds??currentRuneIds(account,team,c,unit)??[])){
   if(!knownRunes.has(id))continue;
   const refs=usage.get(id)||[];refs.push({teamId:team.id,teamName:team.name,configKey:c.key,name:unit.name});usage.set(id,refs);
  }
 }
 return [...usage].filter(([,refs])=>refs.length>1).map(([runeId,uses])=>({runeId,uses}));
}
