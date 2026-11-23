import {calculateStats,artifactBonus,setCounts} from './optimizer.js';
import {artifactEffects} from './artifacts.js';
import {currentRuneIds} from './loadouts.js';
import {combatAttributes,simulateTeamCombat} from './speedTuner.js';

// Plot real equipped/planned account builds, never the guild's target goals.
// A deadline alone is a reference marker, not evidence of an enemy's SPD/ATB.
export function siegeAccountTimeline(account,team,options={},builds=[]){
 if(!account)return {complete:false,missing:[],actors:[],turns:[]};
 const actors=[],missing=[],runesById=new Map(account.runes.map(r=>[r.id,r]));
 const unitsById=new Map(account.units.map(u=>[u.id,u]));
 for(const config of team.configs.filter(c=>c.enabled!==false)){
  const original=unitsById.get(config.unitId);if(!original){missing.push(config.label);continue;}
  const equipment=account.accountPresets?.find(p=>p.id===team.sourceDeckId)?.equipment?.find(e=>e.unitId===original.id);
  const unit=equipment?{...original,artifactIds:equipment.artifactIds??original.artifactIds}:original;
  const build=builds?.find(b=>b.key===config.key&&b.unitId===unit.id&&(!b.teamId||b.teamId===team.id));
  const runes=(build?.runeIds??currentRuneIds(account,team,config,unit)).map(id=>runesById.get(id)).filter(Boolean);
  const enabled=options.artifacts!==false&&config.artifacts!==false,effects=artifactEffects(account,unit,enabled),counts=build?.counts||setCounts(runes);
  const stats=build?.stats?.total?build.stats:calculateStats(unit,runes,enabled?artifactBonus(account,unit):{});
  const combat=combatAttributes(unit,stats,counts,team,config.combat,effects);
  actors.push({key:config.key,unitId:unit.id,master:unit.master,name:unit.name,spd:combat.spd,rawSpd:combat.rawSpd,combat:config.combat,effects,attributes:combat,will:(counts[15]||0)>=2,nemesisSets:Math.floor((counts[14]||0)/2)});
 }
 if(!actors.length)return {complete:false,actors,scenario:null,turns:[],references:[],missing,unknownDefense:[],source:'equipped'};
 const report=simulateTeamCombat({...team,includePartial:true},actors,{includeReference:false,captureReadiness:true});
 return {complete:true,actors:report.actors,scenario:report.scenario,cut:report.scenario.cut,turns:report.scenario.firstTurns,
  references:report.references,missing,unknownDefense:report.unknownDefense,source:'equipped'};
}
