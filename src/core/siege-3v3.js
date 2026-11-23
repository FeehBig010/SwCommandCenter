import {canonicalMonsterId} from './CollabMapping.js';
import {DEFAULT_OPTIONS} from './data.js';
import {monsterLeader,monsterRecord} from './monsterDatabase.js';
import {quickSkillOptions} from './quick-skill-effects.js';
import {accountStamp,plannedReservations,currentRuneIds} from './loadouts.js';
import {lockContext} from './locks.js';
import {equippedTeamBuilds} from './optimizer.js';
import {normalizeScenario,PASSIVES} from './speedTuner.js';
import {siegeRotationDamage} from './siege-damage.js';
import {resolveSwexAttackLoadout} from './swex-attack-loadout.js';

const TRIO=[26811,18311,29711];
const DAMAGE_TRIGGERED=new Set(['ragdoll','sonia','abellio','abellio_beast','antares']);
const LIMITS={hp:[1,10000000],def:[0,100000],spd:[1,10000]};
export const DEFENDER_ACTIONS={
 unknown:'Efeito desconhecido',none:'Sem efeito relevante (premissa)',boost:'Aumentar ATB',reduce:'Reduzir ATB',
 damage:'Dano resolvido (% do HP)',speed_buff:'Aplicar buff SPD',slow:'Aplicar slow',leo_attack:'Leo · redução de ATB',
};

export function siege3v3Presets(account,team){
 const ids=team.configs.map(c=>c.unitId);
 return (account?.accountPresets||[]).filter(p=>p.gameMode==='siege'&&ids.every(id=>p.unitIds?.includes(id))&&ids.every(id=>p.equipment?.some(e=>e.unitId===id&&e.runeIds?.length===6)));
}

function checkedNumber(value,[min,max]){
 return value!==''&&value!=null&&Number.isFinite(Number(value))&&Number(value)>=min&&Number(value)<=max;
}

function defenseSetup(raw){
 const {defenders}=raw;
 if(!Array.isArray(defenders)||defenders.length!==3)return null;
 if(defenders.some(d=>!monsterRecord(d.master)||Object.entries(LIMITS).some(([key,range])=>!checkedNumber(d[key],range))))return null;
 return defenders.map((d,i)=>{
  const record=monsterRecord(d.master),mode=d.mode??'unknown';
  if(!Object.hasOwn(DEFENDER_ACTIONS,mode))throw new Error('Ação defensiva inválida.');
  if(mode==='leo_attack'&&(canonicalMonsterId(d.master)!==16613||d.combat?.oblivion===true))throw new Error('A ação automática de Leo exige Leo sem Oblivion.');
  const skill=quickSkillOptions(record.master).find(s=>s.slot===Number(d.skillSlot)&&!s.isPassive);
  if(d.skillSlot&&!skill)throw new Error('Habilidade defensiva inválida.');
  const key=`enemy:${i}`,target=d.target??(mode==='boost'?key:'ally:0');
  if(!/^(ally|enemy):[0-2]$/.test(target))throw new Error('Alvo da ação defensiva inválido.');
  const amount=['boost','reduce','damage'].includes(mode)?Number(d.amount):0;
  if(!Number.isFinite(amount)||amount<0||amount>100)throw new Error('Informe a quantidade da ação defensiva (0–100).');
  const event=['none','unknown'].includes(mode)?null:{afterKey:key,type:mode,targets:[target],amount,critical:d.critical===true,glancing:d.glancing===true};
  return {...d,key,mode,event,skill:skill?.name??null,label:record.name,element:Number(d.master)%10,master:Number(d.master),spd:Number(d.spd),hp:Number(d.hp),def:Number(d.def)};
 });
}

