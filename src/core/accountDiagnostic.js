import {artifactEffects} from './artifacts.js';
import {calculateStats,goalReport,equippedBuild} from './optimizer.js';
import {combatAttributes} from './speedTuner.js';
import {accountStamp,currentRuneIds} from './loadouts.js';
const ROLLS={1:375,2:8,3:20,4:8,5:20,6:8,8:6,9:6,10:7,11:8,12:8};
export function runeEfficiency(rune){if(rune.stars!==6)return null;const values=[rune.innate,...rune.subs].filter(e=>ROLLS[e[0]]);return Math.round(values.reduce((n,e)=>n+e[1]/ROLLS[e[0]],0)/9*1000)/10;}
// Rune efficiency excludes grinds: six-star max-roll equivalents / nine rolls.
// Recommendations are single-slot exact stat comparisons, never auto assignments.
export function scanAccount(account,teams=[],options={},reservedIds=[]){
 if(!account)return {treasures:[],suggestions:[],scanned:0};
 const blocked=new Set(reservedIds),bySlot=new Map(),units=new Map(account.units.map(u=>[u.id,u])),runes=new Map(account.runes.map(r=>[r.id,r]));
 for(const t of teams.filter(t=>t.active!==false))for(const c of t.configs.filter(c=>c.enabled!==false)){const u=units.get(c.unitId);if(u)for(const id of currentRuneIds(account,t,c,u))blocked.add(id);}
 const treasures=[];
 for(const r of account.runes){if(r.owner||blocked.has(r.id)||options.respectLocks!==false&&r.locked)continue;const speed=r.subs.find(e=>e[0]===8),spd=speed?(speed[1]+(speed[3]||0)):0,efficiency=runeEfficiency(r);if(spd<18&&(efficiency??0)<85)continue;const row={id:r.id,slot:r.slot,set:r.set,spd,efficiency,ancient:r.ancient};treasures.push(row);if(!bySlot.has(r.slot))bySlot.set(r.slot,[]);bySlot.get(r.slot).push(r);}
 const suggestions=[];
 for(const team of teams.filter(t=>t.active!==false))for(const config of team.configs.filter(c=>c.enabled!==false)){
  const unit=units.get(config.unitId),build=unit&&equippedBuild(account,team,config,options);if(!build||!build.goals.some(g=>!g.met))continue;
  const equipped=build.runeIds.map(id=>runes.get(id));if(equipped.some(r=>!r))continue;
  const baseline=calculateStats(unit,equipped),flat=Object.fromEntries(['hp','atk','def'].map(k=>[k,build.stats.bonus[k]-baseline.bonus[k]]));
  for(let slot=1;slot<=6;slot++)for(const candidate of bySlot.get(slot)||[]){const old=equipped.find(r=>r.slot===slot);if(!old||config.mains?.[slot]&&candidate.main[0]!==Number(config.mains[slot]))continue;
   const next=equipped.map(r=>r.slot===slot?candidate:r),counts={};next.forEach(r=>counts[r.set]=(counts[r.set]||0)+1);
   // Keep every existing set intact; no hidden loss of Violent/Will/etc.
   if(Object.entries(build.counts).some(([id,n])=>Math.floor((counts[id]||0)/([3,5,8,10,11,13].includes(Number(id))?4:2))<Math.floor(n/([3,5,8,10,11,13].includes(Number(id))?4:2))))continue;
   const stats=calculateStats(unit,next,flat);stats.combat=combatAttributes(unit,stats,counts,team,config.combat,artifactEffects(account,unit,options.artifacts!==false&&config.artifacts!==false));
   if(Object.keys(stats.total).some(k=>stats.total[k]<build.stats.total[k])||stats.combat.spd<build.stats.combat.spd)continue;
   const before=goalReport(build.stats,config),after=goalReport(stats,config),gains=after.flatMap((g,i)=>g.missing<before[i].missing?[{stat:g.key,gain:before[i].missing-g.missing,remaining:g.missing}]:[]);
   if(gains.length)suggestions.push({runeId:candidate.id,replaces:old.id,teamId:team.id,teamName:team.name,configKey:config.key,name:unit.name,gains});
  }
 }
 return {scanned:account.runes.length,treasures:treasures.sort((a,b)=>b.spd-a.spd||(b.efficiency||0)-(a.efficiency||0)),suggestions};
}

export function applyScanSuggestion(account,teams,options,reservedIds,suggestion){
 const verified=scanAccount(account,teams,options,reservedIds).suggestions.find(s=>s.teamId===suggestion.teamId&&s.configKey===suggestion.configKey&&s.runeId===suggestion.runeId&&s.replaces===suggestion.replaces);
 if(!verified)throw new Error('Sugestão desatualizada ou runa indisponível. Aguarde nova varredura.');
 const team=teams.find(t=>t.id===verified.teamId),byConfig={};for(const c of team.configs.filter(c=>c.enabled!==false)){const u=account.units.find(u=>u.id===c.unitId);if(!u)throw new Error('Time incompleto.');byConfig[c.key]=currentRuneIds(account,team,c,u).map(id=>c.key===verified.configKey&&id===verified.replaces?verified.runeId:id);}
 return {...team,plannedRunes:{accountStamp:accountStamp(account),byConfig,appliedAt:new Date().toISOString()}};
}
