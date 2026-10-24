import {autoFillTeam} from './team-autofill.js';
import {currentRuneIds,accountStamp} from './loadouts.js';
import {calculateStats,artifactBonus,setCounts} from './optimizer.js';
import {combatAttributes} from './speedTuner.js';
import {artifactEffects} from './artifacts.js';
import {effectiveSurvival} from './cairos-checklist.js';
import {R5_EHP_REFERENCE} from './pve-thresholds.js';
export {bossAccuracyTarget,R5_EHP_REFERENCE} from './pve-thresholds.js';

export function hydratePveTeam(team,account,options={}){
 let prepared=team;
 if(team.suggestedTemplate)prepared={...team,suggestedTemplate:false,configs:team.configs.map(c=>({...c,goals:Object.fromEntries(Object.keys(c.goals).map(k=>[k,'']))}))};
 if(team.raid){const source=account?.accountPresets?.find(p=>p.id===team.sourceDeckId)?.sourceUnitIds,hasFormation=source?.length===8,manual=team.raidFormationSource==='manual';
  prepared={...prepared,raidFormationSource:manual?'manual':hasFormation?'swex':'suggested',configs:prepared.configs.map((c,i)=>({...c,raidGoals:true,raidPosition:!manual&&hasFormation&&c.unitId?(source.slice(0,4).includes(c.unitId)?'front':'back'):c.raidPosition||(i<2?'front':'back')}))};
 }
 return autoFillTeam(prepared,account,options);
}
// Source changes refresh generated values; editing/clearing a goal does not.
export function pveHydrationKey(team,account,options={}){return JSON.stringify([accountStamp(account),team.id,team.sourceDeckId,team.plannedRunes,team.raidLeaders,team.configs.map(c=>[c.unitId,c.basis,c.raidGoals,c.artifacts,c.combat]),options.artifacts]);}

export function pveMemberStats(account,team,config,options={}){
 const original=account?.units.find(u=>u.id===config.unitId);if(!original)return null;
 const equipment=account.accountPresets?.find(p=>p.id===team.sourceDeckId)?.equipment?.find(e=>e.unitId===original.id),unit=equipment?{...original,artifactIds:equipment.artifactIds??original.artifactIds}:original;
 const ids=currentRuneIds(account,team,config,unit)||[],runes=ids.map(id=>account.runes.find(r=>r.id===id)).filter(Boolean),effects=artifactEffects(account,unit,options.artifacts!==false&&config.artifacts!==false);
 const stats=calculateStats(unit,runes,options.artifacts!==false&&config.artifacts!==false?artifactBonus(account,unit):{});
 return {unit,stats,combat:combatAttributes(unit,stats,setCounts(runes),team,config.combat,effects),effects,complete:runes.length===6&&new Set(runes.map(r=>r.slot)).size===6};
}
export function raidFrontlineReport(account,team,options={}){
 const reference=Number(team.frontlineEhpTarget)>0?Number(team.frontlineEhpTarget):R5_EHP_REFERENCE;
 return {reference,members:team.configs.filter(c=>c.enabled!==false&&c.raidPosition==='front').map(c=>{
  const current=pveMemberStats(account,team,c,options);if(!current)return {key:c.key,name:c.label,missing:true,met:false};
  const survival=effectiveSurvival(current.combat.hp,current.combat.def,{element:0},current.effects);
  return {key:c.key,name:c.label,hp:current.combat.hp,def:current.combat.def,ehp:survival.ehp,complete:current.complete,met:current.complete&&survival.ehp>=reference};
 })};
}
