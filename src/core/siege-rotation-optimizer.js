import {canonicalMonsterId} from './CollabMapping.js';
import {DEFAULT_OPTIONS} from './data.js';
import {catalogLeader} from './leader-catalog.js';
import {lockContext} from './locks.js';
import {plannedReservations} from './loadouts.js';
import {equippedTeamBuilds,optimize} from './optimizer.js';
import {priorityReservations} from './attack-tradeoffs.js';
import {assertMainPool} from './equipment-pools.js';
import {normalizeDamageSettings} from './damage.js';
import {resolvedDamageSkill} from './quick-skill-effects.js';
import {siegeRotationDamage} from './siege-damage.js';
import {firstRotationSafe} from './speedTuner.js';
import {resolveSwexAttackLoadout} from './swex-attack-loadout.js';
import {reorderTeam} from './team-ux.js';

const TRIO=[26811,18311,29711];
const LIMITS={fast:80,balanced:160,deep:240};
const numberOrNull=value=>value==null||value===''?null:Number(value);

export function isSiegeRotationTrio(team){
 return team.gameMode==='siege'&&team.active!==false&&team.configs.length===3&&TRIO.every(master=>team.configs.some(c=>c.enabled&&c.unitId&&canonicalMonsterId(c.masterId)===master));
}

function scenarioTarget(raw,team){
 const spd=numberOrNull(raw.spd),def=numberOrNull(raw.def),hp=numberOrNull(raw.hp),ignorePercent=numberOrNull(raw.ignorePercent);
 if(!Number.isFinite(spd)||spd<=0||spd>10000||!Number.isFinite(def)||def<0||hp!==null&&(!Number.isFinite(hp)||hp<=0))throw new Error('Informe SPD e DEF do alvo. HP, quando informado, deve ser positivo.');
 const {enemyElement:element}=normalizeDamageSettings({enemyDef:def,enemyElement:raw.element,ignoreDefensePercent:ignorePercent});
 const hits=raw.defenseBuff===true?Number(raw.stripAfterHit??1):null;
 if(hits!==null&&![1,2,3].includes(hits))throw new Error('Selecione em qual golpe ocorre a remoção hipotética.');
 const configured=team.combatScenario||{},enemies=[...(configured.enemies||[])];
 const previous=enemies[0]||team.enemyReference||team.enemyDefense?.[0]||{};
 enemies[0]={...previous,spd,label:previous.label||'Alvo informado'};
 return {target:{key:'enemy:0',spd,def,hp,element,defenseBuff:hits!==null,ignorePercent,stripAfterHit:hits},
  team:{...team,combatScenario:{...configured,enemies}}};
}

function checkedBuilds(builds,order){
 const runeIds=builds.flatMap(b=>b.runeIds),artifactIds=builds.flatMap(b=>b.artifactIds);
 return builds.length===order.length&&runeIds.length===18&&new Set(runeIds).size===18&&new Set(artifactIds).size===artifactIds.length;
}

function evaluateOrder(account,order,target,options,builds,{ranking=false}={}){
 const keys=order.configs.map(c=>c.key);
 const scenarios=[{label:'Sem remoção',mihyangStrips:0}];
 if(target.defenseBuff)scenarios.push({label:'Remove DEF',mihyangStrips:1,defenseBuffRemovedAfterHit:target.stripAfterHit});
 const validTiming=preview=>preview.complete&&preview.cut===false&&firstRotationSafe(preview.scenario,keys,{consecutiveTicks:false})&&order.configs.every(config=>{
  const turn=preview.turns.find(t=>t.key===config.key);
  return [config.maxTick,config.combat?.targetTick].every(limit=>!Number(limit)||turn.tick<=Number(limit));
 });
 const branches=scenarios.map(({label,...settings})=>{
  const projection=siegeRotationDamage(account,order,target,{
   ...settings,builds,options,rignaIgnorePercent:target.ignorePercent??undefined,validatePreview:ranking?validTiming:undefined,
  });
  const {preview,actions,range,risks}=projection;
  const valid=projection.complete&&validTiming(preview);
  const win=!range||target.hp===null?'sem-hp':range[0]>=target.hp?'atinge-hp-no-ramo':range[1]<target.hp?'abaixo-do-hp':'depende-do-dano';
  return {label,range,valid,win,actions,risks,turns:preview.turns};
 });
 const matching=branches.every(b=>b.valid);
 const ranges=branches.filter(b=>b.range).map(b=>b.range);
 return {keys,branches,valid:matching,builds,lower:ranges.length?Math.min(...ranges.map(r=>r[0])):null,upper:ranges.length?Math.max(...ranges.map(r=>r[1])):null};
}

function strongest(a,b){return b.upper-a.upper||b.lower-a.lower;}
function safest(a,b){return b.lower-a.lower||b.upper-a.upper;}

