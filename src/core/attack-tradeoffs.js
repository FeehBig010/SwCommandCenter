import {resolveSwexAttackLoadout,assertSwexAttackRunes} from './swex-attack-loadout.js';
import {isPriority} from './allocation.js';
import {assertMainPool} from './equipment-pools.js';
import {STATS,FOUR,SETS,DEFAULT_OPTIONS} from './data.js';
import {generateCandidates,equippedBuild,calculateStats,setCounts,artifactBonus} from './optimizer.js';
import {artifactEffects} from './artifacts.js';
import {combatAttributes,scenarioForTeam,simulateCombat} from './speedTuner.js';
import {estimateRealDamage} from './damage.js';
import {lockContext} from './locks.js';
import {runeConflictApplies} from './siege-central.js';
import {accountStamp,plannedReservations,currentRuneIds} from './loadouts.js';
import {resolveAttackRunePolicy} from './attack-improvement-policy.js';
import {requiredAttackSets,validateAttackSetsCapacity} from './attack-improvement-sets.js';
import {validateAttackFunctionalSync} from './attack-functional-sync.js';
import {makeAttackEquipChecklist,compareAttackProposals} from './attack-equip-checklist.js';

const FIELDS=['hp','atk','def','spd','cr','cd','res','acc'];
const EPS=1e-8;
const DEPTH_LIMITS={
 fast:{maxCandidates:24,beamWidth:64,maxTimings:3000},
 balanced:{maxCandidates:36,beamWidth:96,maxTimings:6000},
 deep:{maxCandidates:48,beamWidth:144,maxTimings:12000}
};
export function tradeoffSettings(raw={}){
 const focus=raw.focus||'spd',maxLoss=Number(raw.maxLoss??20);
 const strategy=raw.strategy||'legacy';
 const depth=['fast','balanced','deep'].includes(raw.depth)?raw.depth:'balanced';
 if(!['legacy','improve-preset'].includes(strategy))throw new Error('Escolha uma estratégia válida (legacy ou improve-preset).');
 if(!['spd','ehp','damage'].includes(focus)||!Number.isFinite(maxLoss)||maxLoss<0||maxLoss>50)throw new Error('Escolha SPD, EHP ou Dano e um sacrifício entre 0% e 50%.');
 return {focus,maxLoss,strategy,depth};
}
function fingerprint(value){const text=JSON.stringify(value);let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return `${text.length}:${hash>>>0}`;}
export function tradeoffSignature(account,team,options,blocked,settings){return fingerprint([account,team,options,[...blocked].sort((a,b)=>a-b),settings]);}
export function buildMetrics(build){
 const s=build.stats.total,c=build.stats.combat;
 return {...Object.fromEntries(FIELDS.map(k=>[k,k==='spd'?c.spd:s[k]])),ehp:c.hp*(1140+3.5*c.def)/1000,damage:build.stats.damage?.total??c.atk*(1+Math.min(100,c.cr)/100*c.cd/100)};
}
const relative=(after,before)=>(after-before)/Math.max(1,before);
const lossless=(next,old)=>[...FIELDS,'ehp','damage'].every(k=>next[k]+EPS>=old[k]);
const changed=(next,old)=>[...FIELDS,'ehp','damage'].some(k=>next[k]>old[k]+EPS);
const score=(next,old,settings)=>relative(next[settings.focus],old[settings.focus])-.15*FIELDS.reduce((n,k)=>n+Math.max(0,-relative(next[k],old[k])),0);
const withinLoss=(next,old,settings)=>[...FIELDS,'ehp','damage'].every(k=>relative(next[k],old[k])+EPS>=-settings.maxLoss/100);
function requirements(config,build){
 const required={};for(const id of config.sets?.filter(Boolean)||[])required[id]=(required[id]||0)+1;
 for(const [id,n]of Object.entries(build.counts))required[id]=Math.max(required[id]||0,Math.floor(n/(FOUR.has(Number(id))?4:2)));
 return Object.entries(required).flatMap(([id,n])=>Array(n).fill(Number(id)));
}
function priorityReservations(account,teams,exceptId){
 const protectedIds=new Set(),owners=new Set();
 for(const team of teams.filter(t=>t.id!==exceptId&&t.active!==false&&isPriority(t)))for(const c of team.configs||[]){
  if(c.enabled===false)continue;owners.add(c.unitId);const original=account.units.find(u=>u.id===c.unitId);if(!original)continue;
  const {unit}=resolveSwexAttackLoadout(account,team,original);for(const id of currentRuneIds(account,team,c,unit))protectedIds.add(id);
 }
 // Ownership remains authoritative protection even with incomplete unit references.
 for(const rune of account.runes)if(owners.has(rune.owner))protectedIds.add(rune.id);
 return [...protectedIds];
}
function setsValid(counts,sets){const req={};for(const id of sets)req[id]=(req[id]||0)+(FOUR.has(id)?4:2);return Object.entries(req).every(([id,n])=>(counts[id]||0)>=n);}
function buildActor(job,build){const c=build.stats.combat;return {key:job.config.key,unitId:job.unit.id,master:job.unit.master,name:job.unit.name,spd:c.spd,rawSpd:c.rawSpd,attributes:c,combat:job.config.combat,effects:job.effects,will:(build.counts[15]||0)>=2,nemesisSets:Math.floor((build.counts[14]||0)/2)};}
function timing(context,builds){
 const actors=context.jobs.map((job,i)=>buildActor(job,builds[i])),configured=scenarioForTeam(context.team,actors);
 if(!configured.actors.some(a=>a.enemy)&&Number(context.team.enemyCombatSpd)>0)configured.actors.push({key:'__enemy__',name:'Inimigo',spd:Number(context.team.enemyCombatSpd),enemy:true});
 const scenario=simulateCombat(configured.actors,{events:configured.events,stopAfterFirst:true,captureReadiness:true}),allies=new Set(actors.map(a=>a.key));
 const turns=scenario.firstTurns.filter(t=>allies.has(t.key)),ready=scenario.firstReady.filter(t=>allies.has(t.key));
 return {actors,turns:scenario.firstTurns,scenario,order:turns.map(t=>t.key),action:Object.fromEntries(turns.map(t=>[t.key,t.tick])),ready:Object.fromEntries(ready.map(t=>[t.key,t.tick])),enemyBefore:Object.fromEntries(turns.map(t=>[t.key,scenario.turns.slice(0,scenario.turns.indexOf(t)).filter(t=>t.enemy).length]))};
}
export function tradeoffTimingValid(next,baseline,configs,context=null){
 if(context?.settings?.strategy==='improve-preset'){
  const enemyScenarioKnown=Number(context.team?.enemyCombatSpd)>0||Boolean(baseline?.scenario?.turns?.some(t=>t.enemy));
  return validateAttackFunctionalSync(next,baseline,{confirmedOrderKeys:context.team?.confirmedTurnOrderKeys,configs,enemyScenarioKnown}).valid;
 }
 return next.order.length===configs.length&&JSON.stringify(next.order)===JSON.stringify(baseline.order)&&configs.every(c=>Number.isInteger(next.action[c.key])&&Number.isInteger(next.ready[c.key])&&next.action[c.key]<=baseline.action[c.key]&&next.ready[c.key]<=baseline.ready[c.key]&&next.enemyBefore[c.key]<=baseline.enemyBefore[c.key]&&(!Number(c.maxTick)||next.action[c.key]<=Number(c.maxTick))&&(!Number(c.combat?.targetTick)||next.action[c.key]<=Number(c.combat.targetTick)));
}
function contextFor(account,team,rawOptions,reservedIds,allTeams,rawSettings){
 if(!account)throw new Error('Importe seu JSON SWEX antes de buscar alternativas.');
 assertMainPool([team],rawOptions);
 if(team.mode!=='attack'||team.gameMode==='rta'||![3,4,5,6].includes(team.configs?.length)||team.configs.some(c=>c.enabled===false))throw new Error('Selecione um time de ataque completo, com todos os slots ativos.');
 if(new Set(team.configs.map(c=>c.key)).size!==team.configs.length||new Set(team.configs.map(c=>c.unitId)).size!==team.configs.length)throw new Error('Use uma cópia distinta da sua conta em cada slot.');
 const settings=tradeoffSettings(rawSettings),options={...DEFAULT_OPTIONS,...rawOptions,maxGrindsGems:false};
 const blocked=settings.strategy==='improve-preset'
  ?resolveAttackRunePolicy(account,team,allTeams,options,reservedIds).blockedRuneIds
  :new Set([...priorityReservations(account,allTeams,team.id),...reservedIds,...(options.blockedRuneIds||[]),...plannedReservations(allTeams.filter(t=>['siege','gvg'].includes(t.gameMode||'siege')&&runeConflictApplies(t,account)),account,team.id)]);
 const locks=lockContext(account,options),byId=new Map(account.runes.map(r=>[r.id,r]));
 const loadouts=new Map(team.configs.map(config=>{const original=account.units.find(u=>u.id===config.unitId);if(!original)throw new Error('Selecione uma unidade do seu SWEX para cada slot.');return [original.id,resolveSwexAttackLoadout(account,team,original)];}));
 const baselineAccount={...account,units:account.units.map(u=>loadouts.get(u.id)?.unit||u)};
 const resolvedLocks=lockContext(baselineAccount,options);resolvedLocks.runes.forEach(id=>locks.runes.add(id));
 const fixedOwners=new Map();for(const u of account.units)if(locks.units.has(u.id))for(const id of u.runeIds||[])fixedOwners.set(id,u.id);
 for(const rune of account.runes)if(rune.owner&&(locks.units.has(rune.owner)||options.respectLocks&&rune.locked))fixedOwners.set(rune.id,rune.owner);
 const context={account:baselineAccount,team:{...team,plannedRunes:null},options,settings,blocked,locks,fixedOwners,byId,jobs:[]};
 const baselineUsed=new Map();
 for(const config of team.configs){
  const loadout=loadouts.get(config.unitId),unit=loadout.unit;assertSwexAttackRunes(loadout,byId,baselineUsed);
  const baseline=equippedBuild(baselineAccount,{...team,plannedRunes:null},config,options);if(!baseline)throw new Error(`${unit.name}: não foi possível calcular a ficha com o equipamento do SWEX. Reimporte o arquivo completo.`);
  if(Object.keys(baseline.counts).some(id=>Number(id)===25||!SETS[id]))throw new Error('Este diagnóstico não modela Intangible ou conjuntos desconhecidos. A build atual foi mantida.');
  if(config.combat?.disabled||Number(config.combat?.hpPercent??100)<=0)throw new Error('Remova o estado de incapacidade ou HP zerado antes de comparar a ordem de ataque.');
  if(Number(config.maxTick)>0&&!Number.isInteger(Number(config.maxTick)))throw new Error('Use Ticks inteiros nos prazos de ação.');
  const sets=settings.strategy==='improve-preset'?requiredAttackSets(config,baseline,settings.strategy):requirements(config,baseline);
  validateAttackSetsCapacity(sets);
  const effects=artifactEffects(baselineAccount,unit,options.artifacts!==false&&config.artifacts!==false),flat=options.artifacts!==false&&config.artifacts!==false?artifactBonus(baselineAccount,unit):{};
  context.jobs.push({config,unit,baseline,source:loadout.source,metrics:buildMetrics(baseline),sets,effects,flat});
 }
 context.team.configs=context.team.configs.map((c,i)=>({...c,masterId:context.jobs[i].unit.master}));
 context.baseline=timing(context,context.jobs.map(j=>j.baseline));
 if(context.baseline.order.length!==team.configs.length||team.configs.some(c=>!Number.isInteger(context.baseline.ready[c.key])))throw new Error('O cenário atual não registra uma primeira ação para todos os monstros. Revise os eventos de combate.');
 context.signature=tradeoffSignature(account,team,options,blocked,settings);return context;
}
function allowedGear(context,job,ids){
 if(!Array.isArray(ids)||ids.length!==6||new Set(ids).size!==6)return false;
 const runes=ids.map(id=>context.byId.get(id));if(runes.some(r=>!r||r.slot<1||r.slot>6)||new Set(runes.map(r=>r.slot)).size!==6)return false;
 if(context.locks.units.has(job.unit.id)&&JSON.stringify([...ids].sort((a,b)=>a-b))!==JSON.stringify([...job.unit.runeIds].sort((a,b)=>a-b)))return false;
 for(const rune of runes){
  const own=job.unit.runeIds.includes(rune.id);
  if(context.fixedOwners.has(rune.id)&&context.fixedOwners.get(rune.id)!==job.unit.id)return false;
  if(context.blocked.has(rune.id)||rune.pool==='rta'||rune.set===25||!SETS[rune.set]||!own&&rune.level<context.options.minLevel||!own&&rune.owner&&!context.options.equipped&&context.settings.strategy!=='improve-preset'||!own&&(context.locks.runes.has(rune.id)||context.options.respectLocks&&rune.locked)||Number(job.config.mains?.[rune.slot])&&rune.main[0]!==Number(job.config.mains[rune.slot]))return false;
 }
 for(const id of job.unit.runeIds){const r=context.byId.get(id);if((context.locks.runes.has(id)||context.options.respectLocks&&r?.locked)&&!ids.includes(id))return false;}
 return setsValid(setCounts(runes),job.sets);
}
function exactBuild(context,job,ids){
 const runes=ids.map(id=>context.byId.get(id)),counts=setCounts(runes),stats=calculateStats(job.unit,runes,job.flat);
 stats.combat={...combatAttributes(job.unit,stats,counts,context.team,job.config.combat,job.effects),effects:job.effects.totals};
 if(job.config.damage?.enabled)stats.damage={total:estimateRealDamage(job.unit,stats,job.config.damage,job.effects).total};
 return {key:job.config.key,teamId:context.team.id,unitId:job.unit.id,name:job.unit.name,runeIds:[...ids],counts,stats};
}
function unitCandidates(context,job,progress){
 const strictSets=Boolean(job.sets?.length);
 const config={...job.config,goals:Object.fromEntries(STATS.map(k=>[k,''])),focuses:[],matchTarget:null,rawPower:true,strictSets,sets:job.sets,combatSpd:Math.max(1,job.metrics.spd*(1-context.settings.maxLoss/100)),objective:{spd:'spd',ehp:'hp',damage:'damage'}[context.settings.focus]};
 const available={...context.account,runes:context.account.runes.filter(r=>!context.blocked.has(r.id)&&(context.settings.strategy==='improve-preset'||context.options.equipped||!r.owner||job.unit.runeIds.includes(r.id)))};
 const searchOptions={...context.options,depth:'fast',equipped:true,maxGrindsGems:false,combat:context.team};
 const guarded={...config,basis:'total',goals:{...job.baseline.stats.total},combatSpd:job.metrics.spd};
 const superior=generateCandidates(available,job.unit,guarded,{...searchOptions,strictMode:strictSets},context.blocked,(pass,total)=>progress(pass,total*2)).candidates;
 const generated=[...superior,...generateCandidates(available,job.unit,config,{...searchOptions,strictMode:false},context.blocked,(pass,total)=>progress(total+pass,total*2)).candidates];
 const unique=new Map();
 function take(ids){if(!allowedGear(context,job,ids))return;const build=exactBuild(context,job,ids),metrics=buildMetrics(build);if(!withinLoss(metrics,job.metrics,context.settings))return;const key=[...ids].sort((a,b)=>a-b).join(',');unique.set(key,{build,metrics,score:score(metrics,job.metrics,context.settings),pareto:lossless(metrics,job.metrics)});}
 take(job.baseline.runeIds);for(const candidate of generated)take(candidate.runeIds);
 // Nearby one-rune exchanges preserve inexpensive, practical alternatives that
 // a multi-slot beam may overlook. Bound this exact neighborhood to 24 per slot.
 const statWeight={spd:{8:10},ehp:{1:.01,2:1,5:.02,6:1},damage:{3:.02,4:1,9:1,10:1}}[context.settings.focus];
 const rank=r=>[r.main,r.innate,...r.subs].reduce((sum,e)=>sum+(statWeight[e?.[0]]||0)*(Number(e?.[1]||0)+Number(e?.[3]||0)),0);
 for(let slot=1;slot<=6;slot++){
  const old=job.baseline.runeIds.find(id=>context.byId.get(id)?.slot===slot),pool=context.account.runes.filter(r=>r.slot===slot&&!context.blocked.has(r.id)&&(!Number(config.mains?.[slot])||r.main[0]===Number(config.mains[slot]))).sort((a,b)=>rank(b)-rank(a)||a.id-b.id).slice(0,24);
  for(const rune of pool)take(job.baseline.runeIds.map(id=>id===old?rune.id:id));
 }
 const rows=[...unique.values()].sort((a,b)=>b.score-a.score),selected=new Map(),put=row=>{if(row)selected.set([...row.build.runeIds].sort((a,b)=>a-b).join(','),row);};
 const baseline=rows.find(r=>r.build.runeIds.every(id=>job.baseline.runeIds.includes(id)));put(baseline);rows.filter(r=>r.pareto).slice(0,8).forEach(put);rows.slice(0,16).forEach(put);
 const speeds=rows.slice().sort((a,b)=>a.metrics.spd-b.metrics.spd);for(let i=0;i<8;i++)put(speeds[Math.round(i*(speeds.length-1)/7)]);
 const limits=DEPTH_LIMITS[context.settings.depth]||DEPTH_LIMITS.balanced;
 for(const row of rows){if(selected.size>=limits.maxCandidates)break;put(row);}return [...selected.values()].slice(0,limits.maxCandidates);
}
const percent=n=>fmt(n,Math.min(5,Math.max(1,Math.ceil(-Math.log10(Math.abs(n)||1))+1)));
const fmt=(n,decimals=0)=>n.toLocaleString('pt-BR',{maximumFractionDigits:decimals});
const LABEL={hp:'HP',atk:'ATK',def:'DEF',spd:'SPD de combate',cr:'TC',cd:'DC',res:'RES',acc:'ACC'};
export function tradeoffNarrative(before,after,focus,damageMode='potential'){
 const gains=FIELDS.filter(k=>after[k]>before[k]+EPS),losses=FIELDS.filter(k=>after[k]+EPS<before[k]);
 const describe=k=>`${fmt(Math.abs(after[k]-before[k]))}${['cr','cd','res','acc'].includes(k)?' p.p.':''} ${LABEL[k]}`;
 let gain=focus==='ehp'&&after.ehp>before.ehp?`+${percent(relative(after.ehp,before.ehp)*100)}% EHP`:focus==='damage'&&after.damage>before.damage?`+${percent(relative(after.damage,before.damage)*100)}% ${damageMode==='scenario'?'dano estimado':'potencial de dano'}`:null;
 if(gain&&focus==='damage'&&gains.includes('cd'))gain+=` (+${describe('cd')})`;
 if(!gain){const ranked=gains.sort((a,b)=>(b===focus)-(a===focus)||relative(after[b],before[b])-relative(after[a],before[a]));gain=ranked.length?`+${describe(ranked[0])}`:null;}
 return gain?`Ganho de ${gain}${losses.length?` sacrificando ${losses.map(describe).join(', ')}`:' sem perda de atributos'}.`:losses.length?`Cede ${losses.map(describe).join(', ')} para a distribuição do time.`:'Sem alteração de atributos.';
}
function proposalFor(context,rows,clock){
 const builds=rows.map(r=>r.build),pareto=rows.every(r=>r.pareto),focusGain=rows.reduce((n,r,i)=>n+relative(r.metrics[context.settings.focus],context.jobs[i].metrics[context.settings.focus]),0);
 if(!rows.some((r,i)=>changed(r.metrics,context.jobs[i].metrics))||!pareto&&focusGain<=EPS)return null;
 const enemyScenarioKnown=Number(context.team?.enemyCombatSpd)>0||Boolean(clock.scenario?.turns?.some(t=>t.enemy));
 const certainty=enemyScenarioKnown?'scenario':'partial';
 const baselineBuilds=context.jobs.map(j=>({key:j.config.key,unitId:j.unit.id,name:j.unit.name,runeIds:[...j.baseline.runeIds]}));
 const checklist=makeAttackEquipChecklist(context.account,context.team,baselineBuilds,builds);
 return {id:fingerprint(builds.map(b=>b.runeIds)),pareto,certainty,score:rows.reduce((n,r)=>n+r.score,0),focusGain,swapCount:checklist.swapCount,checklist,builds,members:rows.map((row,i)=>{const job=context.jobs[i];return {key:job.config.key,name:job.unit.name,master:job.unit.master,source:job.source,before:job.metrics,after:row.metrics,beforeTick:context.baseline.ready[job.config.key],tick:clock.ready[job.config.key],actionTick:clock.action[job.config.key],sets:job.sets,narrative:tradeoffNarrative(job.metrics,row.metrics,context.settings.focus,job.config.damage?.enabled?'scenario':'potential'),transfers:row.build.runeIds.flatMap(id=>{const rune=context.byId.get(id);return rune.owner&&rune.owner!==job.unit.id?[{runeId:id,from:context.account.units.find(u=>u.id===rune.owner)?.name||`Unidade #${rune.owner}`,fromUnitId:rune.owner}]:[];})};}),preview:{complete:true,actors:clock.actors,turns:clock.turns,scenario:clock.scenario}};
}
export function diagnoseAttackTradeoffs(account,team,options={},reservedIds=[],allTeams=[team],rawSettings={},onProgress=()=>{}){
 if(options.signal?.aborted)throw new Error('Busca cancelada pelo usuário.');
 const started=Date.now(),context=contextFor(account,team,options,reservedIds,allTeams,rawSettings);
 const limits=DEPTH_LIMITS[context.settings.depth]||DEPTH_LIMITS.balanced;
 const pools=context.jobs.map((job,i)=>{
  if(options.signal?.aborted)throw new Error('Busca cancelada pelo usuário.');
  return unitCandidates(context,job,(pass,total)=>onProgress({percent:Math.round((i+pass/total)/context.jobs.length*70),message:`Comparando runas de ${job.unit.name}…`}));
 });
 const result={signature:context.signature,settings:context.settings,current:context.jobs.map(j=>({key:j.config.key,name:j.unit.name,metrics:j.metrics,sets:j.sets,source:j.source})),proposals:[],scope:'bounded-real-runes-no-projected-crafts',elapsed:0,checked:0,limited:false};
 if(pools.some(p=>!p.length))return {...result,status:'none',message:'Nenhuma distribuição disponível com estes conjuntos, slots, bloqueios e limite de sacrifício.',elapsed:Date.now()-started};
 let beam=[{rows:[],used:new Set(),score:0,pareto:true}],final=[];
 outer:for(let index=0;index<context.jobs.length;index++){
  if(options.signal?.aborted)throw new Error('Busca cancelada pelo usuário.');
  const next=[];
  for(const state of beam)for(const row of pools[index]){
   if(row.build.runeIds.some(id=>state.used.has(id)))continue;
   const rows=[...state.rows,row],entry={rows,used:new Set([...state.used,...row.build.runeIds]),score:state.score+row.score,pareto:state.pareto&&row.pareto};
   if(index===context.jobs.length-1){
    if(result.checked>=limits.maxTimings){result.limited=true;break outer;}result.checked++;
    if(!rows.some((r,i)=>changed(r.metrics,context.jobs[i].metrics)))continue;
    const clock=timing(context,rows.map(r=>r.build));if(!tradeoffTimingValid(clock,context.baseline,context.team.configs,context))continue;
    const proposal=proposalFor(context,rows,clock);if(proposal)final.push(proposal);
   }else next.push(entry);
  }
  next.sort((a,b)=>b.score-a.score);const retained=new Map(),put=s=>{if(s)retained.set(s.rows.map(r=>r.build.runeIds.join(',')).join('|'),s);};
  // Retain safe no-sacrifice branches and the current partial allocation alongside
  // priority-ranked trades; otherwise resource competition can erase all safe paths.
  next.filter(s=>s.pareto).slice(0,24).forEach(put);put(next.find(s=>s.rows.every((r,i)=>r.build.runeIds.every(id=>context.jobs[i].baseline.runeIds.includes(id)))));
  for(const state of next){if(retained.size>=limits.beamWidth)break;put(state);}beam=[...retained.values()];
  onProgress({percent:70+Math.round((index+1)/context.jobs.length*29),message:'Validando a distribuição conjunta e os Ticks…'});
 }
 const superior=final.filter(p=>p.pareto),ranked=final.slice().sort(compareAttackProposals),seen=new Set();
 result.proposals=ranked.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;}).slice(0,3);
 return {...result,status:result.proposals.length?(superior.length?'superior':'tradeoffs'):'none',message:result.proposals.length?(superior.length?'Melhorias sem sacrifício encontradas.':'Alternativas com sacrifícios explícitos.'): 'Nenhuma alternativa encontrada nesta busca limitada preservando os conjuntos e a ordem atual.',elapsed:Date.now()-started};
}
export function validateAttackTradeoff(account,team,options,reservedIds,allTeams,settings,signature,proposal){
 const context=contextFor(account,team,options,reservedIds,allTeams,settings);
 if(signature!==context.signature)throw new Error('O time, o inventário ou as reservas mudaram. Faça uma nova busca.');
 if(!Array.isArray(proposal?.builds)||proposal.builds.length!==context.jobs.length)throw new Error('Distribuição inválida. Faça uma nova busca.');
 const used=new Set(),rows=context.jobs.map(job=>{const source=proposal.builds.find(b=>b.key===job.config.key&&b.unitId===job.unit.id);if(!source||!allowedGear(context,job,source.runeIds)||source.runeIds.some(id=>used.has(id)))throw new Error('Uma runa está indisponível, repetida ou viola os conjuntos obrigatórios.');source.runeIds.forEach(id=>used.add(id));const build=exactBuild(context,job,source.runeIds),metrics=buildMetrics(build);if(!withinLoss(metrics,job.metrics,context.settings))throw new Error('O sacrifício excede o limite da busca.');return {build,metrics,score:score(metrics,job.metrics,context.settings),pareto:lossless(metrics,job.metrics)};});
 const clock=timing(context,rows.map(r=>r.build));if(!tradeoffTimingValid(clock,context.baseline,context.team.configs,context)||!proposalFor(context,rows,clock))throw new Error('A alternativa não preserva os Ticks e a ordem atual ou deixou de ser uma melhoria.');
 return {accountStamp:accountStamp(account),byConfig:Object.fromEntries(rows.map(r=>[r.build.key,r.build.runeIds])),appliedAt:new Date().toISOString(),source:'attack-tradeoff'};
}
export function searchAttackImprovements(account,team,options={},reservedIds=[],allTeams=[team],rawSettings={},onProgress=()=>{}){
 const settings={...rawSettings,strategy:'improve-preset',depth:['fast','balanced','deep'].includes(rawSettings.depth)?rawSettings.depth:'balanced'};
 return diagnoseAttackTradeoffs(account,team,options,reservedIds,allTeams,settings,onProgress);
}
export { makeAttackEquipChecklist, compareAttackProposals };
