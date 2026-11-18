import {makeTeam,STATS,FOUR} from './data.js';
import {equivalentMonsters} from './CollabMapping.js';
import {accountStamp} from './loadouts.js';
import {importedPreset,prepareOptimizerTeam} from './optimizer-context.js';
import {equippedBuild} from './optimizer.js';
import {artifactEffects} from './artifacts.js';
import {arenaContextOf} from './arena-context.js';
import {siegeAccountTimeline} from './siege-timeline.js';
import {quickConfig} from './quick-calculator.js';
import {skillLevels} from './skill-levels.js';

const members=team=>team.configs.map(c=>({key:c.key,unitId:c.unitId,masterId:c.masterId,enabled:c.enabled!==false}));
const context=team=>({gameMode:team.gameMode,mode:team.mode,arenaContext:team.arenaContext,dungeon:team.dungeon,leader:team.leader,leaderKey:team.leaderKey,towerSpd:team.towerSpd,guildSpd:team.guildSpd,leaderSpd:team.leaderSpd,enemyCombatSpd:team.enemyCombatSpd,combatScenario:team.combatScenario,enemyDefense:team.enemyDefense,arenaScenario:team.arenaScenario,useRtaTickRate:team.useRtaTickRate,referencePolicy:team.referencePolicy,gamePlacement:team.gamePlacement,
 configs:team.configs.map(c=>({key:c.key,sets:c.sets,combat:c.combat,artifacts:c.artifacts,skillLevels:c.skillLevels,firstTurnSkillSlot:c.firstTurnSkillSlot,firstTurnSkillLevel:c.firstTurnSkillLevel,skillupProfile:c.skillupProfile,fullSkill:c.fullSkill,skillBoostBonus:c.skillBoostBonus})).sort((a,b)=>String(a.key).localeCompare(String(b.key)))});
const sourceContext=team=>JSON.stringify({members:members(team),leaderIndex:team.leaderIndex,sourceDeckId:team.sourceDeckId,sourceAccountId:team.sourceAccountId,plannedRunes:team.plannedRunes,context:context(team)});

export function activeSyncHandoff(handoff,account){return account&&handoff?.accountStamp===accountStamp(account)?handoff:null;}

// An explicit visit from a row starts with the same real equipment and combat
// assumptions as that row. This snapshot is detached from both optimizer and SWEX.
export function optimizerSyncHandoff(input,account,options={},builds=null){
 if(!account)throw new Error('Importe seu SWEX para verificar a sincronia deste time.');
 if(!input||!['siege','arena'].includes(input.gameMode))throw new Error('Selecione um time Siege ou Arena.');
 const team=prepareOptimizerTeam(input),preset=importedPreset(team,account),equipment=new Map((preset?.equipment||[]).map(e=>[e.unitId,e]));
 const snapshot={...account,units:account.units.map(u=>equipment.has(u.id)?{...u,runeIds:equipment.get(u.id).runeIds??u.runeIds,artifactIds:equipment.get(u.id).artifactIds??u.artifactIds}:u)};
 const usedUnits=new Set(),usedRunes=new Set(),byConfig={};
 const configs=team.configs.map(c=>{
  if(c.enabled===false)return {...quickConfig(c.masterId,c.label),...c,manual:c.manual||{base:{...(snapshot.units.find(u=>u.id===c.unitId)?.base||quickConfig().manual.base)},sheet:{...(snapshot.units.find(u=>u.id===c.unitId)?.base||quickConfig().manual.sheet)}}};
  const unit=snapshot.units.find(u=>u.id===c.unitId);
  if(!unit||usedUnits.has(unit.id))throw new Error('Confira as cópias da composição e o equipamento no SWEX.');
  usedUnits.add(unit.id);
  const build=builds?.find(b=>b.key===c.key&&b.unitId===c.unitId&&(!b.teamId||b.teamId===team.id))||equippedBuild(snapshot,team,c,options);
  if(!build?.stats?.total||build.runeIds?.length!==6||build.runeIds.some(id=>usedRunes.has(id)))throw new Error(`${c.label}: complete o equipamento de 6 runas para verificar a sincronia.`);
  build.runeIds.forEach(id=>usedRunes.add(id));
  byConfig[c.key]=[...build.runeIds];
  const sets=Object.entries(build.counts||{}).flatMap(([id,n])=>Array(Math.floor(n/(FOUR.has(Number(id))?4:2))).fill(Number(id))).filter(id=>id!==25&&id!==99);
  const levels=skillLevels(unit.skillLevels);
  return {...c,autoSpeed:false,tickTarget:null,sets,skillLevels:levels,skillLevelSource:levels.length?'swex':'unknown',manual:{base:{...unit.base},sheet:{...build.stats.total}},snapshotArtifactEffects:artifactEffects(snapshot,unit,options.artifacts!==false&&c.artifacts!==false)};
 });
 // Reuse the same Siege reference resolution as the originating row. Only
 // actors with measured/derived speed become simulated enemies; deadlines and
 // unidentified defenders stay metadata rather than fabricated speeds.
 const combatScenario=structuredClone(team.combatScenario||{enemies:[],events:[]});
 let syncReferenceNotes=[];
 if(team.gameMode==='siege'&&team.enemyDefense?.length){
  const timeline=siegeAccountTimeline(snapshot,team,options,builds||[]);
  const resolved=timeline.actors.filter(a=>a.enemy&&String(a.key).startsWith('defense:')&&a.key!=='defense:reference');
  combatScenario.enemies=[...(combatScenario.enemies||[]),...resolved.map(a=>({master:a.master,label:a.name,spd:a.rawSpd??a.spd,...(a.combat?{combat:a.combat}:{})}))];
  syncReferenceNotes=[...(timeline.unknownDefense||[]).map(name=>`${name}: SPD desconhecida`),...(timeline.references||[]).map(r=>`${r.name}: somente meta tick ${r.tick}, sem SPD conhecida`)];
 }
 const quick=structuredClone({...team,combatScenario,syncReferenceNotes,configs,plannedRunes:{accountStamp:accountStamp(account),byConfig},speedMode:'snapshot',sheetSpeedFormula:true,balanceEnabled:true,automaticSync:null,syncAudit:null});
 return {token:crypto.randomUUID(),accountStamp:accountStamp(account),sourceTeamId:input.id,sourceMembers:members(input),sourceContext:sourceContext(input),quickContext:JSON.stringify(context(quick)),returnArea:team.gameMode,returnArenaContext:team.gameMode==='arena'?arenaContextOf(team):null,team:quick};
}