export function optimizeSiegeRotation(account,input,rawTarget,rawOptions={},progress=()=>{},reservedIds=[],allTeams=[]){
 const started=Date.now();
 if(!account||!isSiegeRotationTrio(input))throw new Error('Selecione Adriana, Mihyang e Rigna/Ciri no Siege com três cópias do SWEX.');
 assertMainPool([input],rawOptions);
 const byId=new Map(account.units.map(unit=>[unit.id,unit]));
 for(const config of input.configs)if(canonicalMonsterId(byId.get(config.unitId)?.master)!==canonicalMonsterId(config.masterId))throw new Error('As cópias do cenário devem corresponder ao SWEX.');
 const options={...DEFAULT_OPTIONS,...rawOptions,maxGrindsGems:false};
 const locks=lockContext(account,options);
 const ownerByRune=new Map();
 for(const unit of account.units)for(const id of unit.runeIds||[])ownerByRune.set(id,unit.id);
 const blocked=[...new Set([...reservedIds,...priorityReservations(account,allTeams,input.id),...plannedReservations(allTeams,account,input.id),...(options.blockedRuneIds||[])])];
 const ids=new Set(input.configs.map(c=>c.unitId));
 const snapshot={...account,units:account.units.map(unit=>ids.has(unit.id)&&!locks.units.has(unit.id)?resolveSwexAttackLoadout(account,input,unit).unit:unit)};
 const artifactIds=snapshot.units.filter(u=>ids.has(u.id)).flatMap(u=>u.artifactIds||[]);
 if(new Set(artifactIds).size!==artifactIds.length)throw new Error('Há artefato repetido no snapshot do trio.');
 const mihyang=input.configs.find(c=>canonicalMonsterId(c.masterId)===18311);
 let {team,target}=scenarioTarget(rawTarget,{...input,leaderKey:mihyang.key,leader:catalogLeader(18311),autoOpener:true,order:'off'});
 const leoTarget=team.configs[team.leoTarget||0]?.key;
 team={...team,configs:team.configs.map(c=>{
  const slot=canonicalMonsterId(c.masterId)===26811?3:2;
  return {...c,firstTurnSkillSlot:slot,firstTurnSkillLevel:Number(c.firstTurnSkillSlot)===slot?c.firstTurnSkillLevel:undefined};
 })};
 for(let i=0;i<TRIO.length;i++){
  const from=team.configs.findIndex(c=>canonicalMonsterId(c.masterId)===TRIO[i]);
  if(from!==i)team=reorderTeam(team,from,i);
 }
 const orders=[team,reorderTeam(team,1,2)].map(order=>({...order,gamePlacement:order.configs.map(c=>c.key),leoTarget:Math.max(0,order.configs.findIndex(c=>c.key===leoTarget))}));
 const artifactByUnit=new Map(snapshot.units.filter(u=>ids.has(u.id)).map(u=>[u.id,u.artifactIds||[]]));
 const withArtifacts=(build,config)=>({...build,artifactIds:options.artifacts&&config.artifacts!==false?[...artifactByUnit.get(config.unitId)]:[]});
 const actual=equippedTeamBuilds(snapshot,team,options).map(build=>withArtifacts(build,team.configs.find(c=>c.key===build.key)));
 const currentPlacement=input.gamePlacement||input.configs.map(c=>c.key);
 const baseline=checkedBuilds(actual,team.configs)?orders.map(order=>evaluateOrder(snapshot,{...order,gamePlacement:currentPlacement},target,options,actual))
  .sort((a,b)=>Number(b.valid)-Number(a.valid))[0]:null;
 const searchAccount={...snapshot,runes:account.runes.filter(rune=>{
  const owner=rune.owner||ownerByRune.get(rune.id);
  return !owner||ids.has(owner);
 })};
 const candidateTeam={...team,optimizerSpeedSync:false,configs:team.configs.map(config=>{
  const unit=byId.get(config.unitId),skill=resolvedDamageSkill({...config,skillLevels:config.skillLevels??unit.skillLevels});
  return skill?.hits?{...config,focuses:[],objective:'damage',balanceWeights:null,matchTarget:false,damage:{...skill,enabled:true,enemyDef:target.def,
   enemyElement:target.element,attackBuff:true,speedBuff:true,ignoreDefensePercent:skill.speedIgnore?target.ignorePercent??0:0,variance:1}}
   :{...config,focuses:[],objective:'spd',balanceWeights:null,matchTarget:false};
 })};
 const evaluated=[],seen=new Set(),bestByOrder=new Map();
 let checked=0,limitReached=false;
 const limit=LIMITS[options.depth]??LIMITS.balanced;
 const result=optimize(searchAccount,[candidateTeam],options,progress,blocked,null,assignments=>{
  const builds=team.configs.map(c=>{
   const build=assignments[c.key],unit=byId.get(c.unitId);
   return withArtifacts({...build,key:c.key,unitId:unit.id,name:unit.name},c);
  });
  const identity=builds.map(b=>b.runeIds.slice().sort((a,b)=>a-b).join(',')).join('|');
  if(seen.has(identity)||!checkedBuilds(builds,team.configs))return null;
  if(checked>=limit){limitReached=true;return null;}
  seen.add(identity);
  checked++;
  if(checked%10===0)progress({percent:99,message:`Avaliando dano e anti-corte · ${checked} conjuntos`});
  const valid=orders.map(order=>evaluateOrder(snapshot,order,target,options,builds,{ranking:true})).filter(row=>row.valid);
  for(const row of valid){
   evaluated.push(row);
   const key=row.keys.join('|'),previous=bestByOrder.get(key);
   if(!previous||strongest(row,previous)<0)bestByOrder.set(key,row);
  }
  return valid.length?Math.max(...valid.map(row=>row.upper)):null;
 });
 const best=evaluated.slice().sort(strongest)[0],robust=evaluated.slice().sort(safest)[0];
 const alternatives=[];
 if(best)alternatives.push({...best,kind:'damage'});
 if(best&&robust&&robust.lower-best.lower>=Math.max(1,best.lower*.01))alternatives.push({...robust,kind:'robust'});
 if(baseline)alternatives.push({...baseline,kind:'current'});
 const meaningfulOrders=orders.map(order=>{
  const keys=order.configs.map(c=>c.key),best=bestByOrder.get(keys.join('|'));
  return {keys,lower:best?.lower??null,upper:best?.upper??null};
 });
 return {status:best?'complete':'no-valid-allocation',alternatives,orders:meaningfulOrders,checked,limit,limitReached,elapsed:Date.now()-started,target,
  names:Object.fromEntries(team.configs.map(c=>[c.key,byId.get(c.unitId).name])),failures:best?[]:result.failures};
}
