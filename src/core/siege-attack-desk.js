import {normalizeLeader} from './leaders.js';
import {catalogLeader} from './leader-catalog.js';
import {personalSiegeTeams,siegeGuildRecords} from './siege-central.js';
import {portableTeam} from './hub.js';
import {cleanSiegeCounter} from './siege.js';

// Personal enemy compositions are small local records, separate from the
// player's own defenses and from the guild's shared models.
export function cleanSiegeTarget(raw){
 if(!raw||!Array.isArray(raw.members)||raw.members.length!==3)throw new Error('Selecione os três monstros da defesa inimiga.');
 const members=raw.members.map(m=>{
  const masterId=Number(m?.masterId),label=String(m?.label||'').trim();
  if(!Number.isSafeInteger(masterId)||masterId<10000||!label||label.length>80)throw new Error('Complete os três monstros da defesa inimiga.');
  return {masterId,label};
 });
 const leaderIndex=Number(raw.leaderIndex??0);
 if(!Number.isInteger(leaderIndex)||leaderIndex<0||leaderIndex>2)throw new Error('Selecione um líder válido.');
 return {id:typeof raw.id==='string'&&raw.id.length<=80?raw.id:crypto.randomUUID(),members,leaderIndex,leader:Object.hasOwn(raw,'leader')?normalizeLeader(raw.leader):catalogLeader(members[leaderIndex].masterId)};
}

export function siegeTargetKey(target){
 const {members,leaderIndex=0,leader=null}=target;
 // The leader remains distinct even when it has no leader skill. Only the
// two non-leader positions are interchangeable.
 return JSON.stringify([Number(members[leaderIndex]?.masterId),members.filter((_,i)=>i!==leaderIndex).map(m=>Number(m.masterId)).sort((a,b)=>a-b),leader?[leader.stat,leader.value,leader.scope,leader.element||null]:null]);
}

export function registerSiegeTarget(targets,raw){
 const target=cleanSiegeTarget(raw),key=siegeTargetKey(target),existing=targets.find(t=>siegeTargetKey(t)===key);
 return {target:existing||target,targets:existing?targets:[...targets,target],duplicate:!!existing};
}

export function personalSiegeConfrontations(targets=[],matchups=[],teams=[],account){
 const groups=new Map();
 function group(target){
  const key=siegeTargetKey(target);let row=groups.get(key);
  if(!row){row={key,name:'Defesa inimiga',members:target.members,leader:target.leader,leaderIndex:target.leaderIndex,attacks:[],defenseSeed:{enemyDefense:target.members,defenseLeader:target.leader,defenseLeaderIndex:target.leaderIndex}};groups.set(key,row);}
  return row;
 }
 for(const raw of targets)try{group(cleanSiegeTarget(raw));}catch{/* Keep invalid legacy records in storage, outside the rendered index. */}
 const personal=personalSiegeTeams(teams).filter(t=>t.mode==='attack');
 const records=siegeGuildRecords([],matchups,[],null).map(record=>({...record,personalTeamId:matchups.find(m=>m.id===record.id)?.personalTeamId}));
 for(const team of personal){
  if(team.enemyDefense?.length!==3||records.some(r=>r.personalTeamId===team.id))continue;
  try{const counter=cleanSiegeCounter({name:team.name,offense:portableTeam(team,account),enemyDefense:team.enemyDefense,notes:team.description||'',siege:team.siege});records.push({key:`personal:${team.id}`,id:team.id,name:team.name,kind:'counter',description:counter.notes,team:counter.offense,counter,personalTeamId:team.id,fromPersonalTeam:true});}catch{/* An unfinished team is still available in the attack collection. */}
 }
 for(const record of records){
  const target={members:record.counter.enemyDefense,leaderIndex:record.counter.siege.defenseLeaderIndex,leader:record.counter.siege.defenseLeader},row=group(target);
  row.attacks.push(record);row.record??=record;
 }
 // The shared comparison view needs a defense record, including for empty targets.
 for(const row of groups.values())row.record??={key:row.key,name:row.name,team:{mode:'defense',leaderIndex:row.leaderIndex,configs:row.members},targetOnly:true};
 return [...groups.values()];
}
