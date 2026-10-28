import {calculateStats,artifactBonus} from './optimizer.js';
import {accountStamp,currentRuneIds} from './loadouts.js';
import {bossAccuracyTarget} from './pve-thresholds.js';
import waves from './cairos-waves.json' with {type:'json'};
// Static equipment check. No rune search, ATB simulation, towers or guild compensation.
export function pveStaticRequirements(stage){
 const enemies=Object.values(waves[stage]?.waves||{}).flat();
 const speed=Math.max(0,...enemies.map(e=>Number(e.spd)||0));
 return {accuracy:bossAccuracyTarget(stage),speed:speed?speed+1:null};
}
export function checkPveTargets(account,team,stage,options={}){
 const requirements=pveStaticRequirements(stage),usedUnits=new Set(),usedRunes=new Set(),byId=new Map((account?.runes||[]).map(r=>[r.id,r]));
 const members=(team.configs||[]).filter(c=>c.enabled!==false).map(c=>{
  const original=account?.units?.find(u=>u.id===c.unitId);
  if(!original)return {key:c.key,name:c.label,complete:false,met:false,reason:'Selecione uma unidade do JSON.',checks:[]};
  const equipment=account.accountPresets?.find(p=>p.id===team.sourceDeckId)?.equipment?.find(e=>e.unitId===original.id);
  const unit=equipment?{...original,artifactIds:equipment.artifactIds??original.artifactIds}:original;
  const ids=team.plannedRunes?.accountStamp===accountStamp(account)?currentRuneIds(account,team,c,unit):equipment?.runeIds??unit.runeIds??[];
  const runes=ids.map(id=>byId.get(id)).filter(Boolean);
  const duplicate=usedUnits.has(unit.id)||ids.some(id=>usedRunes.has(id));usedUnits.add(unit.id);ids.forEach(id=>usedRunes.add(id));
  const complete=!duplicate&&ids.length===6&&new Set(ids).size===6&&runes.length===6&&new Set(runes.map(r=>r.slot)).size===6;
  const stats=calculateStats(unit,runes,options.artifacts!==false&&c.artifacts!==false?artifactBonus(account,unit):{}).total;
  const targets={};
  for(const [key,value]of Object.entries(c.goals||{}))if(Number(value)>0)targets[key]=Number(value)+(c.basis==='bonus'&&!['cr','cd','res','acc'].includes(key)?Number(unit.base[key])||0:0);
  // Raid goals may have been hydrated in combat values; only explicit sheet goals
  // are checked here. The independent frontline EHP panel remains authoritative.
  if(c.raidGoals)for(const key of Object.keys(targets))delete targets[key];
  if(requirements.speed!=null)targets.spd=Math.max(targets.spd||0,requirements.speed);
  if(requirements.accuracy!=null&&c.requireAccuracy!==false)targets.acc=Math.max(targets.acc||0,requirements.accuracy);
  const checks=Object.entries(targets).map(([stat,target])=>({stat,target,current:stats[stat],met:stats[stat]>=target,missing:Math.max(0,target-stats[stat])}));
  return {key:c.key,name:c.label,stats,complete,checks,met:complete&&checks.length>0&&checks.every(g=>g.met),reason:duplicate?'Unidade ou runas repetidas no time.':complete?'':'Equipamento incompleto no JSON.'};
 });
 return {requirements,members,met:members.length>0&&members.every(m=>m.met),hasReference:requirements.speed!==null||requirements.accuracy!==null};
}
