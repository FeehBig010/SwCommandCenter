import {normalizeCombat,normalizeScenario} from './speedTuner.js';
import {normalizeLeader} from './leaders.js';
import {normalizeDamageSettings} from './damage.js';
import { blankConfig, SETS, FOUR, STATS } from './data.js';

export const TEMPLATE_TYPE='d8stino-guild-templates';
export const SLOT_MAINS={2:[0,8,2,4,6,1,3,5],4:[0,9,10,2,4,6,1,3,5],6:[0,2,4,6,11,12,1,3,5]};
const fail=message=>{throw new Error(`Template inválido: ${message}`);};
function text(value,max,required=false){
 if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail('texto ausente ou muito longo.');
 return value.trim();
}
function metric(value,max=1000000){
 if(value===''||value===undefined||value===null)return '';
 if(!['string','number'].includes(typeof value)||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>max)fail('meta ou bônus fora do limite.');
 return Number(value);
}
// Whitelist the portable fields: never export account instance IDs or inventory.
export function cleanTemplate(input,{newId=false}={}){
 if(!input||typeof input!=='object'||!input.team||!Array.isArray(input.team.configs)||input.team.configs.length!==3)fail('use exatamente três monstros Siege/WGB.');
 const configs=input.team.configs.map(c=>{
  if(!c||!Number.isSafeInteger(Number(c.masterId))||Number(c.masterId)<=0)fail('selecione um monstro em cada posição.');
  if(!Array.isArray(c.sets)||c.sets.length>3||c.sets.some(id=>!['string','number'].includes(typeof id)||!Number.isInteger(Number(id))))fail('sets inválidos.');
  if(!c.goals||typeof c.goals!=='object'||Array.isArray(c.goals)||!c.mains||typeof c.mains!=='object'||Array.isArray(c.mains))fail('metas ou atributos principais inválidos.');
  if(c.basis!==undefined&&!['bonus','total'].includes(c.basis))fail('base de metas inválida.');
  const sets=c.sets.map(Number).filter(Boolean);
  if(sets.some(id=>!SETS[id]||id===25)||sets.reduce((n,id)=>n+(FOUR.has(id)?4:2),0)>6)fail('sets exigem mais de seis runas ou não são suportados.');
  const mains=Object.fromEntries([2,4,6].map(slot=>{
   const id=Number(c.mains?.[slot]||0);
   if(!SLOT_MAINS[slot].includes(id))fail(`atributo principal do slot ${slot}.`);
   return [slot,id];
  }));
  return {...(c.combat?{combat:normalizeCombat(c.combat)}:{}),...(c.combatSpd!==undefined?{combatSpd:metric(c.combatSpd,10000)||0}:{}),masterId:Number(c.masterId),label:text(c.label,80,true),sets,strictSets:true,mains,
   goals:Object.fromEntries(STATS.map(k=>[k,metric(c.goals?.[k])])),
   basis:c.basis==='bonus'?'bonus':'total',damage:normalizeDamageSettings(c.damage),artifacts:c.artifacts!==false,lockSpeedSync:c.lockSpeedSync===true,
   objective:['balanced','hp','spd','cr','damage'].includes(c.objective)?c.objective:'balanced'};
 });
 return {id:newId?crypto.randomUUID():text(input.id||crypto.randomUUID(),80,true),name:text(input.name,100,true),description:text(input.description||'',1000),
  team:{...(Object.hasOwn(input.team,'leader')?{leader:normalizeLeader(input.team.leader),leaderIndex:Math.min(2,Math.max(0,Number.isInteger(input.team.leaderIndex)?input.team.leaderIndex:0))}:{}),...(input.team.combatScenario?{combatScenario:normalizeScenario(input.team.combatScenario)}:{}),...(input.team.guildSpd!==undefined?{guildSpd:metric(input.team.guildSpd,100)||0}:{}),towerSpd:metric(input.team.towerSpd,100)||0,leaderSpd:metric(input.team.leaderSpd,100)||0,enemyCombatSpd:metric(input.team.enemyCombatSpd,1000)||0,configs}};
}
export function newTemplate(){
 return {id:crypto.randomUUID(),name:'Novo template Siege',description:'',team:{towerSpd:0,leaderSpd:0,enemyCombatSpd:0,configs:Array.from({length:3},()=>({...blankConfig(),masterId:null,basis:'total',strictSets:true}))}};
}
export function templateFile(templates){return {type:TEMPLATE_TYPE,version:1,templates:templates.map(t=>cleanTemplate(t))};}
export function parseTemplateFile(raw){
 if(!raw||raw.type!==TEMPLATE_TYPE||raw.version!==1||!Array.isArray(raw.templates)||!raw.templates.length||raw.templates.length>100)fail('arquivo de templates de guilda incompatível (máximo 100).');
 return raw.templates.map(t=>cleanTemplate(t,{newId:true}));
}
export function templateDraft(template){
 const clean=cleanTemplate(template);
 return {...clean,team:{...clean.team,configs:clean.team.configs.map(c=>({...blankConfig(),...c,enabled:true}))}};
}
export function bindTemplate(template,account){
 const clean=cleanTemplate(template),used=new Set();
 const configs=clean.team.configs.map(c=>{
  const matches=(account?.units||[]).filter(u=>u.master===c.masterId&&!used.has(u.id)).sort((a,b)=>(b.level||0)-(a.level||0)||a.id-b.id);
  const unit=matches[0];if(unit)used.add(unit.id);
  return {...blankConfig(unit,c.label),...c,enabled:true,unitId:unit?.id||null};
 });
 return {id:crypto.randomUUID(),name:clean.name,mode:'defense',gameMode:'siege',priority:1,order:'off',...clean.team,configs,...(clean.team.leader?{leaderKey:configs[clean.team.leaderIndex||0]?.key}:{} )};
}
export function templateMissing(team){return team.configs.filter(c=>!c.unitId).map(c=>c.label);}
