import {STATS,FOUR,DEFAULT_OPTIONS} from './data.js';
import {generateCandidates,calculateStats,setCounts,artifactBonus} from './optimizer.js';
import {artifactEffects} from './artifacts.js';
import {quickCombatTeam} from './quick-calculator.js';
import {combatAttributes,simulateTeamCombat} from './speedTuner.js';
import {balanceProfile,balanceScales,weightedStatUtility,balanceLinkMode,balanceUnit,balanceInventory,balanceChecks} from './balance-profile.js';
import {accountStamp} from './loadouts.js';
const MAX_POOL=36,WIDTH=120,MAX_EVALUATIONS=600;
const clone=value=>structuredClone(value);
export function balanceSignature(account,team,options,reservedIds,allTeams){const text=JSON.stringify([account,team,options,reservedIds,allTeams]);let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return `${text.length}:${hash>>>0}`;}
function context(account,input,rawOptions,reservedIds,allTeams){
 if(!account?.units?.length)throw new Error('Importe seu JSON SWEX para buscar builds.');
 if(!input.configs?.length||new Set(input.configs.map(c=>c.key)).size!==input.configs.length||input.configs.length>6||input.configs.some(c=>!c.masterId||c.enabled===false))throw new Error('Selecione um monstro da conta em cada slot antes de buscar.');
 const options={...DEFAULT_OPTIONS,minLevel:0,...rawOptions,maxGrindsGems:false,depth:'fast'},team=quickCombatTeam(input);
 const inventory=balanceInventory(account,team,options,reservedIds,allTeams),used=new Set(),pins=new Map();
 const jobs=team.configs.map(config=>{
  const unit=balanceUnit(account,team,config,used);if(!unit)throw new Error(`${config.label}: selecione uma cópia disponível no seu JSON.`);
  const profile=balanceProfile(config),flat=options.artifacts!==false&&config.artifacts!==false?artifactBonus({...account,artifacts:account.artifacts||[]},unit):{},effects=artifactEffects(account,unit,options.artifacts!==false&&config.artifacts!==false);
  for(const [slot,id]of Object.entries(profile.pins)){
   const rune=inventory.byId.get(id);if(!rune||rune.slot!==Number(slot)||!inventory.allowed(rune,unit))throw new Error(`${config.label}: a runa fixada no slot ${slot} não está disponível com os bloqueios atuais.`);
   if(pins.has(id))throw new Error('Uma runa foi fixada em mais de um monstro. Libere uma das peças.');pins.set(id,config.key);
  }
  return {config,unit,profile,flat,effects,scales:balanceScales(unit)};
 });
 return {account,team,options,inventory,jobs,pins};
}
function canUse(ctx,job,ids){
 if(ids.length!==6||new Set(ids).size!==6)return false;
 const runes=ids.map(id=>ctx.inventory.byId.get(id));if(runes.some(r=>!r||!ctx.inventory.allowed(r,job.unit)||ctx.pins.has(r.id)&&ctx.pins.get(r.id)!==job.config.key)||new Set(runes.map(r=>r.slot)).size!==6)return false;
 for(const [slot,id]of Object.entries(job.profile.pins))if(!ids.includes(id)||ctx.inventory.byId.get(id).slot!==Number(slot))return false;
 for(const id of job.unit.runeIds){const r=ctx.inventory.byId.get(id);if((ctx.inventory.locks.units.has(job.unit.id)||ctx.inventory.locks.runes.has(id)||ctx.options.respectLocks&&r?.locked)&&!ids.includes(id))return false;}
 return true;
}
function exactBuild(ctx,job,ids){
 const runes=ids.map(id=>ctx.inventory.byId.get(id));if(runes.length!==6||new Set(ids).size!==6||runes.some(r=>!r)||new Set(runes.map(r=>r.slot)).size!==6)return null;
 const counts=setCounts(runes),stats=calculateStats(job.unit,runes,job.flat);
 stats.combat=combatAttributes(job.unit,stats,counts,ctx.team,job.config.combat,job.effects);
 return {key:job.config.key,unitId:job.unit.id,master:job.unit.master,name:job.unit.name,runeIds:[...ids],artifactIds:[...job.effects.artifactIds],base:{...job.unit.base},effects:job.effects,stats,counts};
}
function assessment(ctx,job,build){
 const checks=balanceChecks(build,job.config,ctx.inventory.byId),hard=checks.filter(c=>c.required&&!c.met),soft=checks.filter(c=>!c.required&&!c.met);
 return {checks,hard:hard.length,hardDeficit:hard.reduce((n,c)=>n+c.deficit,0),soft:soft.reduce((n,c)=>n+c.deficit,0),utility:weightedStatUtility(build.stats,job.profile.weights,job.scales)};
}
function candidatePools(ctx,progress){
 return ctx.jobs.map((job,index)=>{
  const {profile:p}=job,required=p.sets.filter(r=>r.required).map(r=>r.set),preferred=p.sets.filter(r=>!r.required).map(r=>r.set);
  const all=[];for(const relaxed of required.length||Object.values(p.mains).some(r=>r.required)?[false,true]:[false]){
   const c={...job.config,goals:Object.fromEntries(STATS.map(k=>[k,k==='spd'?'':p.minimums[k]??''])),basis:'total',combatSpd:p.minimums.spd??0,focuses:[],objective:'balanced',matchTarget:false,
    sets:relaxed?[]:required,strictSets:!relaxed&&required.length>0,mains:Object.fromEntries([2,4,6].map(s=>[s,!relaxed&&p.mains[s].required?p.mains[s].stat:0])),
    balanceWeights:p.weights,balanceScales:job.scales,balancePreferredSets:relaxed?[...required,...preferred]:preferred,balancePreferredMains:Object.fromEntries([2,4,6].map(s=>[s,p.mains[s].stat]))};
   const runes=ctx.inventory.runes.filter(r=>ctx.inventory.allowed(r,job.unit)&&(!ctx.pins.has(r.id)||ctx.pins.get(r.id)===job.config.key)&&(!p.pins[r.slot]||p.pins[r.slot]===r.id));
   const available={...ctx.account,runes,units:[job.unit]},options={...ctx.options,respectLocks:false,strictMode:false,combat:ctx.team};
   const passes=required.length||Object.values(p.mains).some(r=>r.required)?2:1;
   const localRunes=runes.filter(r=>!ctx.jobs.some(j=>j.unit.id!==job.unit.id&&j.unit.runeIds.includes(r.id)));
   const local=generateCandidates({...available,runes:localRunes},job.unit,c,options,new Set()).candidates;
   const generated=generateCandidates(available,job.unit,c,options,new Set(),(pass,total)=>progress({percent:Math.round((index+(Number(relaxed)+pass/total)/passes)/ctx.jobs.length*65),stage:'candidates',unit:job.unit.name})).candidates;
   const candidates=[...local,...generated];
   for(const candidate of candidates){if(canUse(ctx,job,candidate.runeIds)){const build=exactBuild(ctx,job,candidate.runeIds);all.push({...build,assessment:assessment(ctx,job,build)});}}
  }
  if(job.unit.runeIds.length===6&&canUse(ctx,job,job.unit.runeIds)){const b=exactBuild(ctx,job,job.unit.runeIds);all.push({...b,assessment:assessment(ctx,job,b)});}
  const seen=new Set(),unique=all.filter(b=>{const key=[...b.runeIds].sort((a,b)=>a-b).join(',');if(seen.has(key))return false;seen.add(key);return true;});
  const selected=new Map(),own=unique.find(b=>b.runeIds.length===job.unit.runeIds.length&&b.runeIds.every(id=>job.unit.runeIds.includes(id)));if(own)selected.set([...own.runeIds].sort((a,b)=>a-b).join(','),own);const take=(items,n)=>items.slice(0,n).forEach(b=>selected.set([...b.runeIds].sort((a,b)=>a-b).join(','),b));
  take(unique.sort((a,b)=>a.assessment.hard-b.assessment.hard||a.assessment.hardDeficit-b.assessment.hardDeficit||b.assessment.utility-a.assessment.utility),20);
  take([...unique].sort((a,b)=>b.stats.combat.spd-a.stats.combat.spd),8);
  take([...unique].sort((a,b)=>a.stats.combat.spd-b.stats.combat.spd),4);
  take([...unique].sort((a,b)=>a.assessment.soft-b.assessment.soft||b.assessment.utility-a.assessment.utility),8);
  return [...selected.values()].slice(0,MAX_POOL);
 });
}
export function balanceTiming(team,builds){
 const byKey=new Map(builds.map(b=>[b.key,b]));const configs=team.configs.filter(c=>c.enabled!==false&&byKey.has(c.key));
 if(!configs.length)return {orderMet:false,links:[],referenceSpeed:0,automaticReference:false,preview:{complete:false,actors:[],turns:[],cut:null}};
 const actors=configs.map(c=>{
  const b=byKey.get(c.key),combat=b.stats.combat,counts=b.counts||{};
  return {key:c.key,master:combat.master??c.masterId,name:c.label,spd:combat.spd,rawSpd:combat.rawSpd,combat:c.combat,
   effects:b.effects??combat.effects??c.snapshotArtifactEffects,attributes:combat,will:(counts[15]||0)>=2,nemesisSets:Math.floor((counts[14]||0)/2)};
 });
 const {scenario,referenceSpeed,referenceEnemy}=simulateTeamCombat(team,actors,{captureReadiness:true});
 const turns=scenario.firstTurns.filter(t=>actors.some(a=>a.key===t.key)),order=configs.map(c=>c.key),orderMet=order.length===turns.length&&order.every((key,i)=>turns[i].key===key&&!turns[i].disabled);
 const links=configs.slice(1).map((c,i)=>{
  const a=configs[i],left=scenario.turns.findIndex(t=>t.key===a.key),right=scenario.turns.findIndex(t=>t.key===c.key),mode=balanceLinkMode(team,a.key,c.key);
  const gap=left>=0&&right>left?scenario.turns[right].tick-scenario.turns[left].tick:1000,interruptions=left>=0&&right>left?right-left-1:1000;
  return {left:a.key,right:c.key,mode,met:left>=0&&right===left+1&&!scenario.turns[right].disabled,gap,interruptions};
 });
 return {orderMet,links,referenceSpeed,automaticReference:referenceEnemy>0,preview:{complete:actors.length===configs.length,actors,turns:scenario.firstTurns,scenario,cut:scenario.cut}};
}
function evaluate(ctx,builds){
 const assessed=builds.map((b,i)=>assessment(ctx,ctx.jobs[i],b)),timing=balanceTiming(ctx.team,builds),strict=timing.links.filter(l=>l.mode==='strict'&&!l.met);
 const hard=assessed.reduce((n,a)=>n+a.hard,0)+strict.length+(timing.orderMet?0:1),hardDeficit=assessed.reduce((n,a)=>n+a.hardDeficit,0)+strict.reduce((n,l)=>n+Math.min(5,l.interruptions+Math.max(0,l.gap-1)/10),0)+(timing.orderMet?0:5);
 const proximity=timing.links.filter(l=>l.mode==='near').reduce((n,l)=>n+Math.min(3,l.interruptions*.25+Math.max(0,l.gap-1)/10),0)/Math.max(1,timing.links.length),soft=assessed.reduce((n,a)=>n+a.soft,0)/builds.length,utility=assessed.reduce((n,a)=>n+a.utility,0)/builds.length;
 return {builds,checks:Object.fromEntries(ctx.jobs.map((j,i)=>[j.config.key,assessed[i].checks])),timing,hard,hardDeficit,proximity,soft,utility,eligible:hard===0};
}
const rank=(a,b,emphasis=1)=>a.hard-b.hard||a.hardDeficit-b.hardDeficit||((b.utility-b.soft*.15-b.proximity*.35*emphasis)-(a.utility-a.soft*.15-a.proximity*.35*emphasis));
export function searchTeamBalance(account,team,options={},reservedIds=[],allTeams=[],onProgress=()=>{}){
 const started=Date.now(),ctx=context(account,team,options,reservedIds,allTeams),pools=candidatePools(ctx,p=>onProgress(p)),jobs=ctx.jobs.map((j,index)=>({index,count:pools[index].length})).sort((a,b)=>a.count-b.count),states=[];
 const baselineBuilds=ctx.jobs.map(j=>j.unit.runeIds.length===6?exactBuild(ctx,j,j.unit.runeIds):null);const baseline=baselineBuilds.every(Boolean)?evaluate(ctx,baselineBuilds):null;
 for(const emphasis of [.35,1,2.5]){
  let beam=[{builds:[],used:new Set(),hard:0,deficit:0,value:0}];
  for(const job of jobs){const next=[];for(const state of beam)for(const b of pools[job.index]){if(b.runeIds.some(id=>state.used.has(id)))continue;const a=b.assessment,builds=state.builds.slice();builds[job.index]=b;next.push({builds,used:new Set([...state.used,...b.runeIds]),hard:state.hard+a.hard,deficit:state.deficit+a.hardDeficit,value:state.value+a.utility-a.soft*.15+(emphasis<1?b.stats.combat.spd/150*.15:0)});}const inversions=s=>s.builds.reduce((n,b,i)=>n+s.builds.slice(i+1).filter(next=>next&&b.stats.combat.spd<next.stats.combat.spd).length,0);next.sort((a,b)=>a.hard-b.hard||a.deficit-b.deficit||(b.value-inversions(b))-(a.value-inversions(a)));beam=next.slice(0,WIDTH);if(!beam.length)break;}
  states.push(...beam);
 }
 const seen=new Set(),evaluated=[];let checked=0;
 function consider(builds){const id=builds.map(b=>[...b.runeIds].sort((a,b)=>a-b).join(',')).join('|');if(seen.has(id))return;seen.add(id);const result=evaluate(ctx,builds);evaluated.push({...result,id});checked++;onProgress({percent:65+Math.round(Math.min(1,checked/Math.max(1,states.length))*34),stage:'teams',checked});}
 for(const state of states.slice(0,MAX_EVALUATIONS))if(state.builds.filter(Boolean).length===ctx.jobs.length)consider(state.builds);
 if(baselineBuilds.every((b,i)=>b&&canUse(ctx,ctx.jobs[i],b.runeIds))&&new Set(baselineBuilds.flatMap(b=>b.runeIds)).size===baselineBuilds.length*6)consider(baselineBuilds);
 const baselineId=baseline?baseline.builds.map(b=>[...b.runeIds].sort((a,b)=>a-b).join(',')).join('|'):null;
 const useful=evaluated.filter(p=>p.id!==baselineId&&(!baseline||[.35,1,2.5].some(emphasis=>rank(p,baseline,emphasis)<-1e-8)));
 const choices=useful.some(p=>p.eligible)?useful.filter(p=>p.eligible):useful;choices.sort((a,b)=>rank(a,b));const alternatives=[],ids=new Set();const outcome=p=>JSON.stringify(p.builds.map(b=>[b.stats.total,b.stats.combat.spd,b.counts]));
 for(const emphasis of [1,.35,2.5]){const best=[...choices].sort((a,b)=>rank(a,b,emphasis)).find(p=>!ids.has(outcome(p)));if(best){ids.add(outcome(best));alternatives.push(best);}}
 onProgress({percent:100,stage:'done',checked});
 return {signature:balanceSignature(account,team,options,reservedIds,allTeams),baseline,alternatives,checked,candidateCount:pools.reduce((n,p)=>n+p.length,0),elapsed:Date.now()-started,bounded:true};
}
export function balanceTeamForProposal(team,proposal){return {...quickCombatTeam(team),speedMode:'snapshot',configs:team.configs.map(c=>{const b=proposal.builds.find(b=>b.key===c.key);if(!b)return c;const counts=b.counts,sets=Object.entries(counts).flatMap(([id,n])=>Array(Math.floor(n/(FOUR.has(Number(id))?4:2))).fill(Number(id)));return {...c,unitId:b.unitId,masterId:b.master,label:b.name,sets,manual:{base:{...b.base},sheet:{...b.stats.total}},snapshotArtifactEffects:clone(b.effects),syncMinimum:null,syncCombatTarget:null,autoSpeed:false};}),plannedRunes:{accountStamp:team.plannedRunes?.accountStamp||'',byConfig:Object.fromEntries(proposal.builds.map(b=>[b.key,[...b.runeIds]]))}};}
export function validateBalanceProposal(account,team,options,reservedIds,allTeams,signature,proposal){
 if(signature!==balanceSignature(account,team,options,reservedIds,allTeams))throw new Error('As regras ou o inventário mudaram. Faça uma nova busca.');
 const ctx=context(account,team,options,reservedIds,allTeams);if(!Array.isArray(proposal?.builds)||proposal.builds.length!==ctx.jobs.length)throw new Error('A alternativa não corresponde ao time atual. Faça uma nova busca.');const used=new Set(),builds=ctx.jobs.map(job=>{const b=proposal?.builds?.find(b=>b.key===job.config.key&&b.unitId===job.unit.id);if(!b||!canUse(ctx,job,b.runeIds)||b.runeIds.some(id=>used.has(id)))throw new Error('A alternativa usa peças indisponíveis ou repetidas. Faça uma nova busca.');b.runeIds.forEach(id=>used.add(id));return exactBuild(ctx,job,b.runeIds);});
 const checked=evaluate(ctx,builds);if(!checked.eligible)throw new Error('Esta aproximação não atende às exigências obrigatórias. Ajuste as regras antes de aplicar.');
 const plan=balanceTeamForProposal(team,checked);plan.plannedRunes.accountStamp=accountStamp(account);return plan;
}

export function balanceCurrentTiming(team){
 const normalized=quickCombatTeam(team);if(team.configs.some(c=>!c.masterId))return null;
 const builds=team.configs.map(c=>{const counts={};for(const id of c.sets||[])if(id)counts[id]=(counts[id]||0)+(FOUR.has(id)?4:2);const stats={total:c.manual.sheet};stats.combat=combatAttributes({master:c.masterId,element:c.masterId%10,base:c.manual.base},stats,counts,normalized,c.combat,c.snapshotArtifactEffects);return {key:c.key,stats,counts,effects:c.snapshotArtifactEffects};});
 return balanceTiming(normalized,builds);
}
