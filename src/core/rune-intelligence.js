import {SETS} from './data.js';
import {accountStamp} from './loadouts.js';
import {compatibleCrafts,simulateRuneCraft} from './rune-crafts.js';

export const INTELLIGENCE_VERSION=1;
export const REAPP_DEFAULTS=Object.freeze({maxBaseSpd:20,targetSpd:20,targetCount:3,protectEquipped:true,advancedInnates:false,selectionVersion:2,prioritySets:[3,10,13,15],prioritySlots:[2,3,4,5,6],normalBudget:800,ancientBudget:200,batchSize:10});
const ROLL={1:375,2:8,3:20,4:8,5:20,6:8,8:6,9:6,10:7,11:8,12:8};
const MAIN_BY_SLOT={1:[3],2:[1,2,3,4,5,6,8],3:[5],4:[1,2,3,4,5,6,9,10],5:[1],6:[1,2,3,4,5,6,11,12]};
const round=n=>Math.round(n*10)/10;
const number=(n,fallback,min,max)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):fallback;
export function reappSettings(input={}){if(input.selectionVersion!==2){const oldSets=JSON.stringify(input.prioritySets)===JSON.stringify([3,13,15]),oldSlots=JSON.stringify(input.prioritySlots)===JSON.stringify([2,4,6]);input={...input,...(oldSets?{prioritySets:REAPP_DEFAULTS.prioritySets}:{}),...(oldSlots?{prioritySlots:REAPP_DEFAULTS.prioritySlots}:{})};}return {...REAPP_DEFAULTS,...input,selectionVersion:2,maxBaseSpd:number(input.maxBaseSpd,20,0,50),targetSpd:number(input.targetSpd,20,1,50),targetCount:Math.floor(number(input.targetCount,3,1,100)),normalBudget:Math.floor(number(input.normalBudget,800,0,100000)),ancientBudget:Math.floor(number(input.ancientBudget,200,0,100000)),batchSize:Math.floor(number(input.batchSize,10,1,1000)),protectEquipped:input.protectEquipped!==false,advancedInnates:input.advancedInnates===true,prioritySets:(Array.isArray(input.prioritySets)?input.prioritySets:REAPP_DEFAULTS.prioritySets).filter(id=>SETS[id]),prioritySlots:(Array.isArray(input.prioritySlots)?input.prioritySlots:REAPP_DEFAULTS.prioritySlots).filter(id=>id>=1&&id<=6)};}
// A selection is a hard boundary for display/planning, not only a score bonus.
export function runeInReappScope(rune,settings=REAPP_DEFAULTS){const s=reappSettings(settings);return rune.stars===6&&rune.originalQuality===5&&s.prioritySets.includes(rune.set)&&s.prioritySlots.includes(rune.slot)&&rune.set!==25&&rune.pool!=='rta';}
// SWEX sec_eff = [stat, value BEFORE grind, enchanted flag, grind]. Never subtract
// the grind from value: that would remove it twice.
export function runeBaseSpd(rune){return Number((rune.subs||[]).find(s=>s[0]===8)?.[1]||0);}
export function runeCategory(rune){return `${rune.ancient?'ancient':'normal'}:${rune.set}:${rune.slot}:${rune.main?.[0]||0}`;}
export function innatePriority(rune,advanced=false){
 const [stat,value]=rune.innate||[];
 if(stat===12&&value>=6&&value<=8||stat===9&&value>=5&&value<=6||stat===10&&value===7||stat===11&&value===8)return {preferred:true,points:20};
 return {preferred:false,points:advanced&&ROLL[stat]&&value>0?8:0};
}
// Own utility index: normal six-star max-roll reference units, eight substat
// rolls at 100. Not SWLens efficiency, a probability or an Ancient roll ceiling.
export function runeQuality(rune){return round(Math.min(100,(rune.subs||[]).reduce((n,s)=>n+(ROLL[s[0]]?Math.min(5,Math.max(0,s[1])/ROLL[s[0]]):0),0)/8*100));}
export function runeSynergy(rune){
 const stats=new Set([rune.main?.[0],...(rune.subs||[]).filter(s=>s[1]>0).map(s=>s[0])]);
 const pairs=[[2,6],[4,9],[4,10],[9,10],[8,2],[8,4],[8,12]];
 return Math.min(12,pairs.filter(([a,b])=>stats.has(a)&&stats.has(b)).length*3);
}
export function reappEligibility(rune,settings=REAPP_DEFAULTS){
 const s=reappSettings(settings),reasons=[];
 if(rune.stars!==6)reasons.push('Reapp conservador exige 6★.');
 if(rune.originalQuality!==5)reasons.push(rune.originalQuality==null?'Raridade original ausente: reimporte o SWEX.':'A runa não é originalmente Legend.');
 if(!SETS[rune.set]||rune.set===25||rune.pool==='rta')reasons.push('Conjunto ou pool sem suporte de reapp validado.');
 if(!MAIN_BY_SLOT[rune.slot]?.includes(rune.main?.[0])||!(rune.main?.[1]>0))reasons.push('Slot ou propriedade principal inválida.');
 if(rune.level<12)reasons.push('Revele os quatro secundários (+12) antes de decidir.');
 if(rune.level>15||rune.subs?.length!==4||new Set((rune.subs||[]).map(e=>e[0])).size!==4||(rune.subs||[]).some(e=>!ROLL[e[0]]||!Number.isFinite(e[1])||e[1]<0)||!Number.isFinite(rune.level))reasons.push('Secundários ou nível incompletos/incompatíveis.');
 if((rune.subs||[]).some(e=>e[0]===rune.main?.[0]||e[0]===rune.innate?.[0]||!Number.isFinite(Number(e[3]||0))||Number(e[3]||0)<0))reasons.push('Atributos repetem principal/innate ou possuem grind inválido.');
 if(runeBaseSpd(rune)>=s.maxBaseSpd)reasons.push(`SPD base fora do filtro (< ${s.maxBaseSpd}).`);
 if(!innatePriority(rune,s.advancedInnates).points)reasons.push('Innate fora da seleção conservadora.');
 return {eligible:!reasons.length,reasons};
}
function linkRune(map,id,label){if(!Number.isSafeInteger(Number(id)))return;const labels=map.get(Number(id))||new Set();labels.add(label);map.set(Number(id),labels);}
function inventoryContext(account,teams,options,reservedIds){
 const equipped=new Map(),builds=new Map(),protectedIds=new Set([...reservedIds,...(options.blockedRuneIds||[]),...(options.localLocks?.runeIds||[])]),units=new Map((account.units||[]).map(u=>[u.id,u]));
 for(const u of units.values())for(const id of u.runeIds||[]){linkRune(equipped,id,u.name||`Unidade ${u.id}`);if(options.localLocks?.unitIds?.includes(u.id))protectedIds.add(id);}
 for(const r of account.runes||[])if(r.owner){linkRune(equipped,r.id,units.get(r.owner)?.name||`Unidade ${r.owner}`);if(options.localLocks?.unitIds?.includes(r.owner))protectedIds.add(r.id);}
 for(const [pool,assignments] of Object.entries(account.equipmentPools||{}))if(pool!=='main')for(const [unitId,ids] of Object.entries(assignments.assignments||{}))for(const id of ids)linkRune(builds,id,`Equipamento ${units.get(Number(unitId))?.name||unitId}`);
 for(const p of account.accountPresets||[]){for(const e of p.equipment||[])for(const id of e.runeIds||[])linkRune(builds,id,p.name||'Preset SWEX');for(const unitId of p.unitIds||[])if(!(p.equipment||[]).some(e=>e.unitId===unitId))for(const id of (p.gameMode==='rta'?account.equipmentPools?.rta?.assignments?.[unitId]:units.get(unitId)?.runeIds)||[])linkRune(builds,id,p.name||'Preset SWEX');}
 for(const t of teams){if(t.accountId!=null&&String(t.accountId)!==String(account.id))continue;if(t.sourceAccountId!=null&&String(t.sourceAccountId)!==String(account.id))continue;
  if(t.plannedRunes?.accountStamp===accountStamp(account))for(const ids of Object.values(t.plannedRunes.byConfig||{}))for(const id of ids)linkRune(builds,id,t.name||'Build salva');
  for(const c of t.configs||[])for(const id of units.get(c.unitId)?.runeIds||[])linkRune(builds,id,t.name||'Time salvo');
 }
 return {equipped,builds,protectedIds};
}
export function runeGaps(runes,settings=REAPP_DEFAULTS){
 const s=reappSettings(settings),groups=new Map();
 for(const r of runes){const key=runeCategory(r);if(!groups.has(key))groups.set(key,{key,ancient:!!r.ancient,set:r.set,slot:r.slot,main:r.main?.[0]||0,speedApplicable:r.main?.[0]!==8,count:0,fast:0,maxSpd:0,sumSpd:0,attributes:{}});const g=groups.get(key),spd=runeBaseSpd(r);g.count++;g.fast+=spd>=s.targetSpd?1:0;g.sumSpd+=spd;g.maxSpd=Math.max(g.maxSpd,spd);for(const stat of r.subs||[]){if(!g.attributes[stat[0]])g.attributes[stat[0]]={count:0,total:0};g.attributes[stat[0]].count++;g.attributes[stat[0]].total+=stat[1];}}
 return [...groups.values()].map(g=>({...g,meanSpd:round(g.sumSpd/g.count),deficit:g.speedApplicable?Math.max(0,s.targetCount-g.fast):0,scarcity:g.speedApplicable?round(Math.max(0,s.targetCount-g.fast)/s.targetCount):0,attributes:Object.fromEntries(Object.entries(g.attributes).map(([key,v])=>[key,{count:v.count,mean:round(v.total/v.count)}]))})).sort((a,b)=>b.deficit-a.deficit||a.set-b.set||a.slot-b.slot||a.main-b.main||Number(a.ancient)-Number(b.ancient));
}
function craftSuggestions(rune,crafts){
 const found=[];
 for(const craft of compatibleCrafts(rune,crafts))for(let index=0;index<(rune.subs||[]).length;index++){
  try{const next=simulateRuneCraft(rune,craft,{index}).rune;
   if(runeBaseSpd(next)<runeBaseSpd(rune)||runeQuality(next)<runeQuality(rune))continue;
   const before=rune.subs[index],after=next.subs[index];if(after[1]+(after[3]||0)<=before[1]+(before[3]||0)&&after[0]===before[0])continue;
   // Gems must strictly improve reference utility, grinds improve a supported stat.
   if(craft.kind==='gem'&&runeQuality(next)<=runeQuality(rune))continue;
   found.push({craftId:craft.id,kind:craft.kind,index,stat:craft.stat,from:before[0]===after[0]?before[1]+(before[3]||0):0,to:after[1]+(after[3]||0),replaces:before[0],quantity:craft.quantity});
  }catch{/* Unsupported/illegal/ineffective combinations are not suggestions. */}
 }
 return found.sort((a,b)=>Number(b.stat===8)-Number(a.stat===8)||(b.to-b.from)-(a.to-a.from)||a.craftId-b.craftId||a.index-b.index).slice(0,3);
}
export function planReapps(rows,settings=REAPP_DEFAULTS){
 const s=reappSettings(settings);
 return Object.fromEntries([['normal',s.normalBudget],['ancient',s.ancientBudget]].map(([kind,budget])=>{const candidates=rows.filter(r=>runeInReappScope(r.rune,s)&&r.classification==='REAPP'&&r.rune.ancient===(kind==='ancient'));const count=Math.min(candidates.length,budget),ids=candidates.slice(0,count).map(r=>r.rune.id);return [kind,{budget,candidateCount:candidates.length,plannedAttempts:count,remaining:budget-count,stages:Array.from({length:Math.ceil(count/s.batchSize)},(_,i)=>({stage:i+1,runeIds:ids.slice(i*s.batchSize,(i+1)*s.batchSize),attempts:Math.min(s.batchSize,count-i*s.batchSize)}))}];}));
}
export function analyzeRunes(account,{teams=[],options={},reservedIds=[],settings={},now=Date.now()}={}){
 const s=reappSettings(settings),runes=[...new Map((account?.runes||[]).map(r=>[r.id,r])).values()].filter(r=>Number.isSafeInteger(r.id)&&r.id>0),gaps=runeGaps(runes,s),byCategory=new Map(gaps.map(g=>[g.key,g])),warnings=[];
 if(!account||!runes.length)return {version:INTELLIGENCE_VERSION,accountId:account?.id||null,rows:[],gaps:[],summary:{total:0,normal:0,ancient:0,averageQuality:0,fast:0},warnings:['Nenhuma runa disponível. Importe um SWEX completo.'],plan:planReapps([],s)};
 const date=Date.parse(account.importedAt);if(!Number.isFinite(date)||now-date>7*86400000||date>now+300000)warnings.push('Exportação antiga ou data desconhecida: reimporte antes de consumir recursos.');
 if(runes.some(r=>r.originalQuality==null))warnings.push('Há runas sem raridade original. Reimporte o SWEX para analisar a elegibilidade.');
 const ctx=inventoryContext(account,teams,options,reservedIds),craftGroups=new Map();for(const c of account.crafts||[]){const key=`${!!c.ancient}:${c.set}`;if(!craftGroups.has(key))craftGroups.set(key,[]);craftGroups.get(key).push(c);}
 const rows=runes.map(rune=>{
  const quality=runeQuality(rune),spd=runeBaseSpd(rune),group=byCategory.get(runeCategory(rune)),innate=innatePriority(rune,s.advancedInnates),eligibility=reappEligibility(rune,s),equipped=ctx.equipped.get(rune.id),builds=ctx.builds.get(rune.id),locked=rune.locked||ctx.protectedIds.has(rune.id),protectedRune=locked||!!builds?.size||s.protectEquipped&&!!equipped?.size;
  const factors=[{label:'Innate',points:innate.points},{label:'Lacuna da categoria',points:Math.round(group.scarcity*20)},{label:'Conjunto prioritário',points:s.prioritySets.includes(rune.set)?10:0},{label:'Slot prioritário',points:s.prioritySlots.includes(rune.slot)?5:0},{label:'Potencial de recuperar rolls',points:Math.round((100-quality)*.3)},{label:'Sinergia atual preservável',points:-runeSynergy(rune)},{label:'Custo dos atributos atuais',points:-Math.round(quality*.35)},{label:'SPD já disponível',points:-Math.round(spd*1.2)},{label:'Proteção / vínculo',points:protectedRune?-100:equipped?.size?-20:0}];
  const score=Math.max(0,Math.min(100,factors.reduce((n,f)=>n+f.points,0))),improvements=!protectedRune&&rune.level>=12?craftSuggestions(rune,craftGroups.get(`${!!rune.ancient}:${rune.set}`)||[]):[];
  let classification='REVISAR',reasons=[...eligibility.reasons];if(rune.main?.[0]===8)reasons.push('SPD na principal: meta de SPD secundário não se aplica a esta categoria.');
  if(protectedRune){classification='PROTEGER';reasons.unshift(locked?'Bloqueio do jogo, reserva ou trava local.':builds?.size?'Vinculada a equipamento/preset/build existente.':'Equipada: preservar por padrão.');}
  else if(quality>=75||spd>=s.targetSpd){classification='PROTEGER';reasons.unshift('Atributos atuais valiosos: baixo SPD sozinho não torna uma runa ruim.');}
  else if(improvements.length){classification='GEMAR/GRINDAR';reasons.unshift('Há pedra compatível no inventário para melhoria sem reapp (teto de roll, sem garantia).');}
  else if(eligibility.eligible&&score>=20){classification='REAPP';reasons.unshift('Legend 6★ revelada, innate selecionada e oportunidade relativa no inventário.');}
  else if(eligibility.eligible)reasons.unshift('Custo de oportunidade alto em relação ao ganho estimado.');
  return {key:`${account.id}:${rune.id}`,rune,classification,score,quality,baseSpd:spd,grindSpd:Number((rune.subs||[]).find(e=>e[0]===8)?.[3]||0),equipped:[...(equipped||[])],builds:[...(builds||[])],protected:!!protectedRune,eligibility,factors,reasons,improvements,category:{count:group.count,fast:group.fast,maxSpd:group.maxSpd,meanSpd:group.meanSpd,deficit:group.deficit}};
 }).sort((a,b)=>b.score-a.score||a.rune.id-b.rune.id);
 return {version:INTELLIGENCE_VERSION,accountId:account.id,accountStamp:accountStamp(account),rows,gaps,summary:{total:runes.length,normal:runes.filter(r=>!r.ancient).length,ancient:runes.filter(r=>r.ancient).length,averageQuality:round(rows.reduce((n,r)=>n+r.quality,0)/runes.length),fast:rows.filter(r=>r.baseSpd>=s.targetSpd).length},warnings,plan:planReapps(rows,s)};
}