// Only the explicitly displayed sheet SPD is returned. Retain all existing
// constraints, gear, identity and other goals, including edits made elsewhere.
export function applyQuickSyncGoals(original,quick,handoff,account){
 if(!account||handoff?.accountStamp!==accountStamp(account))throw new Error('A conta foi atualizada. Abra novamente a sincronia do time.');
 if(!original||original.id!==handoff.sourceTeamId||sourceContext(original)!==handoff.sourceContext)throw new Error('A composição ou o contexto do time de origem mudou. Abra novamente a sincronia.');
 const sorted=list=>[...list].sort((a,b)=>String(a.key).localeCompare(String(b.key)));
 if(!quick||JSON.stringify(sorted(members(quick)))!==JSON.stringify(sorted(handoff.sourceMembers))||JSON.stringify(context(quick))!==handoff.quickContext)throw new Error('A composição ou o contexto da calculadora mudou. Reabra a sincronia no time de origem.');
 const byKey=new Map(quick.configs.map(c=>[c.key,c]));
 return {...original,configs:original.configs.map(c=>{
  if(c.enabled===false)return c;
  const sheet=Number(byKey.get(c.key)?.manual?.sheet?.spd),base=Number(account.units.find(u=>u.id===c.unitId)?.base?.spd);
  if(!Number.isFinite(sheet)||sheet<=0||sheet>10000||!Number.isFinite(base)||sheet<base)throw new Error(`${c.label}: meta de SPD inválida.`);
  return {...c,goals:{...c.goals,spd:c.basis==='bonus'?sheet-base:sheet}};
 })};
}
// Transfer goals, never fictitious manual sheets or equipment, into the real optimizer.
export function quickOptimizerPlan(quick,account){
 if(!account)throw new Error('Importe seu SWEX para buscar runas no inventário da conta.');
 if(!['siege','arena'].includes(quick.gameMode))throw new Error('Abra Siege ou Arena para construir este time no Otimizador Avançado.');
 const used=new Set(),configs=quick.configs.map(c=>{
  const unit=account.units.filter(u=>!used.has(u.id)&&equivalentMonsters(u.master,c.masterId)).sort((a,b)=>Number(b.id===c.unitId)-Number(a.id===c.unitId)||b.level-a.level)[0];
  if(!unit)throw new Error(`${c.label}: nenhuma cópia disponível na conta. Confira o SWEX.`);used.add(unit.id);
  const {manual,...config}=c;
  return {...config,unitId:unit.id,masterId:unit.master,label:unit.name,enabled:true,goals:Object.fromEntries(STATS.map(k=>[k,c.goals[k]!==''&&c.goals[k]!=null?c.goals[k]:Math.max(0,Number(manual.sheet[k])-(c.basis==='bonus'&&!['cr','cd','res','acc'].includes(k)?unit.base[k]:0))]))};
 });
 return {...makeTeam(quick.gameMode),name:quick.name,autoName:quick.autoName,origin:'calculator',sourceDeckId:null,sourceAccountId:account.id,leaderIndex:quick.leaderIndex||0,optimizerSpeedSync:true,combatScenario:structuredClone(quick.combatScenario||{enemies:[],events:[]}),configs};
}
