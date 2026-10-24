import {presetsForArea} from './deckManager.js';
import {teamFromGameDeck} from './account-teams.js';
import waves from './cairos-waves.json' with {type:'json'};
import {blankConfig,makeTeam} from './data.js';
import {MONSTER_CATALOG} from './monsters.js';
import {artifactEffects} from './artifacts.js';
import {validateWaveClear} from './optimizer.js';

// Starting compositions, not a guarantee of dungeon success or fastest clear time.
export const CAIROS_PROFILES=[
 {id:'gbah',name:'GBAH',title:'Gigante Abissal',members:['Prilea','Teshar','Konamiya','Luna','Homunculus - Attack (Wind)'],accuracySlots:[0],speed:[205,180,170,160,150]},
 {id:'dbah',name:'DBAH',title:'Dragão Abissal',members:['Julie','Shaina','Kyle','Liam','Konamiya'],accuracySlots:[1],speed:[205,195,185,170,160]},
 {id:'nbah',name:'NBAH',title:'Necro Abissal',members:['Abigail','Icaru','Raoq','Astar','Shamann'],accuracySlots:[0,1,2],speed:[180,170,160,150,140]},
 {id:'sf10',name:'SF10',title:'Fortaleza de Aço 10',members:['Loren','Zinc','Kro','Raoq','Fran'],accuracySlots:[0,1,2,3],speed:[210,200,180,170,220]},
 {id:'pc10',name:'PC10',title:'Cripta do Justiceiro 10',members:['Verdehile','Icaru','Icaru','Icaru','Lushen'],accuracySlots:[1,2,3],speed:[180,170,165,160,150]},
].map(profile=>({...profile,...waves[profile.id]}));
export const LOWER_CAIROS_PROFILES=[['gb10','GB10','Gigante B10'],['db10','DB10','Dragão B10'],['nb10','NB10','Necrópolis B10']].map(([id,name,title])=>({id,name,title,members:[],speed:[],accuracySlots:[],accuracy:null,waves:null}));
export const ALL_CAIROS_PROFILES=[...CAIROS_PROFILES,...LOWER_CAIROS_PROFILES];
export const WAVE_SKILLS={13413:{name:'Amputation Magic · Lushen',multiplier:.68,hits:3,ignoreDefense:true,maxSkillUps:30},13911:{name:'Thousand Shots · Julie (HP cheio)',multiplier:1.2,hits:6,ignoreDefense:false,maxSkillUps:15}};
export function makeCairosTeam(profile,account){
 if(!profile)throw new Error('Masmorra inválida.');
 const preset=presetsForArea(account?.accountPresets,'cairos',profile.id)[0];
 if(!preset&&!profile.members.length)return {...makeTeam('cairos'),dungeon:profile.id,name:profile.title};
 if(preset)return {...teamFromGameDeck(preset,account),towerSpd:15,guildSpd:5};
 const used=new Set();
 return {...makeTeam('cairos'),suggestedTemplate:true,towerSpd:15,guildSpd:5,dungeon:profile.id,name:profile.name,configs:profile.members.map((name,i)=>{
  const master=MONSTER_CATALOG.find(m=>m.name===name)?.master;
  const unit=account?.units.filter(u=>u.name===name&&!used.has(u.id)).sort((a,b)=>b.level-a.level||b.master-a.master)[0];
  if(unit)used.add(unit.id);
  const c=blankConfig(unit,name);
  return {...c,label:name,masterId:unit?.master||master,sets:[],mains:{2:0,4:0,6:0},basis:'total',goals:{...c.goals,spd:profile.speed[i],acc:profile.accuracySlots.includes(i)?profile.accuracy:''}};
 })};
}
export function cairosWaveReport(account,builds,attackerKey,profile,settings={}){
 if(!profile.waves)throw new Error('Dados de waves não incluídos para este andar; use o checklist e o cenário de chefe.');
 const build=builds.find(b=>b.key===attackerKey),unit=account.units.find(u=>u.id===build?.unitId);
 if(!build||!unit)throw new Error('Selecione um atacante presente na distribuição otimizada.');
 const skill=WAVE_SKILLS[unit.master];
 if(!skill)throw new Error('Wave Clear disponível para Lushen e Julie. As metas de SPD/ACC continuam disponíveis para os demais.');
 if(Number(settings.skillUps||0)>skill.maxSkillUps)throw new Error(`Skill-ups de dano: máximo ${skill.maxSkillUps}% para esta habilidade.`);
 if(unit.master===13911&&settings.fullHp!==true)throw new Error('O modelo de Julie exige HP cheio para os seis ataques.');
 const effects=artifactEffects(account,{...unit,artifactIds:build.artifactIds||[]});
 const waveSettings={...settings,...(effects.artifactIds.length?{artifactEffects:effects}:{})};
 return {attacker:unit.name,skill:skill.name,waves:[1,3].map(number=>({number,enemies:validateWaveClear(unit,build.stats,skill,profile.waves[number],waveSettings)}))};
}
