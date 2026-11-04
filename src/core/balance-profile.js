import {STATS,FOUR,SETS,STAT_NAMES} from './data.js';
import {equivalentMonsters,canonicalMonsterId} from './CollabMapping.js';
import {currentRuneIds} from './loadouts.js';
import {lockContext} from './locks.js';
import {isPriority} from './allocation.js';
const clamp=(n,min,max,fallback=0)=>Number.isFinite(Number(n))?Math.min(max,Math.max(min,Number(n))):fallback;
export function balanceProfile(config={}){
 const raw=config.balance||{};
 return {weights:Object.fromEntries(STATS.map(k=>[k,clamp(raw.weights?.[k]??(raw.weights?0:k==='spd'?1:0),0,5)])),
  minimums:Object.fromEntries(STATS.map(k=>[k,raw.minimums?.[k]==null||raw.minimums[k]===''?null:clamp(raw.minimums[k],0,1000000)])),
  required:Object.fromEntries(STATS.map(k=>[k,raw.required?.[k]!==false])),
  sets:(Array.isArray(raw.sets)?raw.sets:[]).filter(r=>SETS[r?.set]&&Number(r.set)!==25).slice(0,3).map(r=>({set:Number(r.set),required:r.required===true})),
  mains:Object.fromEntries([2,4,6].map(slot=>[slot,{stat:STAT_NAMES[raw.mains?.[slot]?.stat]?Number(raw.mains[slot].stat):0,required:raw.mains?.[slot]?.required===true}])),
  pins:Object.fromEntries(Object.entries(raw.pins||{}).filter(([s,id])=>Number.isInteger(Number(s))&&s>=1&&s<=6&&Number.isSafeInteger(Number(id))&&Number(id)>0).map(([s,id])=>[s,Number(id)]))};
}
export const balanceScales=unit=>({hp:Math.max(1,unit.base.hp*2),atk:Math.max(1,unit.base.atk*2),def:Math.max(1,unit.base.def*2),spd:150,cr:100,cd:150,res:100,acc:100});
export function weightedStatUtility(stats,weights,scales){
 let total=0,sum=0;for(const key of STATS){const weight=Number(weights?.[key])||0;if(!weight)continue;const actual=key==='spd'?(stats.combat?.spd??stats.total.spd):stats.total[key];total+=weight*Math.min(Number(actual)||0,['cr','res','acc'].includes(key)?100:Infinity)/(scales?.[key]||100);sum+=weight;}return sum?total/sum:0;
}
export const balanceLinkKey=(a,b)=>`${a}>${b}`;
export const balanceLinkMode=(team,a,b)=>team.balanceLinks?.[balanceLinkKey(a,b)]==='strict'?'strict':'near';
// Curated guaranteed team SPD buff. ATB boosters remain in the existing database.
// Water Pudding Princess and its Cookie equivalent share Determination of Dessert Kingdom.
export const grantsTeamSpeedBuff=master=>[26811,26311].includes(canonicalMonsterId(master))||[26811,26311].includes(Number(master));
export function balanceUnit(account,team,config,used=new Set()){
 const matches=(account?.units||[]).filter(u=>!used.has(u.id)&&equivalentMonsters(u.master,config.masterId));
 const unit=matches.find(u=>u.id===config.unitId)||(!config.unitId?matches.sort((a,b)=>b.level-a.level)[0]:null);
 if(!unit)return null;used.add(unit.id);
 const rta=team.gameMode==='rta',ids=team.plannedRunes?.accountStamp===`${account.id}:${account.importedAt||''}`&&Array.isArray(team.plannedRunes.byConfig?.[config.key])?team.plannedRunes.byConfig[config.key]:rta?account.equipmentPools?.rta?.assignments?.[unit.id]||[]:unit.runeIds||[];
 return {...unit,runeIds:[...ids],artifactIds:[...(config.snapshotArtifactEffects?.artifactIds||unit.artifactIds||[])]};
}
export function balanceInventory(account,team,options={},reservedIds=[],allTeams=[]){
 const rta=team.gameMode==='rta',assignments=account.equipmentPools?.rta?.assignments||{},owners=new Map();
 if(rta)for(const [unitId,ids]of Object.entries(assignments))for(const id of ids)owners.set(id,Number(unitId));
 const units=account.units.map(u=>({...u,runeIds:rta?[...(assignments[u.id]||[])]:[...(u.runeIds||[])],artifactIds:[...(u.artifactIds||[])]}));
 const locks=lockContext({...account,units},options),blocked=new Set(rta?[]:[...reservedIds,...(options.blockedRuneIds||[])]);
 if(!rta)for(const t of allTeams)if(t.active!==false&&isPriority(t)&&t.id!==team.id&&(!team.sourceDeckId||t.sourceDeckId!==team.sourceDeckId))for(const c of t.configs||[]){if(c.enabled===false)continue;const u=account.units.find(u=>u.id===c.unitId);if(u)for(const id of currentRuneIds(account,t,c,u))blocked.add(id);}
 const runes=account.runes.map(r=>rta?{...r,owner:owners.get(r.id)||0}:r),byId=new Map(runes.map(r=>[r.id,r]));
 const fixedOwners=new Map();for(const u of units)if(locks.units.has(u.id))for(const id of u.runeIds)fixedOwners.set(id,u.id);
 for(const r of runes)if(r.owner&&(locks.runes.has(r.id)||options.respectLocks&&r.locked))fixedOwners.set(r.id,r.owner);
 function allowed(r,unit){return !blocked.has(r.id)&&r.pool!=='rta'&&r.set!==25&&r.set!==99&&r.level>=Number(options.minLevel??0)&&(!fixedOwners.has(r.id)||fixedOwners.get(r.id)===unit.id)&&(!locks.runes.has(r.id)||r.owner===unit.id||unit.runeIds.includes(r.id))&&(!options.respectLocks||!r.locked||r.owner===unit.id||unit.runeIds.includes(r.id))&&(options.equipped!==false||!r.owner||r.owner===unit.id);}
 return {runes,byId,units,locks,blocked,fixedOwners,allowed};
}
export function balanceChecks(build,config,byId){
 const p=balanceProfile(config),checks=[];
 for(const key of STATS)if(p.minimums[key]!=null){const actual=key==='spd'?build.stats.combat.spd:build.stats.total[key],target=p.minimums[key];checks.push({kind:'minimum',stat:key,actual,target,required:p.required[key],met:actual+1e-8>=target,deficit:Math.max(0,target-actual)/Math.max(1,target)});}
 const counts=build.counts||{};const occurrences=new Map();
 for(const rule of p.sets){const needed=(occurrences.get(rule.set)||0)+(FOUR.has(rule.set)?4:2);occurrences.set(rule.set,needed);checks.push({kind:'set',set:rule.set,actual:counts[rule.set]||0,target:needed,required:rule.required,met:(counts[rule.set]||0)>=needed,deficit:Math.max(0,needed-(counts[rule.set]||0))/needed});}
 for(const [slot,rule]of Object.entries(p.mains))if(rule.stat){const rune=build.runeIds.map(id=>byId.get(id)).find(r=>r?.slot===Number(slot));checks.push({kind:'main',slot:Number(slot),stat:rule.stat,required:rule.required,met:rune?.main[0]===rule.stat,deficit:rune?.main[0]===rule.stat?0:1});}
 for(const [slot,id]of Object.entries(p.pins))checks.push({kind:'pin',slot:Number(slot),id,required:true,met:build.runeIds.includes(id)&&byId.get(id)?.slot===Number(slot),deficit:build.runeIds.includes(id)?0:1});
 return checks;
}
