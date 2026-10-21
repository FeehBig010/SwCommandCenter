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
export function combatSpeed(unit,stats,counts={},bonuses={}){
 const swift=25*completed(counts,3);
 // Recombine fractional base bonuses before rounding; sheet Swift was rounded already.
 return Math.ceil(stats.total.spd-Math.ceil(unit.base.spd*swift/100)
  +unit.base.spd*(swift+Number(bonuses.towerSpd||0)+Number(bonuses.leaderSpd||0))/100-1e-10);
}
export function firstTurns(actors){
 if(actors.some(a=>!Number.isFinite(a.spd)||a.spd<=0))throw new Error('SPD de combate deve ser positiva e finita.');
 const state=actors.map((a,i)=>({...a,index:i,atb:0})),seen=new Set(),turns=[];
 // Each action advances a tick. ATB overflow is retained until that actor moves.
 for(let tick=1;tick<=10000&&seen.size<state.length;tick++){
  for(const a of state)a.atb+=a.spd*7; // integer hundredths of ATB: 100% = 10000
  const ready=state.filter(a=>a.atb>=10000).sort((a,b)=>b.atb-a.atb||b.spd-a.spd
   ||Number(b.enemy||false)-Number(a.enemy||false)||a.index-b.index);
  if(!ready.length)continue;
  const actor=ready[0];
  if(!seen.has(actor.key)){seen.add(actor.key);turns.push({key:actor.key,tick,spd:actor.spd,atb:actor.atb/100});}
  actor.atb=0;
 }
 if(seen.size!==state.length)throw new Error('Simulação de turnos excedeu o limite.');
 return turns;
}
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
export function goalValue(stats,config,key){return stats[config.basis==='total'||['cr','cd','res','acc'].includes(key)?'total':'bonus'][key];}
export function goalReport(stats,config){return STATS.filter(k=>Number(config.goals[k])>0).map(key=>{const target=Number(config.goals[key]);const actual=goalValue(stats,config,key);return {key,target,actual,missing:Math.max(0,target-actual),met:actual>=target};});}
function setRequirements(c){const req={};for(const id of c.sets.filter(Boolean))req[id]=(req[id]||0)+(FOUR.has(id)?4:2);return req;}
function setsValid(counts,req){return Object.entries(req).every(([id,n])=>(counts[id]||0)>=n);}
function objective(stats,c){const s=stats.total;switch(c.objective){case 'cr':return Math.min(s.cr,100)/100;case 'spd':return Math.min(s.spd/400,1.5);case 'hp':return Math.min(s.hp/70000,1.5);case 'damage':return Math.min((s.atk*(1+Math.min(100,s.cr)/100*s.cd/100))/10000,1.5);default:return Math.min(s.hp/60000+s.def/2500+s.spd/350,3)/3;}}
function evaluate(stats,c,counts,progress=1){let deficit=0;for(const k of STATS){const target=Number(c.goals[k]);if(target>0){const desired=target*progress;const actual=goalValue(stats,c,k);deficit+=Math.max(0,desired-actual)/Math.max(target,1);}}
 let preference=0;if(!c.strictSets){const req=setRequirements(c);preference=Object.entries(req).reduce((s,[id,n])=>s+Math.min((counts[id]||0)/n,1),0)*0.03;}
 return {deficit,utility:objective(stats,c)+preference};
}
function compare(a,b){return a.deficit-b.deficit||b.utility-a.utility;}
function rankRune(r,unit,c){const s=statsFromVector(unit,r.vector,{},{}),v=s.bonus;let n=0;for(const k of STATS){const target=Number(c.goals[k]);if(target>0)n+=v[k]/target;}return n+objective(s,c)*0.35;}
function pickPool(pool,unit,c,depth){
 const score=r=>rankRune(r,unit,c);const sorted=pool.slice().sort((a,b)=>score(b)-score(a));const chosen=new Map();
 const take=rs=>rs.forEach(r=>chosen.set(variantKey(r),r));take(sorted.slice(0,depth));
 for(const id of c.sets.filter(Boolean))take(sorted.filter(r=>r.set===id).slice(0,depth));
 // Keep distinct stat extremes, so a balanced scalar ranking does not erase useful trades.
 for(const k of STATS.filter(k=>Number(c.goals[k])>0||k===c.objective))take(pool.slice().sort((a,b)=>statsFromVector(unit,b.vector,{},{}).bonus[k]-statsFromVector(unit,a.vector,{},{}).bonus[k]).slice(0,Math.ceil(depth/2)));
 return [...chosen.values()];
}
export function generateCandidates(account,unit,c,options,reserved=new Set(),progress=()=>{}){
 const req=setRequirements(c);if(c.strictSets&&Object.values(req).reduce((a,b)=>a+b,0)>6)return {candidates:[],reason:'Os sets exigidos precisam de mais de seis runas.'};
 const setting={fast:{width:90,depth:9,passes:2},balanced:{width:180,depth:15,passes:3},deep:{width:350,depth:23,passes:4}}[options.depth]||{width:180,depth:15,passes:3};
 const allowed=account.runes.filter(r=>r.set!==25&&r.set!==99&&r.level>=options.minLevel&&!reserved.has(r.id)&&(!options.respectLocks||!r.locked)&&(options.equipped||!r.owner||r.owner===unit.id)).flatMap(r=>runeVariants(r,options.maxGrindsGems)).map(r=>({...r,vector:runeVector(r)}));
 const pools=Array.from({length:6},(_,i)=>{const slot=i+1;return pickPool(allowed.filter(r=>r.slot===slot&&(!Number(c.mains[slot])||r.main[0]===Number(c.mains[slot]))),unit,c,setting.depth);});
 const empty=pools.findIndex(p=>p.length===0);if(empty>=0)return {candidates:[],reason:`Nenhuma runa disponível para o slot ${empty+1} com esses filtros.`};
 const flat=options.artifacts?artifactBonus(account,unit):{};
 const originalById=new Map(account.runes.map(r=>[r.id,r]));
 const finishStats=(v,counts)=>{const stats=statsFromVector(unit,v,counts,flat);return {...stats,combat:{spd:combatSpeed(unit,stats,counts,options.combat)}};};
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
 return {candidates:[...all.values()].sort(compare),reason:all.size?'':'Nenhuma combinação encontrada com os sets e slots exigidos nesta busca.'};
}
export function speedSyncValid(assignments,teams){
 for(const team of teams){
  const chain=team.configs.filter(c=>c.enabled&&c.lockSpeedSync===true);
  // Compare every assigned pair, even if a middle slot has not been assigned yet.
  for(let i=0;i<chain.length;i++)for(let j=i+1;j<chain.length;j++){
   const a=assignments[chain[i].key],b=assignments[chain[j].key];
   if(a&&b){
    const sa=a.stats.combat?.spd??a.stats.total.spd,sb=b.stats.combat?.spd??b.stats.total.spd;
    // Equal combat SPD uses visual slot order; legacy sheet-only calls stay strict.
    if(sa<sb||(sa===sb&&(!a.stats.combat||!b.stats.combat)))return false;
   }
  }
  const active=team.configs.filter(c=>c.enabled);
  if(Number(team.enemyCombatSpd)>0&&chain.length&&active.every(c=>assignments[c.key])){
   const actors=active.map(c=>({key:c.key,spd:assignments[c.key].stats.combat?.spd??assignments[c.key].stats.total.spd}));
   const turns=firstTurns([...actors,{key:'enemy',spd:Number(team.enemyCombatSpd),enemy:true}]);
   const enemyIndex=turns.findIndex(t=>t.key==='enemy');
   if(chain.some(c=>turns.findIndex(t=>t.key===c.key)>enemyIndex))return false;
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
export function optimize(account,teams,options,onProgress=()=>{},reservedIds=[]){
 const started=Date.now(),reserved=new Set(reservedIds),jobs=[];const seen=new Set();
 for(const team of teams){
  for(const field of ['towerSpd','leaderSpd','enemyCombatSpd'])if(!Number.isFinite(Number(team[field]??0))||Number(team[field]??0)<0||Number(team[field]??0)>(field==='enemyCombatSpd'?1000:100))throw new Error('Bônus de SPD ou SPD inimiga inválidos.');
 }
 for(const team of teams)for(const config of team.configs.filter(c=>c.enabled)){
  const unit=account.units.find(u=>u.id===config.unitId);if(!unit)throw new Error(`${config.label}: não encontrado no JSON. Escolha outro monstro ou desmarque “Incluir”.`);
  if(seen.has(unit.id))throw new Error(`${unit.name}: a mesma unidade foi selecionada mais de uma vez. Escolha outra cópia do monstro.`);seen.add(unit.id);
  for(const k of STATS)if(config.goals[k]!==''&&(!Number.isFinite(Number(config.goals[k]))||Number(config.goals[k])<0))throw new Error(`Meta inválida para ${unit.name}.`);
  jobs.push({unit,config,team});
 }
 if(!jobs.length)throw new Error('Inclua ao menos um monstro na busca.');
 if(jobs.length>50)throw new Error('Esta versão aceita até 50 monstros por busca.');
 const failures=[];
 for(let i=0;i<jobs.length;i++){
  const job=jobs[i];onProgress({percent:Math.round(i/jobs.length*75),message:`Buscando combinações para ${job.unit.name}…`});
  const result=generateCandidates(account,job.unit,job.config,{...options,combat:job.team},reserved,(pass,total)=>onProgress({percent:Math.round((i+pass/total)/jobs.length*75),message:`Buscando combinações para ${job.unit.name}…`}));
  job.candidates=result.candidates;if(!result.candidates.length)failures.push({key:job.config.key,name:job.unit.name,reason:result.reason});
 }
 if(failures.length)return {status:'no_assignment',failures,builds:[],elapsed:Date.now()-started,checked:jobs.reduce((s,j)=>s+j.candidates.length,0)};
 onProgress({percent:80,message:'Distribuindo runas entre todos os times…'});
 // Joint beam search considers competing assignments instead of committing one monster at a time.
 const ordered=jobs.slice().sort((a,b)=>a.candidates.length-b.candidates.length||Number(b.team.priority)-Number(a.team.priority));
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
  next.sort((a,b)=>a.deficit-b.deficit||(b.utility-orderCost(b.assignments,teams))-(a.utility-orderCost(a.assignments,teams)));
  beam=next.slice(0,breadth);onProgress({percent:80+Math.round((i+1)/ordered.length*19),message:'Comparando distribuições sem repetir runas…'});
 }
 const best=beam[0];const builds=jobs.map(job=>{const c=best.assignments[job.config.key];return {key:job.config.key,unitId:job.unit.id,name:job.unit.name,teamId:job.team.id,teamName:job.team.name,...c,goals:goalReport(c.stats,job.config),artifactIds:options.artifacts?job.unit.artifactIds:[]};});
 return {status:builds.every(b=>b.goals.every(g=>g.met))?'met':'approximate',builds,failures:[],elapsed:Date.now()-started,checked:jobs.reduce((s,j)=>s+j.candidates.length,0),completedAt:new Date().toISOString(),scope:options.maxGrindsGems?'simulated-max-regular-stones':'current-runes-combat-spd',options};
}
