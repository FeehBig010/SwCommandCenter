import {STATS,FOUR} from './data.js';
import {calculateStats,artifactBonus,setCounts,goalReport,speedSyncValid,estimateRealDamage} from './optimizer.js';
import {combatAttributes} from './speedTuner.js';
import {artifactEffects} from './artifacts.js';
import {accountStamp,currentRuneIds} from './loadouts.js';
import {lockContext} from './locks.js';
import {compatibleCrafts,simulateRuneCraft} from './rune-crafts.js';
import {assertMainPool} from './equipment-pools.js';
import {importedPreset} from './optimizer-context.js';
const count=id=>FOUR.has(Number(id))?4:2;
const gains=(a,b)=>Object.fromEntries(STATS.map(k=>[k,b.total[k]-a.total[k]]));
function quality(stats,baseline,sync){const s=stats.total,b=baseline.total;return STATS.reduce((n,k)=>n+(s[k]-b[k])/Math.max(1,b[k])*(k==='spd'&&!sync?0.01:1),0);}
function noRegression(build,baseline,config){
 return STATS.every(k=>k==='spd'&&!config.lockSpeedSync||build.stats.total[k]>=baseline.stats.total[k])&&
  Object.entries(baseline.counts).every(([id,n])=>Math.floor((build.counts[id]||0)/count(id))>=Math.floor(n/count(id)))&&
  (!config.strictSets||(config.sets||[]).every(id=>!id||(build.counts[id]||0)>=(config.sets.filter(x=>x===id).length*count(id))))&&
  goalReport(build.stats,config).every(g=>g.actual>=Math.min(g.target,baseline.goals.find(b=>b.key===g.key)?.actual??g.target));
}
function makeBuild(job,runes,account,options){
 const {unit,config,team}=job,counts=setCounts(runes),stats=calculateStats(unit,runes,options.artifacts!==false&&config.artifacts!==false?artifactBonus(account,unit):{});
 const effects=artifactEffects(account,unit,options.artifacts!==false&&config.artifacts!==false);
 stats.combat={...combatAttributes(unit,stats,counts,team,config.combat,effects),effects:effects.totals};
 const damage=config.damage?.enabled?estimateRealDamage(unit,stats,config.damage,effects):null;
 return {damage,key:config.key,unitId:unit.id,name:unit.name,teamId:team.id,teamName:team.name,runeIds:runes.map(r=>r.id),counts,stats,goals:goalReport(stats,config),upgrades:[],artifactIds:options.artifacts!==false&&config.artifacts!==false?unit.artifactIds:[],role:team.mode==='attack'?'offense':'defense'};
}
// Conservative local audit. Real swaps and hypothetical craft plans are separate:
// a craft never appears in actual stats, never consumes stock, and never mutates SWEX.
export function auditPresets(account,teams,options,onProgress=()=>{},reservedIds=[]){
 assertMainPool(teams,options);
 const started=Date.now(),map=new Map(account.runes.map(r=>[r.id,r])),jobs=[],failures=[],blocked=new Set([...reservedIds,...(options.blockedRuneIds||[])]),locks=lockContext(account,options);
 for(const team of teams){
  const preset=importedPreset(team,account);if(!preset)throw new Error('A auditoria exige uma composição original do preset SWEX.');
  for(const config of team.configs.filter(c=>c.enabled!==false)){
   if(STATS.some(k=>config.goals?.[k]!==''&&config.goals?.[k]!=null&&(!Number.isFinite(Number(config.goals[k]))||Number(config.goals[k])<0)))throw new Error(`Meta inválida para ${config.label}.`);
   const original=account.units.find(u=>u.id===config.unitId),equipment=preset.equipment?.find(e=>e.unitId===config.unitId);
   if(!original){failures.push({name:config.label,reason:'Monstro ausente no JSON.'});continue;}
   const unit={...original,artifactIds:equipment?.artifactIds??original.artifactIds??[]},ids=team.plannedRunes?.accountStamp===accountStamp(account)&&Array.isArray(team.plannedRunes.byConfig?.[config.key])?currentRuneIds(account,team,config,unit):(equipment?.runeIds??unit.runeIds??[]),runes=ids.map(id=>map.get(id));
   if(runes.length!==6||runes.some(r=>!r)||new Set(runes.map(r=>r.slot)).size!==6||runes.some(r=>[25,99].includes(r.set))){failures.push({name:config.label,reason:'Complete as seis runas de um conjunto suportado para auditar este preset.'});continue;}
   const job={team,config,unit,runes:runes.slice().sort((a,b)=>a.slot-b.slot)};job.baseline=makeBuild(job,job.runes,account,options);jobs.push(job);
  }
 }
 const result=(builds,audit)=>({status:'audited',builds,failures,elapsed:Date.now()-started,checked:evaluations,completedAt:new Date().toISOString(),options:{...options,maxGrindsGems:false},scope:'inventory-backed-audit',audit:{...audit,syncEnabled:teams.some(t=>t.optimizerSpeedSync!==false)}});
 let evaluations=0;
 if(failures.length||!jobs.length)return result([],{changes:[],craftPlans:[],syncValid:false,bounded:true});
 const ownership=new Map();for(const job of jobs)for(const r of job.runes){if(ownership.has(r.id)){failures.push({name:job.unit.name,reason:'Presets compartilham runas. Audite estes times separadamente.'});return result([],{changes:[],craftPlans:[],syncValid:false,bounded:true});}ownership.set(r.id,job.unit.id);}
 const equipped=new Set(account.units.flatMap(u=>u.runeIds||[])),used=new Set(jobs.flatMap(j=>j.baseline.runeIds));
 const free=account.runes.filter(r=>!r.owner&&!equipped.has(r.id)&&!used.has(r.id)&&!blocked.has(r.id)&&!locks.runes.has(r.id)&&(!options.respectLocks||!r.locked)&&r.pool!=='rta'&&![25,99].includes(r.set)&&r.level>=(options.minLevel||0));
 const state=Object.fromEntries(jobs.map(j=>[j.config.key,j.baseline])),gear=new Map(jobs.map(j=>[j.config.key,j.runes]));
 const syncValid=assignments=>speedSyncValid(assignments,teams);
 const canChange=(job,rune)=>!locks.units.has(job.unit.id)&&!locks.runes.has(rune.id)&&!blocked.has(rune.id)&&(!options.respectLocks||!rune.locked);
 const changes=[],limit=50000;
 for(let pass=0;pass<3;pass++){
  let changed=false;
  for(let i=0;i<jobs.length;i++){
   const job=jobs[i],key=job.config.key,current=gear.get(key);let best=null,bestGain=0;
   onProgress({percent:Math.round((pass*jobs.length+i)/(3*jobs.length)*65),message:`Auditando runas de ${job.unit.name}…`});
   for(let slot=0;slot<6&&evaluations<limit;slot++){
    const old=current[slot];if(!canChange(job,old))continue;
    for(const rune of free){
     if(evaluations>=limit)break;
     // Preserve the exact main-stat type (including slots 2/4/6), main value
     // and current completed sets; upgrades are only drawn from loose inventory.
     if(used.has(rune.id)||rune.slot!==old.slot||rune.main[0]!==old.main[0]||rune.main[1]<old.main[1])continue;
     evaluations++;const next=current.map((r,s)=>s===slot?rune:r),build=makeBuild(job,next,account,options);
     if(!noRegression(build,job.baseline,job.config)||!syncValid({...state,[key]:build}))continue;
     const gain=quality(build.stats,state[key].stats,job.team.optimizerSpeedSync);
     if(gain>bestGain+1e-9){bestGain=gain;best={next,build,old,rune};}
    }
   }
   if(best){const before=state[key];state[key]=best.build;gear.set(key,best.next);used.delete(best.old.id);used.add(best.rune.id);changed=true;changes.push({key,unitId:job.unit.id,name:job.unit.name,slot:best.rune.slot,oldRuneId:best.old.id,runeId:best.rune.id,gains:gains(before.stats,best.build.stats),before:before.stats.total,after:best.build.stats.total});}
  }
  if(!changed||evaluations>=limit)break;
 }
 // One global, stock-limited plan on the ORIGINAL runes. Do not add craft
 // gains to the separate replacement builds; the UI labels these as alternatives.
 const projected=Object.fromEntries(jobs.map(j=>[j.config.key,j.baseline])),craftPlans=[],craftUsed={};
 const craftTypes=new Map();for(const c of account.crafts||[]){const k=`${c.set}:${c.kind}:${c.stat}:${c.grade}:${c.ancient}`;if(!craftTypes.has(k))craftTypes.set(k,[]);craftTypes.get(k).push(c);}
 let craftChecks=0;
 for(let i=0;i<jobs.length;i++){
  const job=jobs[i],key=job.config.key,steps=[];let runes=job.runes;
  onProgress({percent:65+Math.round(i/jobs.length*34),message:`Conferindo Grinds e Gemas de ${job.unit.name}…`});
  for(let round=0;round<30&&craftChecks<20000;round++){
   let best=null,bestGain=0;
   for(let slot=0;slot<6&&craftChecks<20000;slot++){
    const rune=runes[slot];if(!canChange(job,rune))continue;
    const available=[...craftTypes.values()].map(group=>group.find(c=>(craftUsed[c.id]||0)<c.quantity)).filter(Boolean);
    for(const craft of compatibleCrafts(rune,available))for(let index=0;index<rune.subs.length;index++){
     if(craftChecks++>=20000)break;
     let simulated;try{simulated=simulateRuneCraft(rune,craft,{index,used:craftUsed});}catch{continue;}
     const next=runes.map((r,s)=>s===slot?simulated.rune:r),build=makeBuild(job,next,account,options);
     if(!noRegression(build,job.baseline,job.config)||!syncValid({...projected,[key]:build}))continue;
     const gain=quality(build.stats,projected[key].stats,job.team.optimizerSpeedSync);
     if(gain>bestGain+1e-9){bestGain=gain;best={next,build,craft,index,rune,simulated};}
    }
   }
   if(!best)break;
   const before=projected[key];projected[key]=best.build;runes=best.next;Object.assign(craftUsed,best.simulated.used);
   steps.push({craftId:best.craft.id,kind:best.craft.kind,runeId:best.rune.id,slot:best.rune.slot,index:best.index,stat:best.craft.stat,maxRoll:best.simulated.maxRoll,gains:gains(before.stats,best.build.stats)});
  }
  if(steps.length)craftPlans.push({key,unitId:job.unit.id,name:job.unit.name,steps,before:job.baseline.stats.total,after:projected[key].stats.total,gains:gains(job.baseline.stats,projected[key].stats),projected:true});
 }
 onProgress({percent:100,message:'Auditoria concluída.'});
 return result(jobs.map(j=>({...state[j.config.key],auditBefore:j.baseline.stats.total})),{changes,craftPlans,craftUsed,syncValid:syncValid(state),craftSyncValid:syncValid(projected),bounded:true,exhausted:evaluations>=limit||craftChecks>=20000,craftScope:'original-loadout-alternative-max-roll',teamCount:teams.length});
}
