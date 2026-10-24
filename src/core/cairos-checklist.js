import {equippedTeamBuilds,teamTurnPreview} from './optimizer.js';
import {simulateCombat} from './speedTuner.js';
import {artifactEffects} from './artifacts.js';
import {bossAccuracyTarget} from './pve-thresholds.js';
export function cairosAccuracyTarget(team){return bossAccuracyTarget(team.sourceDungeon||team.dungeon)??45;}
export function normalizeBoss(raw={}){
 const n=(key,max)=>{const v=Number(raw[key]??0);if(!Number.isFinite(v)||v<0||v>max)throw new Error('Parâmetro do chefe inválido.');return v;};
 if(!Number.isInteger(n('element',5)))throw new Error('Elemento do chefe inválido.');
 return {spd:n('spd',10000),rawDamage:n('rawDamage',10000000),element:n('element',5),critical:raw.critical===true,defBreak:raw.defBreak===true,ignoreDefense:raw.ignoreDefense===true};
}
export function effectiveSurvival(hp,def,boss,effects={}){
 if(!(hp>0)||!(def>=0))throw new Error('HP/DEF inválidos.');
 const settings=normalizeBoss(boss),a=effects.totals||effects,element={1:'Water',2:'Fire',3:'Wind',4:'Light',5:'Dark'}[settings.element];
 const defense=settings.ignoreDefense?0:def*(settings.defBreak?.3:1),reduction=Math.min(100,Math.max(0,Number(a[`reduction${element}`]||0))),crit=settings.critical?Math.min(100,Math.max(0,Number(a.receivedCritReduction||0))):0;
 const factor=1000/(1140+3.5*defense)*(1-reduction/100)*(1-crit/100),ehp=factor>0?Math.floor(hp/factor):null,damage=Math.floor(settings.rawDamage*factor);
 return {ehp,damage:settings.rawDamage?damage:null,survives:settings.rawDamage?hp>damage:null,remaining:settings.rawDamage?Math.max(0,hp-damage):null};
}
export function cairosChecklist(account,team,profile,options={}){
 const builds=equippedTeamBuilds(account,team,options),preview=teamTurnPreview(account,team,options),boss=normalizeBoss(team.boss);
 if(!preview.complete||team.configs.filter(c=>c.enabled!==false).length!==5)return {complete:false,members:[],message:'Complete os cinco monstros e suas runas.'};
 const simulation=simulateCombat([...preview.actors,...(boss.spd?[{key:'cairos-boss',spd:boss.spd,enemy:true,boss:true}]:[])],{stopAfterFirst:true});
 const allyTurns=simulation.firstTurns.filter(t=>!t.enemy),active=team.configs.filter(c=>c.enabled!==false),order=active.every((c,i)=>allyTurns[i]?.key===c.key&&!allyTurns[i]?.disabled);
 const bossIndex=simulation.firstTurns.findIndex(t=>t.enemy),beforeBoss=boss.spd?bossIndex===active.length:null;
 return {complete:true,order,beforeBoss,risks:simulation.risks,members:active.map((c,i)=>{const build=builds.find(b=>b.key===c.key),unit=account.units.find(u=>u.id===c.unitId),combat=build.stats.combat,accuracy=Math.max(Number(c.goals.acc)||0,profile.accuracy??45),turn=allyTurns.find(t=>t.key===c.key);return {key:c.key,name:c.label,position:allyTurns.findIndex(t=>t.key===c.key)+1,tick:turn?.tick,spd:combat.spd,accuracy,acc:combat.acc,accMet:c.requireAccuracy===false||combat.acc>=accuracy,cr:combat.cr,crMet:c.requireCritical===false||combat.cr>=100,...effectiveSurvival(combat.hp,combat.def,boss,artifactEffects(account,unit,options.artifacts!==false&&c.artifacts!==false)),expectedPosition:i+1};})};
}
