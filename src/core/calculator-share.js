import {GAME_MODES,STATS,SETS,FOUR} from './data.js';
import {quickTeam,quickConfig,monsterSkillsForCard} from './quick-calculator.js';
import {monsterRecord} from './monsterDatabase.js';
import {catalogLeader} from './leader-catalog.js';
import {normalizeLeader} from './leaders.js';
import {normalizeCombat,COMBAT_EVENTS} from './speedTuner.js';
import {canonicalPveStage,isPveStage,pveSlots} from './pve-stages.js';
const MAX_LENGTH=32768;
const fail=()=>{throw new Error('Configuração compartilhada inválida ou acima do limite.');};
function number(value,min,max,fallback){const n=Number(value??fallback);if(!Number.isFinite(n)||n<min||n>max)fail();return n;}
function integer(value,min,max,fallback){const n=number(value,min,max,fallback);if(!Number.isInteger(n))fail();return n;}
function boolean(value,fallback=false){if(value===undefined)return fallback;if(typeof value!=='boolean')fail();return value;}
function choice(value,values,fallback){const v=value??fallback;if(!values.includes(v))fail();return v;}
function monster(id,optional=false){if(optional&&id==null)return null;if(!Number.isSafeInteger(id)||!monsterRecord(id))fail();return monsterRecord(id);}
function stats(raw,fallback){if(raw!=null&&(typeof raw!=='object'||Array.isArray(raw)))fail();return Object.fromEntries(STATS.map(key=>[key,number(raw?.[key],key==='spd'?1:0,10000000,fallback[key])]));}
function combat(raw){if(raw!=null&&(typeof raw!=='object'||Array.isArray(raw)))fail();return normalizeCombat(raw||{});}
function config(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))fail();const known=monster(raw.masterId,true),base=known?.base||quickConfig().manual.base;
 const sets=raw.sets??[];if(!Array.isArray(sets)||sets.length>3)fail();const validSets=sets.filter(id=>id!==0);if(validSets.some(id=>!Number.isInteger(id)||!Object.hasOwn(SETS,id))||validSets.reduce((sum,id)=>sum+(FOUR.has(id)?4:2),0)>6)fail();
 const result={masterId:known?.master??null,enabled:boolean(raw.enabled,!!known),manual:{base:stats(raw.manual?.base,base),sheet:stats(raw.manual?.sheet,base)},sets:validSets,combat:combat(raw.combat),manualSpeed:boolean(raw.manualSpeed,true),autoSpeed:boolean(raw.autoSpeed,false)};
 if(!known)result.enabled=false;
 if(raw.snapshotArtifactEffects){const effects=raw.snapshotArtifactEffects.totals||raw.snapshotArtifactEffects;for(const [source,target] of [['spdBuff','artifactSpdBuff'],['spdLostHp','artifactSpdLostHp'],['spdDisabled','artifactSpdDisabled']])result.combat[target]=number(result.combat[target]+number(effects[source],0,100,0),0,100,0);}
 if(raw.tickTarget!=null)result.tickTarget=integer(raw.tickTarget,1,30);
 if(raw.firstTurnSkillSlot!=null){result.firstTurnSkillSlot=integer(raw.firstTurnSkillSlot,1,8);if(!known||!monsterSkillsForCard(known.master).some(s=>s.slot===result.firstTurnSkillSlot))fail();}
 for(const key of ['firstTurnSkillLevel','skillLevel'])if(raw[key]!=null)result[key]=integer(raw[key],1,50);
 if(raw.skillupProfile!=null)result.skillupProfile=choice(raw.skillupProfile,['bernard-2a-reference']);
 result.fullSkill=boolean(raw.fullSkill,true);result.skillBoostBonus=number(raw.skillBoostBonus,0,30,0);
 if(raw.skillLevels!=null){if(!Array.isArray(raw.skillLevels)||raw.skillLevels.length>8)fail();result.skillLevels=raw.skillLevels.map(s=>({slot:integer(s.slot,1,8),level:integer(s.level,1,50)}));if(new Set(result.skillLevels.map(s=>s.slot)).size!==result.skillLevels.length)fail();}
 return result;
}
function portable(input){
 if(!input||typeof input!=='object'||!Object.hasOwn(GAME_MODES,input.gameMode))fail();const gameMode=input.gameMode;
 const dungeon=input.dungeon==null?null:canonicalPveStage(input.dungeon);if(dungeon!=null&&!isPveStage(gameMode,dungeon))fail();
 const slots=pveSlots(gameMode,dungeon)||GAME_MODES[gameMode].slots;if(!Array.isArray(input.configs)||input.configs.length!==slots||slots>8)fail();
 const configs=input.configs.map(config),result={gameMode,...(dungeon?{dungeon}:{}),configs,towerSpd:number(input.towerSpd,0,100,15),guildSpd:number(input.guildSpd,0,100,0),customTowerSpd:boolean(input.customTowerSpd,false),leaderSpd:number(input.leaderSpd,0,100,0),enemyCombatSpd:number(input.enemyCombatSpd,0,10000,0),ignoreEnemyReference:boolean(input.ignoreEnemyReference,false),useRtaTickRate:boolean(input.useRtaTickRate,false),autoOpener:boolean(input.autoOpener,true),autoEnemyPassives:boolean(input.autoEnemyPassives,true)};
 for(const key of ['inputTick','speedTick'])if(input[key]!=null)result[key]=number(input[key],.1,100);
 for(const key of ['includePartial','perfectTune'])if(input[key]!=null)result[key]=boolean(input[key]);
 if(input.inputMode!=null)result.inputMode=choice(input.inputMode,['slider','tick']);
 if(input.referencePolicy!=null)result.referencePolicy=choice(input.referencePolicy,['near-tie']);
 if(input.mode!=null)result.mode=choice(input.mode,['attack','defense']);
 if(gameMode==='arena'&&input.arenaContext!=null)result.arenaContext=choice(input.arenaContext,['regular','interserver']);
 const leaderIndex=input.leaderIndex==null?null:integer(input.leaderIndex,0,slots-1);
 if(input.leader!=null){const leader=normalizeLeader(input.leader),actual=catalogLeader(configs[leaderIndex]?.masterId);if(leaderIndex==null||!actual||JSON.stringify(normalizeLeader(actual))!==JSON.stringify(leader))fail();result.leaderIndex=leaderIndex;result.leaderMasterId=configs[leaderIndex].masterId;}
 else if(input.leaderMasterId!=null){if(leaderIndex==null||input.leaderMasterId!==configs[leaderIndex]?.masterId||!catalogLeader(input.leaderMasterId))fail();result.leaderIndex=leaderIndex;result.leaderMasterId=input.leaderMasterId;}
 else result.leaderIndex=null;
 const placement=input.gamePlacement??configs.map((_,i)=>i);if(!Array.isArray(placement)||placement.length!==slots)fail();
 result.gamePlacement=placement.map(value=>typeof value==='string'?input.configs.findIndex(c=>c.key===value):integer(value,0,slots-1));if(result.gamePlacement.some(n=>n<0)||new Set(result.gamePlacement).size!==slots)fail();
 if(input.enemyReference!=null){const ref=input.enemyReference,known=monster(ref.masterId,true);if(known)result.enemyReference={masterId:known.master,baseSpd:number(ref.baseSpd,1,10000,known.base.spd),runeSpd:number(ref.runeSpd,0,10000,0),swift:boolean(ref.swift,false),leaderSpd:number(ref.leaderSpd,0,100,0),towerSpd:number(ref.towerSpd,0,100,result.towerSpd),artifactSpd:number(ref.artifactSpd,0,500,0)};}
 const scenario=input.combatScenario||{};if(!Array.isArray(scenario.enemies??[])||!Array.isArray(scenario.events??[])||(scenario.enemies?.length||0)>5||(scenario.events?.length||0)>20)fail();
 const enemies=(scenario.enemies||[]).map(e=>{const identity=e.master??e.masterId,known=identity==null||identity===0?null:monster(identity);return {master:known?.master??0,spd:number(e.spd,0,10000),will:boolean(e.will,false),nemesisSets:integer(e.nemesisSets,0,3,0),combat:combat(e.combat)};});
 if(configs.filter(c=>c.enabled&&c.masterId).length+enemies.length>8)fail();
 const ref=value=>{if(typeof value!=='string')fail();const keyIndex=input.configs.findIndex(c=>c.key!=null&&c.key===value);if(keyIndex>=0)return `ally:${keyIndex}`;const found=/^(ally|enemy):(\d+)$/.exec(value);if(!found)fail();const index=Number(found[2]);if(index>=(found[1]==='ally'?slots:enemies.length))fail();return `${found[1]}:${index}`;};
 result.combatScenario={enemies,events:(scenario.events||[]).map(e=>{if(!Object.hasOwn(COMBAT_EVENTS,e.type)||!Array.isArray(e.targets??[])||(e.targets?.length||0)>8)fail();const event={afterKey:ref(e.afterKey),targets:(e.targets||[]).map(ref),type:e.type,occurrence:integer(e.occurrence,1,100,1),amount:number(e.amount,0,1000,0),critical:boolean(e.critical,false),glancing:boolean(e.glancing,false),enabled:boolean(e.enabled,true)};if(event.critical&&event.glancing)fail();return event;})};
 return result;
}
export function encodeCalculatorShare(team){const bytes=new TextEncoder().encode(JSON.stringify({version:1,team:portable(team)}));if(bytes.length>MAX_LENGTH)fail();const payload=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');if(payload.length>MAX_LENGTH)fail();return payload;}
export function decodeCalculatorShare(payload){
 if(typeof payload!=='string'||!payload.length||payload.length>MAX_LENGTH||!/^[A-Za-z0-9_-]+$/.test(payload)||payload.length%4===1)fail();let decoded;
 try{const binary=atob(payload.replaceAll('-','+').replaceAll('_','/'));const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));if(bytes.length>MAX_LENGTH)fail();decoded=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail();}
 if(decoded?.version!==1)fail();const safe=portable(decoded.team),team=quickTeam(safe.gameMode,safe.dungeon),configs=safe.configs.map(c=>({...quickConfig(c.masterId,monsterRecord(c.masterId)?.name||'Escolher monstro'),...c,equipmentSource:'manual'}));
 const leader=safe.leaderMasterId?catalogLeader(safe.leaderMasterId):null;
 return {...team,...safe,speedMode:'snapshot',customTowerSpd:true,name:'Configuração compartilhada',configs,gamePlacement:safe.gamePlacement.map(i=>configs[i].key),leader,leaderIndex:safe.leaderIndex??0,leaderKey:leader?configs[safe.leaderIndex].key:null,...(safe.enemyReference?{enemyReference:{...safe.enemyReference,label:monsterRecord(safe.enemyReference.masterId).name}}:{}),combatScenario:{...safe.combatScenario,enemies:safe.combatScenario.enemies.map(e=>({...e,label:monsterRecord(e.master)?.name||'Inimigo'}))}};
}

export function calculatorShareUrl(team,baseUrl){
 const url=new URL(baseUrl);if(!['https:','http:'].includes(url.protocol))fail();
 url.username='';url.password='';url.search='';url.hash='/quick';
 url.searchParams.set('calc',encodeCalculatorShare(team));return url.href;
}
