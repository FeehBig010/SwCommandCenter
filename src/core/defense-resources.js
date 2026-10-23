import {STATS,FOUR} from './data.js';
import {teamFromGameDeck} from './account-teams.js';
import {accountStamp,currentRuneIds} from './loadouts.js';
import {calculateStats,artifactBonus,setCounts} from './optimizer.js';
import {combatAttributes} from './speedTuner.js';
import {artifactEffects} from './artifacts.js';
import {lockContext} from './locks.js';

export function jsonDefenseTeams(account){
 if(!account)return [];
 let presets=(account.accountPresets||[]).filter(p=>p.gameMode==='siege'&&p.mode==='defense');
 if(!presets.length)presets=(account.siege||[]).map((p,i)=>({...p,id:`native-defense-${i}`,gameMode:'siege',mode:'defense',missingIds:[]}));
 return presets.map(p=>({...teamFromGameDeck(p,account),name:p.name||'Defesa do JSON',autoName:false}));
}
export function defenseRuneIds(account){
 if(!account)return [];
 const ids=new Set();
 for(const team of jsonDefenseTeams(account))for(const c of team.configs){const unit=account.units.find(u=>u.id===c.unitId);if(unit)for(const id of currentRuneIds(account,team,c,unit)||[])ids.add(id);}
 return [...ids].sort((a,b)=>a-b);
}
export function defenseResourcePolicy(account,mode){return {accountStamp:accountStamp(account),mode,protectedRuneIds:mode==='restricted'?defenseRuneIds(account):[]};}
export function filteredDefenseInventory(account,policy){
 if(!account||policy?.accountStamp!==accountStamp(account)||policy.mode!=='restricted')return account;
 const blocked=new Set(defenseRuneIds(account));
 return {...account,runes:account.runes.filter(r=>!blocked.has(r.id)),units:account.units.map(u=>({...u,runeIds:u.runeIds.filter(id=>!blocked.has(id))}))};
}
function snapshot(account){
 const teams=jsonDefenseTeams(account),jobs=new Map(),runes=new Map(account.runes.map(r=>[r.id,r]));
 for(const team of teams)for(const config of team.configs){
  if(!config.unitId)continue;
  const original=account.units.find(u=>u.id===config.unitId),preset=account.accountPresets?.find(p=>p.id===team.sourceDeckId),equipment=preset?.equipment?.find(e=>e.unitId===original.id);
  const unit=equipment?{...original,artifactIds:equipment.artifactIds||original.artifactIds}:original,ids=currentRuneIds(account,team,config,unit)||[];
  if(ids.length!==6||new Set(ids.map(id=>runes.get(id)?.slot)).size!==6||ids.some(id=>!runes.has(id)))throw new Error(`${unit.name}: complete as seis runas do SWEX antes de melhorar as defesas.`);
  const old=jobs.get(unit.id);
  if(old&&JSON.stringify([...old.ids].sort((a,b)=>a-b))!==JSON.stringify([...ids].sort((a,b)=>a-b)))throw new Error(`${unit.name} aparece com equipamentos diferentes nas defesas. Escolha um único loadout no jogo.`);
  const context={team,config,unit,flat:artifactBonus(account,unit),effects:artifactEffects(account,unit)};
  if(old)old.contexts.push(context);else jobs.set(unit.id,{unit,ids:[...ids],contexts:[context],runes});
 }
 if(!jobs.size)throw new Error('O JSON não contém defesas com monstros e equipamentos válidos.');
 const used=new Set();for(const job of jobs.values())for(const id of job.ids){if(used.has(id))throw new Error('O JSON repete uma runa entre defensores distintos. Corrija os loadouts antes da busca.');used.add(id);}
 return {teams,jobs,runes,used};
}
function sheets(account,job,ids){
 const gear=ids.map(id=>job.runes.get(id)),counts=setCounts(gear);
 return job.contexts.map(({unit,team,config,flat,effects})=>{const stats=calculateStats(unit,gear,flat);return {...stats,combat:combatAttributes(unit,stats,counts,team,config.combat,effects),counts};});
}
function safeSheets(next,floors){return next.every((s,i)=>STATS.every(k=>s.total[k]>=floors[i].total[k])&&s.combat.spd>=floors[i].combat.spd&&Object.entries(floors[i].counts).every(([id,n])=>Math.floor((s.counts[id]||0)/(FOUR.has(Number(id))?4:2))>=Math.floor(n/(FOUR.has(Number(id))?4:2))));}
const score=(rows,floors)=>rows.reduce((sum,s,i)=>sum+STATS.reduce((n,k)=>n+(s.total[k]-floors[i].total[k])/Math.max(1,floors[i].total[k]),0),0);
export function defenseBaselineSignature(account){return JSON.stringify([accountStamp(account),(account?.accountPresets||[]).filter(p=>p.gameMode==='siege'&&p.mode==='defense'),account?.siege,account?.units.map(u=>[u.id,u.runeIds,u.artifactIds]),account?.runes]);}

