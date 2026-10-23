import {assertMainPool} from './equipment-pools.js';
import {lockContext} from './locks.js';
import {GOAL_PRESETS,normalizeFocuses} from './team-ux.js';
import {currentRuneIds} from './loadouts.js';
import {allocationScore,compareAllocation,isPriority} from './allocation.js';
import {combatAttributes,simulateFirstTurns,simulateCombat,scenarioForTeam,missingDefenseConditions} from './speedTuner.js';
import {artifactEffects,normalizeArtifactSubstats} from './artifacts.js';
import {estimateRealDamage,normalizeDamageSettings} from './damage.js';
export {artifactEffects,normalizeArtifactSubstats,estimateRealDamage};
export { extractAccountPresets } from './decks.js';
import { FOUR, STATS } from './data.js';
const zero=()=>Array(13).fill(0);
export function runeVector(r){const v=zero();for(const e of [r.main,r.innate,...r.subs])if(e?.[0]>0&&e[0]<13)v[e[0]]+=(e[1]||0)+(e.length>3?(e[3]||0):0);return v;}
// Six-star regular legendary stones. Ancient/unknown grades are left unchanged.
export const MAX_GEM={1:580,2:13,3:40,4:13,5:40,6:13,8:10,9:9,10:10,11:11,12:11};
export const MAX_GRIND={1:550,2:10,3:30,4:10,5:30,6:10,8:5};
export function runeVariants(r,simulate=false){
 if(!simulate||r.stars!==6||r.ancient)return [r];
 const grind=subs=>subs.map(e=>[e[0],e[1],e[2]||0,Math.max(e[3]||0,MAX_GRIND[e[0]]||0)]);
 const variants=[{...r,subs:grind(r.subs)}];
 // Only fully revealed runes can be enchanted. An existing enchant locks its index.
 if(r.level<12||r.subs.length!==4)return variants;
 const enchanted=r.subs.flatMap((e,i)=>e[2]?[i]:[]);
 if(enchanted.length>1)return variants;
 for(let i=0;i<r.subs.length;i++){
  if(enchanted.length&&enchanted[0]!==i)continue;
  for(const [key,value] of Object.entries(MAX_GEM)){
   const stat=Number(key);
   if(stat===r.main[0]||stat===r.innate?.[0]||r.subs.some((e,j)=>j!==i&&e[0]===stat))continue;
   if((r.slot===1&&[5,6].includes(stat))||(r.slot===3&&[3,4].includes(stat)))continue;
   // Re-enchanting the same type must never lower a better existing roll.
   const same=r.subs[i][0]===stat;
   if(same&&(!r.subs[i][2]||value<=r.subs[i][1]))continue;
   const subs=r.subs.map(e=>e.slice());
   subs[i]=[stat,same?Math.max(value,r.subs[i][1]):value,1,same?(r.subs[i][3]||0):0];
   variants.push({...r,subs:grind(subs)});
  }
 }
 return variants;
}
function variantKey(r){return `${r.id}:${JSON.stringify(r.subs)}`;}
export function combatSpeed(unit,stats,counts={},bonuses={},combat={},effects={}){return combatAttributes(unit,stats,counts,bonuses,combat,effects).spd;}
export const firstTurns=simulateFirstTurns;
function add(a,b){return a.map((n,i)=>n+b[i]);}
export function setCounts(runes){const counts={};for(const r of runes)counts[r.set]=(counts[r.set]||0)+1;return counts;}
function completed(counts,set){return Math.floor((counts[set]||0)/(FOUR.has(set)?4:2));}
export function statsFromVector(unit,v,counts,artifactFlat={}){
 const b=unit.base;
 const bonus={hp:Math.ceil(b.hp*(v[2]+15*completed(counts,1))/100)+v[1]+(artifactFlat.hp||0),def:Math.ceil(b.def*(v[6]+15*completed(counts,2))/100)+v[5]+(artifactFlat.def||0),atk:Math.ceil(b.atk*(v[4]+35*completed(counts,8))/100)+v[3]+(artifactFlat.atk||0),spd:Math.ceil(b.spd*25*completed(counts,3)/100)+v[8],cr:v[9]+12*completed(counts,4),cd:v[10]+40*completed(counts,5),acc:v[12]+20*completed(counts,6),res:v[11]+20*completed(counts,7)};
 return {bonus,total:Object.fromEntries(STATS.map(k=>[k,b[k]+bonus[k]]))};
}
export function calculateStats(unit,runes,artifactFlat={}){return statsFromVector(unit,runes.reduce((v,r)=>add(v,runeVector(r)),zero()),setCounts(runes),artifactFlat);}
export function artifactBonus(account,unit){const out={hp:0,atk:0,def:0};for(const a of account.artifacts)if(unit.artifactIds.includes(a.id)){const key={100:'hp',101:'atk',102:'def'}[a.main[0]];if(key)out[key]+=a.main[1];}return out;}
export function goalValue(stats,config,key){if(config.raidGoals&&stats.combat){if(config.basis==='total'||['cr','cd','res','acc'].includes(key))return stats.combat[key];return stats.bonus[key]+stats.combat[key]-stats.total[key];}return stats[config.basis==='total'||['cr','cd','res','acc'].includes(key)?'total':'bonus'][key];}
export function goalReport(stats,config){const rows=STATS.filter(k=>Number(config.goals[k])>0).map(key=>{const target=Number(config.goals[key]);const actual=goalValue(stats,config,key);return {key,target,actual,missing:Math.max(0,target-actual),met:actual>=target};});if(Number(config.combatSpd)>0){const target=Number(config.combatSpd),actual=stats.combat?.spd??stats.total.spd;rows.push({key:'combatSpd',target,actual,missing:Math.max(0,target-actual),met:actual>=target});}return rows;}
function setRequirements(c){const req={};for(const id of c.sets.filter(Boolean))req[id]=(req[id]||0)+(FOUR.has(id)?4:2);return req;}
function setsValid(counts,req){return Object.entries(req).every(([id,n])=>(counts[id]||0)>=n);}
function objective(stats,c){const focuses=c.focuses?normalizeFocuses(c.focuses):[];if(focuses.length)return focuses.reduce((n,key)=>n+objective(stats,{...c,focuses:[],objective:GOAL_PRESETS[key].objective}),0)/focuses.length;const s=stats.total;switch(c.objective){case 'cr':return Math.min(s.cr,100)/100;case 'spd':return Math.min(s.spd/400,1.5);case 'hp':return Math.min(s.hp/70000,1.5);case 'damage':if(stats.damage)return stats.damage.total/100000;return Math.min((s.atk*(1+Math.min(100,s.cr)/100*s.cd/100))/10000,1.5);default:return Math.min(s.hp/60000+s.def/2500+s.spd/350,3)/3;}}
function evaluate(stats,c,counts,progress=1){let deficit=Number(c.combatSpd)>0?Math.max(0,c.combatSpd*progress-stats.combat.spd)/c.combatSpd:0;for(const k of STATS){const target=Number(c.goals[k]);if(target>0){const desired=target*progress;const actual=goalValue(stats,c,k);deficit+=Math.max(0,desired-actual)/Math.max(target,1);}}
 let preference=0;if(!c.strictSets){const req=setRequirements(c);preference=Object.entries(req).reduce((s,[id,n])=>s+Math.min((counts[id]||0)/n,1),0)*0.03;}
 return {deficit,utility:objective(stats,c)+preference};
}
function compare(a,b){return a.deficit-b.deficit||b.utility-a.utility;}
function rankRune(r,unit,c){const s=statsFromVector(unit,r.vector,{},{}),v=s.bonus;let n=0;for(const k of STATS){const target=Number(c.goals[k]);if(target>0)n+=v[k]/target;}return n+(Number(c.combatSpd)>0?v.spd/c.combatSpd:0)+objective(s,c)*0.35;}
function pickPool(pool,unit,c,depth){
 const score=r=>rankRune(r,unit,c);const sorted=pool.slice().sort((a,b)=>score(b)-score(a));const chosen=new Map();
 const take=rs=>rs.forEach(r=>chosen.set(variantKey(r),r));take(sorted.slice(0,depth));
 for(const id of c.sets.filter(Boolean))take(sorted.filter(r=>r.set===id).slice(0,depth));
 // Keep distinct stat extremes, so a balanced scalar ranking does not erase useful trades.
 for(const k of STATS.filter(k=>Number(c.goals[k])>0||k==='spd'&&Number(c.combatSpd)>0||k===c.objective||(c.objective==='damage'&&c.damage?.enabled)))take(pool.slice().sort((a,b)=>statsFromVector(unit,b.vector,{},{}).bonus[k]-statsFromVector(unit,a.vector,{},{}).bonus[k]).slice(0,Math.ceil(depth/2)));
 return [...chosen.values()];
}
export function generateCandidates(account,unit,c,options,reserved=new Set(),progress=()=>{}){
 if(options.strictMode)c={...c,strictSets:true};
 const req=setRequirements(c);if(c.strictSets&&Object.values(req).reduce((a,b)=>a+b,0)>6)return {candidates:[],reason:'Os sets exigidos precisam de mais de seis runas.'};
 const locks=lockContext(account,options);
 if(locks.units.has(unit.id)){
  const build=equippedBuild(account,{...options.combat,plannedRunes:null},c,options);
  if(!build||build.runeIds.some(id=>reserved.has(id)))return {candidates:[],reason:'Monstro travado sem seis runas livres do SWEX.'};
  if(c.strictSets&&!setsValid(build.counts,req)||build.runeIds.some(id=>{const r=account.runes.find(r=>r.id===id);return Number(c.mains[r.slot])&&r.main[0]!==Number(c.mains[r.slot]);})||options.strictMode&&build.goals.some(g=>!g.met))return {candidates:[],reason:'A build travada não atende aos requisitos; ajuste metas ou libere a trava.'};
  return {candidates:[{...build,upgrades:[]}],reason:''};
 }
 const forced=new Map(account.runes.filter(r=>locks.runes.has(r.id)&&(r.owner===unit.id||unit.runeIds.includes(r.id))).map(r=>[r.slot,r.id]));
 const setting={fast:{width:90,depth:9,passes:2},balanced:{width:180,depth:15,passes:3},deep:{width:350,depth:23,passes:4}}[options.depth]||{width:180,depth:15,passes:3};
 const allowed=account.runes.filter(r=>(!locks.runes.has(r.id)||r.owner===unit.id||unit.runeIds.includes(r.id))&&(!forced.has(r.slot)||forced.get(r.slot)===r.id)&&r.pool!=='rta'&&r.set!==25&&r.set!==99&&r.level>=options.minLevel&&!reserved.has(r.id)&&(!options.respectLocks||!r.locked)&&(options.equipped||!r.owner||r.owner===unit.id)).flatMap(r=>runeVariants(r,options.maxGrindsGems&&!locks.runes.has(r.id))).map(r=>({...r,vector:runeVector(r)}));
 const pools=Array.from({length:6},(_,i)=>{const slot=i+1;return pickPool(allowed.filter(r=>r.slot===slot&&(!Number(c.mains[slot])||r.main[0]===Number(c.mains[slot]))),unit,c,setting.depth);});
 const empty=pools.findIndex(p=>p.length===0);if(empty>=0)return {candidates:[],reason:`Nenhuma runa disponível para o slot ${empty+1} com esses filtros.`};
 const flat=options.artifacts&&c.artifacts!==false?artifactBonus(account,unit):{};
 const damageSettings=normalizeDamageSettings(c.damage),effects=artifactEffects(account,unit,options.artifacts&&c.artifacts!==false);
 const originalById=new Map(account.runes.map(r=>[r.id,r]));
 const finishStats=(v,counts)=>{const stats=statsFromVector(unit,v,counts,flat);stats.combat={...combatAttributes(unit,stats,counts,options.combat,c.combat,effects),effects:effects.totals};if(damageSettings.enabled)stats.damage={total:estimateRealDamage(unit,stats,damageSettings,effects).total};return stats;};
 const upgrades=runes=>options.maxGrindsGems?runes.filter(r=>JSON.stringify(r.subs)!==JSON.stringify(originalById.get(r.id).subs)).map(r=>({runeId:r.id,subs:r.subs})):[];
 const frequency=new Map(),all=new Map();
 for(let pass=0;pass<setting.passes;pass++){
  let beam=[{runes:[],v:zero(),counts:{},deficit:0,utility:0,diversity:0}];
  // Alternate slot order to avoid a fixed early decision dominating every candidate.
  const order=pass%2?[5,3,1,4,2,0]:[1,3,5,0,2,4];
  for(let step=0;step<6;step++){
   const slot=order[step],remaining=order.slice(step+1),next=[];
   for(const state of beam)for(const rune of pools[slot]){
    const counts={...state.counts,[rune.set]:(state.counts[rune.set]||0)+1};
    if(c.strictSets&&!Object.entries(req).every(([id,n])=>(counts[id]||0)+remaining.filter(s=>pools[s].some(r=>r.set===Number(id))).length>=n))continue;
    const v=add(state.v,rune.vector),stats=finishStats(v,counts),evaluation=evaluate(stats,c,counts,(step+1)/6);
    const diversity=state.diversity+(frequency.get(rune.id)||0)*0.006;
    next.push({runes:[...state.runes,rune],v,counts,stats,...evaluation,diversity});
   }
   next.sort((a,b)=>a.deficit-b.deficit||(b.utility-b.diversity)-(a.utility-a.diversity));
   beam=next.slice(0,setting.width);if(!beam.length)break;
  }
  for(const b of beam){if(c.strictSets&&!setsValid(b.counts,req))continue;const ids=b.runes.map(r=>r.id).sort((a,b)=>a-b);const key=b.runes.map(variantKey).sort().join('|');if(!all.has(key)){all.set(key,{runeIds:ids,upgrades:upgrades(b.runes),stats:b.stats,counts:b.counts,deficit:b.deficit,utility:b.utility});}}
  for(const b of beam.slice(0,35))for(const r of b.runes)frequency.set(r.id,(frequency.get(r.id)||0)+1);
  progress(pass+1,setting.passes);
 }
 // Preserve the currently equipped combination as another genuine alternative.
 const equipped=unit.runeIds.map(id=>allowed.find(r=>r.id===id));
 if(equipped.length===6&&equipped.every(Boolean)&&new Set(equipped.map(r=>r.slot)).size===6&&equipped.every(r=>!Number(c.mains[r.slot])||r.main[0]===Number(c.mains[r.slot]))){const counts=setCounts(equipped);if(!c.strictSets||setsValid(counts,req)){const stats=finishStats(equipped.reduce((v,r)=>add(v,r.vector),zero()),counts);all.set('equipped',{runeIds:equipped.map(r=>r.id),upgrades:upgrades(equipped),stats,counts,...evaluate(stats,c,counts)});}}
 const candidates=[...all.values()].filter(candidate=>!options.strictMode||candidate.deficit<=1e-9).sort(compare);
 return {candidates,reason:candidates.length?'':options.strictMode?'Nenhuma combinação atinge todas as metas no Strict Mode.':'Nenhuma combinação encontrada com os sets e slots exigidos nesta busca.'};
}
export function speedSyncValid(assignments,teams){
 for(const team of teams){
  const active=team.configs.filter(c=>c.enabled),chain=active.filter(c=>c.lockSpeedSync===true);
  const eventDriven=!!team.combatScenario?.events?.length||active.some(c=>Number(c.masterId)===16613);
  if(!eventDriven)for(let i=0;i<chain.length;i++)for(let j=i+1;j<chain.length;j++){
   const a=assignments[chain[i].key],b=assignments[chain[j].key];if(!a||!b)continue;
   const sa=a.stats.combat?.spd??a.stats.total.spd,sb=b.stats.combat?.spd??b.stats.total.spd;
   if(sa<sb||sa===sb&&(!a.stats.combat||!b.stats.combat))return false;
  }
  if(active.length&&active.every(c=>assignments[c.key])&&(chain.length||active.some(c=>Number(c.maxTick)>0))){
   const actors=active.map(c=>{const a=assignments[c.key];return {key:c.key,master:a.stats.combat?.master??c.masterId,spd:a.stats.combat?.spd??a.stats.total.spd,rawSpd:a.stats.combat?.rawSpd,combat:c.combat,effects:a.stats.combat?.effects,will:(a.counts?.[15]||0)>=2,nemesisSets:Math.floor((a.counts?.[14]||0)/2)};});
   const configured=scenarioForTeam(team,actors),foes=configured.actors.some(a=>a.enemy),enemy=Number(team.enemyCombatSpd)||0;
   const report=simulateCombat([...configured.actors,...(!foes&&enemy>0?[{key:'__enemy__',spd:enemy,enemy:true}]:[])],{events:configured.events,stopAfterFirst:true});
   const positions=chain.map(c=>report.firstTurns.findIndex(t=>t.key===c.key));
   if(positions.some((p,i)=>p<0||report.firstTurns[p]?.disabled||i>0&&p<positions[i-1]))return false;
   const enemyIndex=report.firstTurns.findIndex(t=>t.enemy);if(enemyIndex>=0&&positions.some(p=>p>enemyIndex))return false;
   for(const c of active)if(Number(c.maxTick)>0){const turn=report.firstTurns.find(t=>t.key===c.key);if(!turn||turn.disabled||turn.tick>Number(c.maxTick))return false;}
  }
 }
 return true;
}
function orderCost(assignments,teams){
 let cost=0;
 for(const t of teams){
  if(t.order!=='soft')continue;
  const cs=t.configs.filter(c=>c.enabled);
  for(let i=1;i<cs.length;i++){
   const a=assignments[cs[i-1].key],b=assignments[cs[i].key];
   if(!a||!b)continue;
   const sa=a.stats.combat?.spd??a.stats.total.spd,sb=b.stats.combat?.spd??b.stats.total.spd;
   if(sa<sb)cost+=0.15+(sb-sa)/1000;
  }
 }
 return cost;
}
export function optimize(account,teams,options,onProgress=()=>{},reservedIds=[],candidateCache=null){
 assertMainPool(teams,options);
 teams=teams.filter(t=>t.active!==false);
 const started=Date.now(),reserved=new Set(reservedIds),jobs=[];const seen=new Set();
 for(const team of teams){
  for(const field of ['towerSpd','guildSpd','leaderSpd','enemyCombatSpd'])if(!Number.isFinite(Number(team[field]??0))||Number(team[field]??0)<0||Number(team[field]??0)>(field==='enemyCombatSpd'?1000:100))throw new Error('Bônus de SPD ou SPD inimiga inválidos.');
 }
 for(const team of teams)for(const config of team.configs.filter(c=>c.enabled)){
  const unit=account.units.find(u=>u.id===config.unitId);if(!unit)throw new Error(`${config.label}: não encontrado no JSON. Escolha outro monstro ou desmarque “Incluir”.`);
  if(seen.has(unit.id))throw new Error(`${unit.name}: a mesma unidade foi selecionada mais de uma vez. Escolha outra cópia do monstro.`);seen.add(unit.id);
  for(const k of STATS)if(config.goals[k]!==''&&(!Number.isFinite(Number(config.goals[k]))||Number(config.goals[k])<0))throw new Error(`Meta inválida para ${unit.name}.`);
  jobs.push({unit,config,team});
 }
 if(!jobs.length)throw new Error('Inclua ao menos um monstro na busca.');
 const failures=[];
 for(let i=0;i<jobs.length;i++){
  const job=jobs[i];onProgress({percent:Math.round(i/jobs.length*75),message:`Buscando combinações para ${job.unit.name}…`});
  const cacheKey=candidateCache?JSON.stringify([job.team,job.config,job.unit.id,options,[...reserved]]):null;
  const result=candidateCache?.get(cacheKey)||generateCandidates(account,job.unit,job.config,{...options,combat:job.team},reserved,(pass,total)=>onProgress({percent:Math.round((i+pass/total)/jobs.length*75),message:`Buscando combinações para ${job.unit.name}…`}));
  if(candidateCache&&!candidateCache.has(cacheKey))candidateCache.set(cacheKey,result);
  job.candidates=result.candidates.slice();if(!result.candidates.length)failures.push({key:job.config.key,name:job.unit.name,reason:result.reason});
 }
 if(failures.length)return {status:'no_assignment',failures,builds:[],elapsed:Date.now()-started,checked:jobs.reduce((s,j)=>s+j.candidates.length,0)};
 onProgress({percent:80,message:'Distribuindo runas entre todos os times…'});
 // Joint beam search considers competing assignments instead of committing one monster at a time.
 const ordered=jobs.slice().sort((a,b)=>Number(isPriority(b.team))-Number(isPriority(a.team))||a.candidates.length-b.candidates.length);
 const bestUtility=Object.fromEntries(jobs.map(job=>[job.config.key,Math.max(...job.candidates.map(c=>c.utility))]));
 const breadth=options.depth==='deep'?220:options.depth==='fast'?60:120;
 let beam=[{used:new Set(),assignments:{},deficit:0,utility:0}];
 for(let i=0;i<ordered.length;i++){
  const job=ordered[i],next=[];const weight=Number(job.team.priority)||1;
  let regenerated=0;
  for(const state of beam){let accepted=0;
   for(const c of job.candidates){if(c.runeIds.some(id=>state.used.has(id)))continue;
    const assignments={...state.assignments,[job.config.key]:c};if(!speedSyncValid(assignments,teams))continue;const used=new Set([...state.used,...c.runeIds]);
    next.push({used,assignments,deficit:state.deficit+c.deficit*weight,utility:state.utility+c.utility*weight});
    if(++accepted>=35)break;
   }
   // Candidate pruning can concentrate everyone on the same few excellent runes.
   // Expand the search against actual competing allocations before declaring a conflict.
   if(!accepted&&regenerated<3){
    regenerated++;onProgress({percent:80+Math.round(i/ordered.length*19),message:`Reavaliando ${job.unit.name} com as runas livres…`});
    const blocked=new Set([...reserved,...state.used]);
    const expanded=generateCandidates(account,job.unit,job.config,{...options,combat:job.team},blocked).candidates;
    const candidateKey=c=>JSON.stringify([c.runeIds,c.upgrades]);const existing=new Set(job.candidates.map(candidateKey));
    for(const c of expanded)if(!existing.has(candidateKey(c))){job.candidates.push(c);existing.add(candidateKey(c));}
    for(const c of expanded.filter(c=>speedSyncValid({...state.assignments,[job.config.key]:c},teams)).slice(0,35))next.push({used:new Set([...state.used,...c.runeIds]),assignments:{...state.assignments,[job.config.key]:c},deficit:state.deficit+c.deficit*weight,utility:state.utility+c.utility*weight});
   }
  }
  if(!next.length)return {status:'conflict',failures:[{name:job.unit.name,reason:'Nenhuma distribuição encontrada sem repetir runas e respeitando os vínculos de SPD. Amplie a busca, libere reservas ou ajuste as metas e a ordem dos cards.'}],builds:[],elapsed:Date.now()-started,checked:jobs.reduce((s,j)=>s+j.candidates.length,0)};
  for(const state of next)state.score=allocationScore(state.assignments,teams,bestUtility);
  next.sort((a,b)=>compareAllocation(a.score,b.score)||orderCost(a.assignments,teams)-orderCost(b.assignments,teams));
  beam=next.slice(0,breadth);onProgress({percent:80+Math.round((i+1)/ordered.length*19),message:'Comparando distribuições sem repetir runas…'});
 }
 const best=beam[0];const builds=jobs.map(job=>{const c=best.assignments[job.config.key];return {key:job.config.key,unitId:job.unit.id,name:job.unit.name,teamId:job.team.id,teamName:job.team.name,...c,goals:goalReport(c.stats,job.config),artifactIds:options.artifacts&&job.config.artifacts!==false?job.unit.artifactIds:[],damage:job.config.damage?.enabled?estimateRealDamage(job.unit,c.stats,job.config.damage,artifactEffects(account,job.unit,options.artifacts&&job.config.artifacts!==false)):null,role:job.team.mode==='attack'?'offense':'defense',enemyDefense:job.team.enemyDefense||[]};});
 return {status:builds.every(b=>b.goals.every(g=>g.met))?'met':'approximate',builds,failures:[],elapsed:Date.now()-started,checked:jobs.reduce((s,j)=>s+j.candidates.length,0),completedAt:new Date().toISOString(),scope:options.maxGrindsGems?'simulated-max-regular-stones':'current-runes-combat-spd',allocation:'priority-then-minimax-team-deficit-and-relative-quality',options};
}

