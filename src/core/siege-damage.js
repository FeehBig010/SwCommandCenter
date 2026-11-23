import {canonicalMonsterId,equivalentMonsters} from './CollabMapping.js';
import {estimateRealDamage,normalizeDamageSettings} from './damage.js';
import {equippedTeamBuilds,teamTurnPreview} from './optimizer.js';
import {resolvedDamageSkill} from './quick-skill-effects.js';

// Conditional damage projection of the existing action queue. All equipment
// comes from the caller's builds or the current equipped/planned snapshot.
export function siegeRotationDamage(account,team,target,{builds,options={},variance=1,rignaIgnorePercent,mihyangStrips,defenseBuffRemovedAfterHit}={}){
 if(team.gameMode!=='siege')throw new Error('Selecione um cenário de Siege.');
 if(!target?.key||team.configs.some(config=>config.key===target.key)||target.def==null||target.element==null)throw new Error('Informe a referência, DEF e elemento do alvo.');
 const {enemyDef,enemyElement,enemyDamageReduction,enemyCritReduction,ignoreDefensePercent:providedIgnore,variance:damageVariance}=normalizeDamageSettings({
  enemyDef:target.def,enemyElement:target.element,enemyDamageReduction:target.damageReduction,enemyCritReduction:target.critDamageReduction,
  ignoreDefensePercent:rignaIgnorePercent,variance,
 });
 if(mihyangStrips!==undefined&&(!Number.isInteger(mihyangStrips)||mihyangStrips<0||mihyangStrips>3))throw new Error('Remoções de Mihyang inválidas.');
 if(defenseBuffRemovedAfterHit!==undefined&&(!target.defenseBuff||!mihyangStrips||![1,2,3].includes(defenseBuffRemovedAfterHit)))throw new Error('Informe uma remoção válida de buff de DEF.');
 const selected=builds??equippedTeamBuilds(account,team,options);
 const seenRunes=selected.flatMap(build=>build.runeIds||[]);
 if(selected.some(build=>build.runeIds?.length!==6)||new Set(seenRunes).size!==seenRunes.length)throw new Error('A rotação exige seis runas distintas por build, sem reutilização.');
 const members=team.configs.map((config,index)=>{
  const unit=account.units.find(unit=>unit.id===config.unitId);
  if(config.enabled&&unit&&config.masterId&&!equivalentMonsters(config.masterId,unit.master))throw new Error(`${config.label}: unidade incompatível com o cenário de dano.`);
  const skill=resolvedDamageSkill({...config,masterId:unit?.master??config.masterId,skillLevels:config.skillLevels??unit?.skillLevels});
  return {index,config,unit,skill,build:selected.find(build=>build.key===config.key&&build.unitId===unit?.id)};
 });
 const mihyang=members.find(member=>member.config.enabled&&member.skill?.intrinsicCritical);
 let scenarioTeam=team;
 if(mihyang&&mihyangStrips!==undefined){
  const afterKey=`ally:${mihyang.index}`,combatScenario=team.combatScenario||{};
  const events=(combatScenario.events||[]).filter(event=>!(event.afterKey===afterKey&&Number(event.occurrence??1)===1&&event.type==='boost'));
  if(mihyangStrips>0)events.push({afterKey,type:'boost',amount:15*mihyangStrips,targets:members.filter(m=>m.config.enabled).map(m=>`ally:${m.index}`)});
  scenarioTeam={...team,combatScenario:{...combatScenario,events}};
 }
 const preview=teamTurnPreview(account,scenarioTeam,options,selected,{captureDamageState:true});
 if(!preview.complete)return {complete:false,preview,actions:[],total:null,range:null,risks:['Equipamento incompleto.']};

 const risks=new Set(preview.scenario.risks);
 risks.add('Projeção condicional: dano estimado não determina mortes, procs ou a fila de ações.');
 if(defenseBuffRemovedAfterHit!==undefined)risks.add(`Buff de DEF removido após o golpe ${defenseBuffRemovedAfterHit} de Mihyang por premissa do ramo.`);
 if(mihyang&&mihyangStrips!==undefined)risks.add(`Mihyang: ${mihyangStrips} remoções informadas para este ramo, sem sorteio de resistência.`);
 let defenseBuff=target.defenseBuff===true;
 const actions=[];
 for(const turn of preview.turns.filter(turn=>!turn.enemy)){
  const member=members.find(member=>member.config.key===turn.key);
  const {config,unit,skill,build}=member;
  const atAction=preview.scenario.damageStates.find(row=>row.tick===turn.tick)?.actors;
  const attacker=atAction?.find(actor=>actor.key===turn.key),defender=atAction?.find(actor=>actor.key===target.key);
  const actor=preview.actors.find(actor=>actor.key===turn.key);
  const row={key:turn.key,tick:turn.tick,skill:skill?.slot??null,level:skill?.level??null};
  if(!skill||!build){risks.add(`${config.label}: habilidade sem modelo de dano.`);actions.push({...row,range:null});continue;}
  if(!defender){risks.add('O alvo informado não participa da fila de combate.');actions.push({...row,range:null});continue;}
  if(turn.disabled||defender.dead||!skill.hits){actions.push({...row,range:[0,0],hits:[],attackBuff:attacker.attackBuff});continue;}
  const attackStats={total:actor.attributes,combat:{...actor.attributes,spd:attacker.spd,speedResolved:true}};
  const settings={enemyDef,enemyElement,enemyDamageReduction,enemyCritReduction,variance:damageVariance,
   critBuff:config.damage?.critBuff===true,defenseBuff:config.damage?.defenseBuff===true,skill:skill.slot,skillUps:skill.skillUps,multiplier:skill.multiplier??1,
   spdAtkOffset:skill.spdAtkOffset??0,spdAtkDivisor:skill.spdAtkDivisor??0,enemyHp:defender.hp,selfHp:attacker.hp,
   attackBuff:attacker.attackBuff,armorBreak:target.armorBreak===true,brand:target.brand===true,ignoreDefense:false,
   ownTurn:true,singleTarget:true,resolvedHit:true,hits:1};
  const speedGap=attacker.spd-defender.spd;
  const intrinsicCrit=skill.intrinsicCritical||skill.speedCritical&&!attacker.oblivion&&speedGap>0;
  const preventsCrit=canonicalMonsterId(defender.master)===29711&&!defender.oblivion&&speedGap<0;
  const critModes=preventsCrit?(intrinsicCrit?['normal','critical']:['normal']):[intrinsicCrit?'critical':'expected'];
  if(critModes.length>1)risks.add('Conflito entre crítico intrínseco e a passiva defensiva de Rigna/Ciri: prioridade não verificada.');
  const disadvantage=({1:2,2:3,3:1})[settings.enemyElement]===unit.element;
  const glancingBranches=target.glancing===undefined&&disadvantage?[false,true]:[target.glancing===true];
  if(glancingBranches.length>1)risks.add('Desvantagem elemental: a faixa inclui golpe normal e glancing sem assumir sua probabilidade.');
  const ignoreBranches=skill.speedIgnore&&rignaIgnorePercent==null?[0,100]:[skill.speedIgnore?providedIgnore:0];
  if(skill.speedIgnore)risks.add(rignaIgnorePercent==null
   ?'Rigna/Ciri: a curva SPD → ignore DEF não foi verificada. Faixa de 0–100% usada como limite.'
   :`Rigna/Ciri: ignore DEF de ${rignaIgnorePercent}% fornecido como premissa do cenário.`);
  const hits=[];
  for(let hit=1;hit<=skill.hits;hit++){
   const results=glancingBranches.flatMap(glancing=>ignoreBranches.flatMap(ignoreDefensePercent=>critModes.map(critMode=>estimateRealDamage(unit,attackStats,{
    ...settings,enemyDefenseBuff:defenseBuff,ignoreDefensePercent,
    critMode,glancing,firstAttack:hit===1,
   },actor.effects))));
   hits.push({range:[Math.min(...results.map(result=>result.total)),Math.max(...results.map(result=>result.total))],
    critChance:[Math.min(...results.map(result=>result.critChance)),Math.max(...results.map(result=>result.critChance))],
    enemyDef:enemyDef*(defenseBuff?1.7:1)});
   if(mihyang===member&&hit===defenseBuffRemovedAfterHit)defenseBuff=false;
  }
  actions.push({...row,speedGap,attackBuff:attacker.attackBuff,hits,range:sumRanges(hits)});
 }
 const range=actions.every(action=>action.range)?sumRanges(actions):null;
 return {complete:range!==null,preview,actions,range,total:range&&range[0]===range[1]?range[0]:null,conditional:true,risks:[...risks]};
}

function sumRanges(rows){
 return rows.reduce(([min,max],{range})=>[min+range[0],max+range[1]],[0,0]);
}
