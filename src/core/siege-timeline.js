import {calculateStats,artifactBonus,setCounts} from './optimizer.js';
import {artifactEffects} from './artifacts.js';
import {currentRuneIds} from './loadouts.js';
import {combatAttributes,scenarioForTeam,simulateCombat} from './speedTuner.js';
import {monsterRecord} from './monsterDatabase.js';
import {FOUR} from './data.js';

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
 const scenarioTeam={...team,enemyCombatSpd:0,autoOpener:team.autoOpener!==false};
 const configured=scenarioForTeam(scenarioTeam,actors),references=[],unknownDefense=[],usedEnemies=new Set();
 for(const [i,member] of (team.enemyDefense||[]).entries()){
  const explicit=configured.actors.find(a=>a.enemy&&!usedEnemies.has(a.key)&&Number(a.master)===Number(member.masterId));
  if(explicit){usedEnemies.add(explicit.key);continue;}
  const key=`defense:${i}`,knownSpd=Number(member.combatSpd),bonus=Number(member.bonusSpd??(member.basis==='bonus'?member.goals?.spd:0));
  const sheet=member.basis==='total'?Number(member.goals?.spd):0,monster=monsterRecord(member.masterId);
  if(knownSpd>0){configured.actors.push({key,master:member.masterId,name:member.label,spd:knownSpd,enemy:true});continue;}
  if(monster&&(bonus>0||sheet>0)){
   const enemyTeam={gameMode:'siege',towerSpd:15,guildSpd:0,leader:team.siege?.defenseLeader||null};
   const counts={};for(const id of member.sets||[])counts[id]=(counts[id]||0)+(FOUR.has(Number(id))?4:2);
   const total={...monster.base,spd:sheet||monster.base.spd+bonus},combat=combatAttributes(monster,{total},counts,enemyTeam,member.combat);
   configured.actors.push({key,master:member.masterId,name:member.label,spd:combat.spd,rawSpd:combat.rawSpd,combat:member.combat,enemy:true});continue;
  }
  const tick=Number(member.maxTick);
  if(Number.isInteger(tick)&&tick>0)references.push({key,master:member.masterId,name:member.label,tick,spd:null,enemy:true,referenceOnly:true});
  else unknownDefense.push(member.label);
 }
 // A user-supplied scalar enemy speed has no known face. Keep it as a neutral
 // reference rather than assigning that speed to any of the three defenders.
 const enemySpeed=Number(team.enemyCombatSpd)||0;
 if(enemySpeed>0&&!configured.actors.some(a=>a.enemy))configured.actors.push({key:'defense:reference',name:'Referência inimiga',spd:enemySpeed,enemy:true});
 const keys=new Set(configured.actors.map(a=>a.key)),events=configured.events.filter(e=>keys.has(e.afterKey)).map(e=>({...e,targets:e.targets.filter(key=>keys.has(key))}));
 const scenario=actors.length?simulateCombat(configured.actors,{events,stopAfterFirst:true,captureReadiness:true}):null;
 return {complete:!!scenario,actors:configured.actors,scenario,turns:scenario?.firstTurns||[],references,missing,unknownDefense,source:'equipped'};
}
