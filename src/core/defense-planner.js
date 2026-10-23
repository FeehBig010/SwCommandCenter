import {blankConfig,makeTeam,DEFAULT_OPTIONS} from './data.js';
import {portableTeam} from './hub.js';
import {optimize} from './optimizer.js';
export const DEFENSE_LIMIT=8;
export function defenseCatalog(cloudRows=[],guildId,local=[]){const rows=[];for(const row of cloudRows){const t=row.payload?.team;if(row.guild_id!==guildId||row.visibility!=='guild'||!row.is_leadership||!t||t.configs?.length!==3||t.mode==='attack'||t.gameMode&&t.gameMode!=='siege')continue;try{rows.push({id:`cloud:${row.id}`,name:row.name,team:portableTeam({...t,mode:'defense'})});}catch{}}
 for(const row of local){if(row.team?.mode==='attack'||row.team?.gameMode&&row.team.gameMode!=='siege')continue;try{rows.push({id:`local:${row.id}`,name:row.name,team:portableTeam({...row.team,name:row.name,mode:'defense'})});}catch{}}return [...new Map(rows.map(r=>[r.id,r])).values()];
}
export function bindDefenses(templates,account){const used=new Set();return templates.map((template,i)=>{if(template.team?.gameMode&&template.team.gameMode!=='siege')throw new Error('Use apenas defesas Siege / GvG.');const clean=portableTeam({...template.team,mode:'defense'});return {...makeTeam('siege'),...clean,id:template.id||`defense-${i}`,name:template.name||clean.name,active:true,configs:clean.configs.map((c,j)=>{const u=account.units.filter(u=>u.master===c.masterId&&!used.has(u.id)).sort((a,b)=>b.level-a.level||a.id-b.id)[0];if(u)used.add(u.id);return {...blankConfig(u,c.label),...c,key:`def-${i}-${j}`,unitId:u?.id||null};})};});}
export function defenseStatus(result){if(result.builds?.length&&result.builds.every(b=>b.goals.every(g=>g.met)))return 'ready';if(result.builds?.length&&result.builds.every(b=>b.goals.every(g=>g.missing/Math.max(1,g.target)<=.05)))return 'adjust';return 'unallocated';}
export function planDefenses(account,templates,options={},reservedIds=[],onResult=()=>{}){
 if(!account)throw new Error('Importe seu SWEX para testar o inventário.');if(!Array.isArray(templates)||templates.length<2||templates.length>8)throw new Error('Selecione de duas a oito defesas completas.');const bound=bindDefenses(templates,account),reports=[],cache=new Map();
 for(let count=2;count<=bound.length;count++){
  const teams=bound.slice(0,count),missing=teams.flatMap(t=>t.configs).filter(c=>!c.unitId);let result;
  if(missing.length)result={status:'missing',builds:[],failures:missing.map(c=>({name:c.label,reason:'Falta cópia distinta na conta.'}))};
  else try{result=optimize(account,teams,{...DEFAULT_OPTIONS,...options,depth:options.depth||'fast',strictMode:false,maxGrindsGems:false},()=>{},reservedIds,cache);}catch(error){result={status:'error',builds:[],failures:[{reason:error.message}]};}
  const report={count,status:defenseStatus(result),teamIds:teams.map(t=>t.id),result,scope:'selected-prefix-bounded-search'};reports.push(report);onResult(report);
 }
 return reports;
}