function offenseContext(account,input,profile,options,raw,allTeams,reservedIds){
 const preset=profile.presetId? siege3v3Presets(account,input).find(p=>p.id===profile.presetId):null;
 if(profile.presetId&&!preset)throw new Error('Preset ofensivo incompatível com o trio.');
 const source=preset?{...input,sourceDeckId:preset.id,sourceAccountId:account.id,plannedRunes:null}:input;
 const members=new Set(source.configs.map(c=>c.unitId)),original=new Map(account.units.map(u=>[u.id,u]));
 const snapshot={...account,units:account.units.map(u=>members.has(u.id)?resolveSwexAttackLoadout(account,source,u).unit:u)};
 const custom=profile.runes;
 const conflicts=[];
 const protection=new Map();
 const add=(kind,id,reason)=>{const key=`${kind}:${id}`;protection.set(key,[...new Set([...(protection.get(key)||[]),reason])]);};
 for(const id of [...reservedIds,...(options.blockedRuneIds||[]),...plannedReservations(allTeams,account,input.id)])add('runa',id,'Reserva ou proteção do Build Lab');
 for(const id of raw.protectedPresets||[]){
  const protectedPreset=account.accountPresets?.find(p=>p.id===id);
  if(!protectedPreset||protectedPreset.id===source.sourceDeckId&&!custom)continue;
  for(const e of protectedPreset.equipment||[]){
   for(const rune of e.runeIds||[])add('runa',rune,`Preset protegido: ${protectedPreset.name}`);
   for(const artifact of e.artifactIds||[])add('artefato',artifact,`Preset protegido: ${protectedPreset.name}`);
  }
 }
 const byRune=new Map(account.runes.map(r=>[r.id,r])),byArtifact=new Map((account.artifacts||[]).map(a=>[a.id,a]));
 const locks=lockContext(account,options),seen=new Set(),notes=[];
 for(const config of source.configs){
  const unit=snapshot.units.find(u=>u.id===config.unitId),originalUnit=original.get(config.unitId);
  if(!unit)throw new Error('A cópia ofensiva não consta no inventário.');
  const ids=custom?.[config.key]??currentRuneIds(snapshot,source,config,unit);
  const records=ids.map(id=>byRune.get(id));
  if(ids.length!==6||records.some(r=>!r||r.pool==='rta')||new Set(records.map(r=>r?.slot)).size!==6)conflicts.push(`${unit.name}: seis slots distintos com runas de inventário são obrigatórios.`);
  if(locks.units.has(unit.id)&&(ids.length!==originalUnit.runeIds.length||originalUnit.runeIds.some(id=>!ids.includes(id))))conflicts.push(`${unit.name}: a troca proposta modifica a cópia travada.`);
  if(locks.units.has(unit.id)&&((unit.artifactIds||[]).length!==(originalUnit.artifactIds||[]).length||
   (originalUnit.artifactIds||[]).some(id=>!unit.artifactIds?.includes(id))))conflicts.push(`${unit.name}: a troca proposta modifica os artefatos da cópia travada.`);
  if(originalUnit.runeIds.some(id=>locks.runes.has(id)&&!ids.includes(id)))conflicts.push(`${unit.name}: a troca proposta remove uma runa travada localmente.`);
  for(const [kind,records] of [['runa',ids],['artefato',unit.artifactIds||[]]]){
   for(const id of records){
    const key=`${kind}:${id}`,item=(kind==='runa'?byRune:byArtifact).get(id);
    if(!item)conflicts.push(`${kind} #${id}: registro ausente no inventário.`);
    if(item?.owner&&item.owner!==unit.id)notes.push(`${kind} #${id}: pertence à cópia #${item.owner} no inventário principal.`);
    if(seen.has(key))conflicts.push(`${kind} #${id}: ID repetido na ofensiva.`);
    seen.add(key);
    for(const reason of protection.get(key)||[])conflicts.push(`${kind} #${id}: ${reason}.`);
    if(kind==='runa'&&(locks.runes.has(id)||options.respectLocks&&item?.locked)&&!originalUnit.runeIds.includes(id)){
     conflicts.push(`Runa #${id}: a troca proposta usa uma peça travada.`);
    }
   }
  }
 }
 return {snapshot,source:custom?{...source,plannedRunes:{accountStamp:accountStamp(snapshot),byConfig:custom}}:source,conflicts:[...new Set(conflicts)],notes:[...new Set(notes)]};
}

