import data from './monster-skills.json' with {type:'json'};
import {canonicalMonsterId} from './CollabMapping.js';
import {monsterOpener} from './monsterDatabase.js';

// SWARFARM bestiary fixtures, com2us_id 2513 and 2563, checked 2026-11-18.
// Normal Tailwind levels reduce cooldown only. 2A Tailwind recovers +5%, then
// +10% of its BASE recovery: 30 * (1 + .05 + .10), not 30 + 15 ATB points.
export const BERNARD_SKILL_SOURCE='https://raw.githubusercontent.com/swarfarm/swarfarm/master/bestiary/fixtures/bestiary_data.json';
const supportedPassives=new Set([20615,25311,23512,23612,26113,21214,16615,22211,22311,16312,16613,21314]);

export function quickSkillOptions(masterId){
 const master=canonicalMonsterId(masterId),opener=monsterOpener(masterId);
 return (data.monsters[String(master)]||data.monsters[String(masterId)]||[]).map((id,index)=>{
  const meta=data.skills[String(id)]||{},slot=Number(meta.slot||index+1),isPassive=/\(?passive\)?/i.test(meta.name||'');
  const isOpener=!!opener&&slot===Number(opener.slot||3);
  return {id,slot,label:`S${slot}`,name:meta.name||`Skill ${slot}`,icon:meta.icon?`/game-icons/skills/${meta.icon}`:null,
   isPassive,isOpener,coverage:isPassive?(supportedPassives.has(master)?'conditional':'unsupported'):isOpener?'supported':'unsupported',
   openerBoost:isOpener?Number(opener.boost||0):0,openerSpeedBuff:isOpener?!!opener.speedBuff:false,openerType:isOpener?opener.type:null};
 });
}

export function resolvedQuickSkill(config={}){
 const master=canonicalMonsterId(config.masterId),opener=monsterOpener(master);
 const options=quickSkillOptions(master),active=options.filter(s=>!s.isPassive);
 const slot=Number(config.firstTurnSkillSlot??opener?.slot??active.at(-1)?.slot??1);
 const selected=options.find(s=>s.slot===slot),isOpener=!!opener&&slot===Number(opener.slot||3)&&!selected?.isPassive;
 const reference=master===11513&&config.skillupProfile==='bernard-2a-reference';
 const bernard=[11513,11533].includes(master),maxLevel=bernard||master===18913?3:1;
 const rawLevel=config.firstTurnSkillLevel??config.skillLevels?.find(s=>Number(s.slot)===slot)?.level??1;
 const level=Number.isInteger(Number(rawLevel))?Math.max(1,Math.min(maxLevel,Number(rawLevel))):1;
 const explicit=config.firstTurnSkillLevel!=null||config.skillLevels?.some(s=>Number(s.slot)===slot)||reference;
 const upgraded=master===11533||reference;
 const legacyBonus=!explicit&&isOpener?Math.max(0,Math.min(30,Number(config.skillBoostBonus)||0)):0;
 const boost=isOpener?Math.min(100,Number(opener.boost||0)*(upgraded?[1,1.05,1.15][level-1]:1)+legacyBonus):0;
 return {...selected,slot,level,skillLevel:level,maxLevel,isOpener,boost,speedBuff:isOpener&&!!opener.speedBuff,type:isOpener?opener.type:null,
  profile:reference?'bernard-2a-reference':master===11533?'bernard-2a':'catalog',hypothetical:reference,legacyBonus,
  limitation:reference?'Comparação 00Peanuts: curva 2A aplicada explicitamente ao Bernard normal; não é a habilidade real desta forma.':legacyBonus?'Bônus manual legado, sem curva de skill-up validada.':!isOpener?'Esta habilidade não possui efeitos ativos automáticos modelados.':null};
}

export function automaticReferenceSpeed(openerSpeed,team={}){
 return Math.max(1,Number(openerSpeed)-(team.referencePolicy==='near-tie'?.000001:1));
}