// Incremental Pareto-safe moves plus two-defender swaps. Every accepted proposal
// is checked against ALL original JSON floors, never projected gems/grinds.
export function improveJsonDefenses(account,options={},reservedIds=[],onProgress=()=>{},{maxPasses=4,maxEvaluations=100000}={}){
 if(!account)throw new Error('Importe seu SWEX antes de planejar defesas.');
 const {teams,jobs,runes,used}=snapshot(account),locks=lockContext(account,options),blocked=new Set([...reservedIds,...(options.blockedRuneIds||[])]),pool=account.runes.filter(r=>(!r.owner||used.has(r.id))&&r.pool!=='rta'&&r.set!==25&&r.set!==99),assignments=new Map([...jobs].map(([id,j])=>[id,[...j.ids]])),floors=new Map([...jobs].map(([id,j])=>[id,sheets(account,j,j.ids)]));
 const bySlot=new Map(Array.from({length:6},(_,i)=>[i+1,pool.filter(r=>r.slot===i+1)]));let evaluations=0,changes=0,exhausted=false;
 const movable=(job,id)=>!locks.units.has(job.unit.id)&&!locks.runes.has(id)&&!blocked.has(id)&&!(options.respectLocks&&runes.get(id)?.locked);
 outer:for(let pass=0;pass<maxPasses;pass++){
  let improved=false;
  for(const [unitId,job] of jobs){
   onProgress({percent:Math.round((pass+([ ...jobs.keys()].indexOf(unitId)+1)/jobs.size)/maxPasses*100),message:`Preservando limites do JSON · ${job.unit.name}`});
   const ids=assignments.get(unitId),current=sheets(account,job,ids),owners=new Map([...assignments].flatMap(([id,gear])=>gear.map(r=>[r,id])));let best=null,bestGain=1e-9;
   for(let slotIndex=0;slotIndex<ids.length;slotIndex++){
    const oldId=ids[slotIndex];if(!movable(job,oldId))continue;
    for(const rune of bySlot.get(runes.get(oldId).slot)||[]){
     if(rune.id===oldId||locks.runes.has(rune.id)||blocked.has(rune.id)||options.respectLocks&&rune.locked)continue;
     if(++evaluations>maxEvaluations){exhausted=true;break outer;}
     const donorId=owners.get(rune.id),donor=donorId&&donorId!==unitId?[donorId,assignments.get(donorId)]:null,other=donor&&jobs.get(donor[0]);
     if(donor&&!movable(other,rune.id))continue;
     if(ids.includes(rune.id))continue;
     const proposed=ids.map(id=>id===oldId?rune.id:id),next=sheets(account,job,proposed);if(!safeSheets(next,floors.get(unitId)))continue;
     let gain=score(next,floors.get(unitId))-score(current,floors.get(unitId)),otherIds;
     if(donor){otherIds=donor[1].map(id=>id===rune.id?oldId:id);const otherNext=sheets(account,other,otherIds);if(!safeSheets(otherNext,floors.get(donor[0])))continue;gain+=score(otherNext,floors.get(donor[0]))-score(sheets(account,other,donor[1]),floors.get(donor[0]));}
     if(gain>bestGain){bestGain=gain;best={proposed,donorId:donor?.[0],otherIds};}
    }
   }
   if(best){assignments.set(unitId,best.proposed);if(best.donorId)assignments.set(best.donorId,best.otherIds);changes++;improved=true;}
  }
  if(!improved)break;
 }
 const report={accountStamp:accountStamp(account),signature:defenseBaselineSignature(account),assignments:Object.fromEntries(assignments),changes,evaluations,bounded:true,exhausted,teamCount:teams.length,status:changes?'improved':'unchanged'};
 verifyDefenseImprovements(account,report,options,reservedIds);
 return {...report,safe:true,members:[...jobs].map(([id,j])=>({unitId:id,name:j.unit.name,before:floors.get(id)[0].total,after:sheets(account,j,assignments.get(id))[0].total})),teams};
}
export function verifyDefenseImprovements(account,report,options={},reservedIds=[]){
 if(report.signature!==defenseBaselineSignature(account))throw new Error('O inventário mudou. Execute novamente a análise das defesas.');
 const {jobs,runes,used}=snapshot(account);
 const all=Object.values(report.assignments||{}).flat();if(new Set(all).size!==all.length)throw new Error('O plano repete recursos entre defensores.');
 if(Object.keys(report.assignments||{}).length!==jobs.size||Object.keys(report.assignments).some(id=>!jobs.has(Number(id))))throw new Error('Plano contém defensores incompatíveis.');
 const locks=lockContext(account,options),blocked=new Set([...reservedIds,...(options.blockedRuneIds||[])]),seen=new Set();
 for(const [id,job] of jobs){
  const next=report.assignments[id];if(!Array.isArray(next)||next.length!==6||next.some(r=>!runes.has(r))||new Set(next.map(r=>runes.get(r).slot)).size!==6)throw new Error('Plano de defesa incompleto.');
  for(const runeId of next){const r=runes.get(runeId);if(seen.has(runeId)||r.pool==='rta'||([25,99].includes(r.set)&&!job.ids.includes(runeId))||r.owner&&!used.has(runeId)||((locks.runes.has(runeId)||blocked.has(runeId)||options.respectLocks&&r.locked)&&!job.ids.includes(runeId)))throw new Error('O plano viola a reserva de recursos das defesas.');seen.add(runeId);}
  if(locks.units.has(id)&&JSON.stringify([...next].sort((a,b)=>a-b))!==JSON.stringify([...job.ids].sort((a,b)=>a-b))||job.ids.some(r=>(locks.runes.has(r)||blocked.has(r)||options.respectLocks&&runes.get(r).locked)&&!next.includes(r)))throw new Error('O plano altera uma runa ou monstro travado.');
  if(!safeSheets(sheets(account,job,next),sheets(account,job,job.ids)))throw new Error('O plano reduz atributos vitais ou conjuntos de uma defesa abaixo do JSON.');
 }
 return true;
}
export function applyDefenseImprovements(account,localTeams,report,options={},reservedIds=[]){
 verifyDefenseImprovements(account,report,options,reservedIds);
 const current=jsonDefenseTeams(account),next=[...localTeams];
 for(const original of current){
  const index=next.findIndex(t=>t.sourceDeckId===original.sourceDeckId),team=index>=0?next[index]:original;
  if(team.configs.length!==original.configs.length||team.configs.some(c=>!original.configs.some(o=>o.unitId===c.unitId)))throw new Error('A composição local de defesa foi alterada. Recarregue o deck do JSON antes de aplicar.');
  const byConfig=Object.fromEntries(team.configs.filter(c=>report.assignments[c.unitId]).map(c=>[c.key,[...report.assignments[c.unitId]]]));
  const updated={...team,plannedRunes:{accountStamp:accountStamp(account),byConfig,appliedAt:new Date().toISOString()}};
  if(index>=0)next[index]=updated;else next.push(updated);
 }
 return next;
}