// A local planned loadout never mutates the imported SWEX inventory.
export function equippedBuild(account,team,config,options={}){
 const unit=account?.units.find(u=>u.id===config.unitId);if(!unit)return null;
 const runeIds=currentRuneIds(account,team,config,unit),runes=runeIds.map(id=>account.runes.find(r=>r.id===id));
 if(runes.length!==6||!runes.every(Boolean)||new Set(runes.map(r=>r.slot)).size!==6)return null;
 const stats=calculateStats(unit,runes,options.artifacts!==false&&config.artifacts!==false?artifactBonus(account,unit):{}),counts=setCounts(runes),effects=artifactEffects(account,unit,options.artifacts!==false&&config.artifacts!==false);
 stats.combat={...combatAttributes(unit,stats,counts,team,config.combat,effects),effects:effects.totals};
 if(config.damage?.enabled)stats.damage={total:estimateRealDamage(unit,stats,config.damage,effects).total};
 return {key:config.key,unitId:unit.id,name:unit.name,runeIds:[...runeIds],counts,stats,goals:goalReport(stats,config),deficit:evaluate(stats,config,counts).deficit,utility:objective(stats,config)};
}
export function equippedTeamBuilds(account,team,options={}){return team.configs.filter(c=>c.enabled!==false).map(c=>equippedBuild(account,team,c,options)).filter(Boolean);}

