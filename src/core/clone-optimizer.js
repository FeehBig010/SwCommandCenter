import {optimize,speedSyncValid,teamTurnPreview} from './optimizer.js';
import {targetGoalsOf,targetIssue,targetSetReport,targetDistance} from './target-goals.js';

export function prepareCloneSearch(team,account){
 const issue=targetIssue(team,account);if(issue)throw new Error(issue);
 const target=targetGoalsOf(team),byKey=new Map(team.configs.map(c=>[c.key,c]));
 return {...team,gameMode:'siege',active:true,order:'hard',cloneTiming:true,autoOpener:target.autoOpener,leader:structuredClone(target.leader),leaderIndex:target.leaderIndex,leaderKey:target.leader?target.configs[target.leaderIndex]?.key:null,leaderSpd:0,enemyCombatSpd:target.enemyCombatSpd,combatScenario:structuredClone(target.combatScenario),configs:target.configs.map(t=>{
  const own=byKey.get(t.key);return {...own,...structuredClone(t),unitId:own.unitId,enabled:true,matchTarget:true,lockSpeedSync:true,strictSets:false,mains:{2:0,4:0,6:0},focuses:[],objective:'balanced'};
 })};
}
export function optimizeClone(account,team,options,onProgress=()=>{},reservedIds=[]){
 const prepared=prepareCloneSearch(team,account);
 // Match the real inventory. Numeric/stat/set shortfalls are allowed; timing is not.
 const actualOptions={...options,strictMode:false,maxGrindsGems:false};
 const result=optimize(account,[prepared],actualOptions,onProgress,reservedIds);
 if(!result.builds.length)return {...result,cloneMatching:{teamId:team.id,sourceName:team.target_goals.sourceName,orderValid:false}};
 const assignments=Object.fromEntries(result.builds.map(b=>[b.key,b]));
 if(result.builds.length!==3||!speedSyncValid(assignments,[prepared]))throw new Error('A distribuição não preservou a ordem da meta. Nenhuma build foi aplicada.');
 const builds=result.builds.map(b=>{const c=prepared.configs.find(c=>c.key===b.key);return {...b,targetSets:targetSetReport(b.counts,c.sets),targetDistance:targetDistance(b.stats,c,b.counts)};});
 const preview=teamTurnPreview(account,prepared,actualOptions,builds);
 const turns=preview.turns.filter(t=>!t.enemy).map(t=>({key:t.key,name:builds.find(b=>b.key===t.key)?.name||'',tick:Math.max(1,Math.trunc(t.tick))}));
 const met=builds.every(b=>b.goals.every(g=>g.met)&&b.targetSets.every(s=>s.met));
 return {...result,builds,status:met?'met':'approximate',allocation:'clone-target-distance-with-hard-turn-order',cloneMatching:{teamId:team.id,sourceName:team.target_goals.sourceName,orderValid:true,turns,distance:builds.reduce((sum,b)=>sum+b.targetDistance,0)}};
}