export function validateSiege3v3(account,team,raw={},options={},reservedIds=[],allTeams=[]){
 const defenders=defenseSetup(raw);
 if(!defenders)return {status:'REVIEW REQUIRED',issue:'Selecione três defensores e informe HP, DEF e SPD para cada um.',reports:[]};
 if(team.gameMode!=='siege'||team.configs.length!==3||!TRIO.every(id=>team.configs.some(c=>c.enabled&&canonicalMonsterId(c.masterId)===id)))throw new Error('Selecione o trio de Siege completo.');
 options={...DEFAULT_OPTIONS,...options};
 const reports=[];
 for(const profile of (raw.profiles?.length?raw.profiles:[{label:'Configuração atual'}]).slice(0,3)){
  const {snapshot,source,conflicts,notes}=offenseContext(account,team,profile,options,raw,allTeams,reservedIds);
  const leader=source.configs.find(c=>canonicalMonsterId(c.masterId)===18311);
  const scenario={...source,leader:monsterLeader(18311),leaderKey:leader.key,autoOpener:true,autoEnemyPassives:false,enemyDefense:[],enemyCombatSpd:0,
   configs:source.configs.map(config=>{
    const master=canonicalMonsterId(config.masterId),slot=master===26811?3:2;
    return {...config,firstTurnSkillSlot:slot,firstTurnSkillLevel:Number(config.firstTurnSkillSlot)===slot?config.firstTurnSkillLevel:undefined};
   }),combatScenario:normalizeScenario({enemies:defenders,events:defenders.flatMap(d=>d.event?[d.event]:[])})};
  const builds=equippedTeamBuilds(snapshot,scenario,options);
  const equipment=scenario.configs.map(c=>{
   const unit=snapshot.units.find(u=>u.id===c.unitId),build=builds.find(b=>b.key===c.key);
   return {key:c.key,name:unit.name,unitId:unit.id,runeIds:build?.runeIds||[],artifactIds:unit.artifactIds||[],stats:build?.stats.combat};
  });
  const mi=scenario.configs.find(c=>canonicalMonsterId(c.masterId)===18311),rigna=scenario.configs.find(c=>canonicalMonsterId(c.masterId)===29711);
  const planned={ [mi.key]:0,[rigna.key]:0,...raw.attackTargets };
  if(Object.entries(planned).some(([key,i])=>![mi.key,rigna.key].includes(key)||![0,1,2].includes(i)))throw new Error('Escolha um dos três defensores como alvo de cada ataque.');
  const mihyangTarget=defenders[planned[mi.key]];
  const invalidEquipment=builds.length!==3||new Set(builds.flatMap(b=>b.runeIds)).size!==18;
  if(invalidEquipment){reports.push({label:profile.label,status:conflicts.length?'BLOCKED':'REVIEW REQUIRED',conflicts,notes,equipment,branches:[],issues:['Equipamento ofensivo incompleto ou repetido.']});continue;}
  const branches=(mihyangTarget.defenseBuff?[0,1]:[0]).map(strip=>{
   let preview;
   const targets=defenders.map((d,i)=>{
    const attackKeys=Object.keys(planned).filter(k=>planned[k]===i);
    const project=(variance,ignorePercent=raw.ignorePercent)=>siegeRotationDamage(snapshot,scenario,d,{
     variance,
     builds,options,attackKeys,mihyangStrips:strip,rignaIgnorePercent:ignorePercent===''?undefined:ignorePercent,
     defenseBuffRemovedAfterHit:strip&&d===mihyangTarget?1:undefined,
    });
    const projection=project(.972),upper=project(1.028);
    preview=projection.preview;
    const hp=d.hp*Number(d.combat?.hpPercent??100)/100;
    const range=projection.range&&upper.range?[projection.range[0],upper.range[1]]:null;
    const outcome=!range?'unknown':range[0]>=hp?'reaches':range[1]<hp?'short':'conditional';
    const ignoreDependency=d.required&&attackKeys.includes(rigna.key)&&outcome==='reaches'&&Number(raw.ignorePercent)>0&&((project(.972,0).range?.[0]??0)<hp);
    const uncertain=ignoreDependency||projection.actions.some(a=>a.hits?.some(h=>h.critChance[0]!==h.critChance[1]||h.critChance[0]>0&&h.critChance[0]<100));
    return {key:d.key,label:d.label,hp,required:d.required===true,range,outcome,uncertain,ignoreDependency,actions:projection.actions,risks:projection.risks};
   });
   const turns=preview.scenario.turns,allies=preview.actors.map(a=>a.key);
   const firstTurns=preview.turns;
   const last=Math.max(...firstTurns.filter(t=>!t.enemy).map(t=>t.tick));
   const early=turns.filter(t=>t.enemy&&t.tick<last&&!t.disabled);
   const unknown=early.some(t=>defenders.find(d=>d.key===t.key)?.mode==='unknown')||new Set(early.map(t=>t.key)).size!==early.length;
   const defeatCouldChangeCut=early.some(t=>targets.some(target=>target.key===t.key&&target.actions.some(a=>a.tick<t.tick&&a.range?.[1]>0)&&
    target.actions.filter(a=>a.tick<t.tick).reduce((sum,a)=>sum+(a.range?.[1]||0),0)>=target.hp));
   const cut=firstTurns.filter(t=>!t.enemy&&!t.disabled).length!==allies.length||early.length>0;
   return {strip,turns,events:preview.scenario.log,targets,cut,unknown:unknown||defeatCouldChangeCut,risks:[...new Set(preview.scenario.risks)],outcome:targets.filter(t=>t.required)};
  });
  const unsupported=defenders.filter(d=>{
   const id=canonicalMonsterId(d.master);
   return d.unmodeled===true||!d.combat?.oblivion&&(quickSkillOptions(id).some(s=>s.isPassive&&s.coverage==='unsupported')&&id!==29711||
    d.nemesisSets>0||DAMAGE_TRIGGERED.has(PASSIVES[id]));
  });
  const issues=unsupported.map(d=>`${d.label}: efeito passivo ou proc sem cobertura suficiente para esta projeção.`);
  if(branches.some(b=>b.unknown))issues.push('Um defensor antecipado tem efeito desconhecido ou poderia ser eliminado antes de agir. A fila atual não é recalculada por dano.');
  if(branches.some(b=>b.risks.some(r=>r.includes('regras adicionais'))))issues.push('A fila sinalizou uma mecânica defensiva sem cobertura suficiente.');
  if(branches.some(b=>b.outcome.some(t=>t.outcome==='unknown')))issues.push('O dano necessário ficou sem projeção para um alvo obrigatório.');
  if(!defenders.some(d=>d.required))issues.push('Marque pelo menos um alvo cuja eliminação é obrigatória.');
  const impossible=branches.every(b=>b.cut||b.outcome.some(t=>t.outcome==='short'&&!t.uncertain));
  const conditional=branches.some(b=>b.cut||b.outcome.some(t=>t.outcome!=='reaches'||t.uncertain));
  const status=conflicts.length?'BLOCKED':issues.length?'REVIEW REQUIRED':impossible?'BLOCKED':conditional?'CONDITIONAL':'READY';
  reports.push({label:profile.label??'Configuração atual',status,conflicts,notes,equipment,branches,issues});
 }
 return {defenders,reports};
}