// First-rotation preview: prefer current optimized builds; otherwise use complete equipped sets.
export function teamTurnPreview(account,team,options={},builds=null){
 const active=team.configs.filter(c=>c.enabled),actors=[],missing=[];
 for(const config of active){
  const unit=account?.units.find(u=>u.id===config.unitId);
  const build=builds?.find(b=>b.key===config.key&&b.unitId===config.unitId);
  if(!unit){missing.push(config.label);continue;}
  let stats=build?.stats,counts=build?.counts;
  if(stats?.combat&&!stats.total){actors.push({key:config.key,unitId:unit.id,master:unit.master,name:unit.name,spd:stats.combat.spd,attributes:stats.combat,combat:config.combat});continue;}
  if(!stats){const runes=currentRuneIds(account,team,config,unit).map(id=>account.runes.find(r=>r.id===id)).filter(Boolean);if(runes.length!==6||new Set(runes.map(r=>r.slot)).size!==6){missing.push(unit.name);continue;}stats=calculateStats(unit,runes,options.artifacts!==false&&config.artifacts!==false?artifactBonus(account,unit):{});counts=setCounts(runes);}
  const effects=artifactEffects(account,unit,options.artifacts!==false&&config.artifacts!==false),combat=combatAttributes(unit,stats,counts,team,config.combat,effects);
  actors.push({key:config.key,unitId:unit.id,master:unit.master,name:unit.name,spd:combat.spd,rawSpd:combat.rawSpd,attributes:combat,combat:config.combat,effects,nemesisSets:Math.floor((counts?.[14]||0)/2)});
 }
 if(missing.length||!actors.length)return {complete:false,actors,missing,turns:[],cut:null,source:builds?'builds':'equipped'};
 const enemy=Number(team.enemyCombatSpd)||0;
 const configured=scenarioForTeam(team,actors),hasEnemies=configured.actors.some(a=>a.enemy);
 const scenario=simulateCombat([...configured.actors,...(!hasEnemies&&enemy>0?[{key:'__enemy__',name:'Inimigo',spd:enemy,enemy:true}]:[])],{events:configured.events,stopAfterFirst:true});scenario.risks.push(...missingDefenseConditions(team));const turns=scenario.firstTurns;
 return {complete:true,actors,missing:[],turns,scenario,cut:scenario.cut,source:builds?'builds':'equipped'};
}
export function validateWaveClear(unit,stats,skill,enemies,settings={}){
 const value=(key,fallback,min=0,max=1000000)=>{const n=Number(settings[key]??fallback);if(!Number.isFinite(n)||n<min||n>max)throw new Error(`Parâmetro de dano inválido: ${key}`);return n;};
 const towerAtk=value('towerAtk',0,0,100),leaderAtk=value('leaderAtk',0,0,100),towerCd=value('towerCd',0,0,100);
 const skillUps=value('skillUps',0,0,100),attackBuff=value('attackBuff',0,0,100),variance=value('variance',.9,.1,1);
 if(!skill||!Number.isFinite(skill.multiplier)||skill.multiplier<=0||!Number.isInteger(skill.hits)||skill.hits<=0||skill.hits>20)throw new Error('Habilidade não suportada.');
 if(![unit?.base?.atk,stats?.total?.atk,stats?.total?.cr,stats?.total?.cd].every(n=>Number.isFinite(n)&&n>=0))throw new Error('Atributos do atacante inválidos.');
 const atk=(stats.total.atk+unit.base.atk*(towerAtk+leaderAtk)/100)*(1+attackBuff/100);
 return enemies.map(enemy=>{
  if(!Number.isFinite(enemy.hp)||enemy.hp<=0||!Number.isFinite(enemy.def)||enemy.def<0)throw new Error('HP/DEF de wave inválidos.');
  const advantage=({1:2,2:3,3:1})[unit.element]===enemy.element,disadvantage=({1:2,2:3,3:1})[enemy.element]===unit.element;
  const guaranteedCrit=!disadvantage&&stats.total.cr+(advantage?15:0)>=100;
  const critical=guaranteedCrit?1+Math.max(0,stats.total.cd+towerCd-(enemy.critReduction||0))/100:1;
  const defense=skill.ignoreDefense?0:enemy.def;
  const perHit=Math.floor(atk*skill.multiplier*(1+skillUps/100)*critical*1000/(1140+3.5*defense)*variance*(disadvantage?.7:1));
  let damage=perHit*skill.hits,additionalDamage=0;
  if(settings.artifactEffects){const report=estimateRealDamage(unit,stats,{enabled:true,skill:3,hits:skill.hits,multiplier:skill.multiplier,enemyDef:enemy.def,enemyElement:enemy.element||0,ignoreDefense:skill.ignoreDefense===true,towerAtk,leaderAtk,towerCd,skillUps,attackBuff:attackBuff===50,variance,critMode:guaranteedCrit?'critical':'normal',singleTarget:false,enemyCritReduction:enemy.critReduction||0},settings.artifactEffects);damage=report.total;additionalDamage=report.additionalDamage;}
  return {...enemy,damage,additionalDamage,missing:Math.max(0,enemy.hp-damage),guaranteedCrit,disadvantage,
   clearInOneTurn:settings.skillReady===true&&damage>=enemy.hp};
 });
}

export function equippedDamagePreview(account,config,team={},options={},build=null){
 if(!config.damage?.enabled)return null;
 const unit=account?.units.find(u=>u.id===config.unitId);if(!unit)throw new Error('Selecione uma unidade da conta para estimar dano.');
 let stats=build?.stats;
 if(!stats){const runes=(unit.runeIds||[]).map(id=>account.runes.find(r=>r.id===id)).filter(Boolean);if(runes.length!==6||new Set(runes.map(r=>r.slot)).size!==6)throw new Error('Importe seis runas equipadas ou otimize para calcular a prévia.');stats=calculateStats(unit,runes,options.artifacts!==false&&config.artifacts!==false?artifactBonus(account,unit):{});stats.combat={spd:combatSpeed(unit,stats,setCounts(runes),team)};}
 return estimateRealDamage(unit,stats,config.damage,artifactEffects(account,unit,options.artifacts!==false&&config.artifacts!==false));
}
