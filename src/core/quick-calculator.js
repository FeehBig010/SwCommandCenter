import {openerRequirements} from './opener-tune.js';
import {goalReport} from './optimizer.js';
import {pveSlots} from './pve-stages.js';
import {blankConfig,makeTeam,STATS,FOUR,GAME_MODES} from './data.js';
import {monsterBase} from './monster-search.js';
import {requiredSheetSpeed,leaderImpact,combatAttributes,scenarioForTeam,simulateCombat,cascadingBoostPlan,cascadeReady,firstRotationSafe,automaticSyncStrategy} from './speedTuner.js';
import {catalogLeader} from './leader-catalog.js';
const fallback={hp:10000,atk:800,def:650,spd:100,cr:15,cd:50,res:15,acc:0};
export function quickConfig(master=null,name='Escolher monstro'){
 const base={...(monsterBase(master)||fallback)};
 return {...blankConfig(null,name),masterId:master,sets:[],basis:'total',manual:{base,sheet:{...base}}};
}
export function quickTeam(area='siege',dungeon=null){return {...makeTeam(area),...(dungeon?{dungeon,destination:dungeon}:{}),towerSpd:15,guildSpd:0,sheetSpeedFormula:true,autoEnemyPassives:true,autoOpener:true,orderMode:'auto',perfectTune:false,configs:Array.from({length:pveSlots(area,dungeon)||GAME_MODES[area]?.slots||3},()=>quickConfig())};}
export function selectQuickMonster(config,option){const next=quickConfig(option?.master,option?.name),base={...(option?.base||next.manual.base)};return {...next,key:config.key,autoSpeed:config.autoSpeed,unitId:option?.id||null,equipmentSource:'manual',manual:{base,sheet:{...base}}};}
export const quickCombatTeam=team=>({...team,towerSpd:team.speedMode==='snapshot'?Number(team.towerSpd)||0:15,guildSpd:team.speedMode==='snapshot'?Number(team.guildSpd)||0:0,sheetSpeedFormula:true});

export function quickPreview(input,{captureCheckpoints=false,actorCache=null,includeReference=true,captureReadiness=false}={}){
 const team={...quickCombatTeam(input),autoOpener:true};
 const active=team.configs.filter(c=>c.enabled!==false),actors=[];
 for(const c of active){if(!c.masterId)return {complete:false,missing:active.filter(c=>!c.masterId).map(c=>c.label),actors:[],turns:[],cut:null};
  if(actorCache?.has(c)){actors.push(actorCache.get(c));continue;}
  const {base,sheet}=c.manual;for(const kind of [base,sheet])for(const stat of STATS){const n=Number(kind[stat]);if(!Number.isFinite(n)||n<0||n>10000000||stat==='spd'&&n<=0)throw new Error(`${c.label}: atributo ${stat.toUpperCase()} inválido.`);}
  const unit={master:c.masterId,element:c.masterId%10,base:Object.fromEntries(STATS.map(k=>[k,Number(base[k])]))},counts={};for(const set of c.sets.filter(Boolean))counts[set]=(counts[set]||0)+(FOUR.has(set)?4:2);
  const total=Object.fromEntries(STATS.map(k=>[k,Number(sheet[k])])),stats={total,bonus:Object.fromEntries(STATS.map(k=>[k,total[k]-unit.base[k]]))},combat=combatAttributes(unit,stats,counts,team,c.combat,c.snapshotArtifactEffects);
  actors.push({key:c.key,will:(counts[15]||0)>=2,master:c.masterId,name:c.label,spd:combat.spd,rawSpd:combat.rawSpd,combat:c.combat,...(c.snapshotArtifactEffects?{effects:c.snapshotArtifactEffects}:{}),attributes:combat,leaderBonus:leaderImpact(unit,stats,counts,team,c.combat,c.snapshotArtifactEffects).bonus,goals:goalReport({...stats,combat},c),nemesisSets:Math.floor((counts[14]||0)/2)});if(actorCache)actorCache.set(c,actors.at(-1));
 }
 if(!actors.length)return {complete:false,missing:[],actors:[],turns:[],cut:null};
 const configured=scenarioForTeam(team,actors),enemy=Number(team.enemyCombatSpd)||0,foes=configured.actors.some(a=>a.enemy);const cascade=cascadingBoostPlan(team,configured.events),referenceEnemy=includeReference&&!foes&&!enemy&&(cascade||automaticSyncStrategy(team).kind==='boost')?Math.max(1,actors[0].spd-1):0;const scenario=simulateCombat([...configured.actors,...(!foes&&(enemy||referenceEnemy)>0?[{key:'quick-enemy',name:referenceEnemy?'Inimigo de referência':'Inimigo',spd:enemy||referenceEnemy,enemy:true}]:[])],{events:configured.events,stopAfterFirst:true,captureCheckpoints,captureReadiness});
 return {complete:true,missing:[],actors,turns:scenario.firstTurns,scenario,cut:scenario.cut,referenceEnemy,source:'manual'};
}
export function quickLeader(master){return catalogLeader(master);}

// Synchronization is chosen by identity, including restored legacy plans.
// Manual teams keep automatic follower targets. Explicit JSON verification
// preserves the equipped sheets until the player requests a simulation.
export function quickOrderLocked(team){return !['snapshot','free'].includes(team?.speedMode);}
export function autoTuneQuickTeam(input){
 if(!quickOrderLocked(input))return {...quickCombatTeam(input),automaticSync:null,syncAudit:null,perfectTuneAudit:null,configs:input.configs.map(c=>({...c,autoSpeed:false,syncMinimum:null,syncCombatTarget:null}))};
 const strategy=automaticSyncStrategy(input),team={...input,orderMode:'auto',autoOpener:true,autoEnemyPassives:true,towerSpd:15,guildSpd:0,perfectTune:strategy.kind==='strict',automaticSync:strategy,syncAudit:null,perfectTuneAudit:null,configs:input.configs.map((c,i)=>({...c,autoSpeed:i>0,syncMinimum:null,syncCombatTarget:null}))};
 if(team.configs.some(c=>!c.masterId))return team;
 try{
  const output=strategy.kind==='boost'?autoTuneBoost(team):autoTuneStrict(team);
  return {...output,automaticSync:strategy};
 }catch(error){return {...team,syncAudit:{kind:strategy.kind,safe:false,reason:error.message}};}
}

// Find the minimum integer follower sheets using resolved ticks, boost size,
// buffs and artifacts. A common combat-speed seed avoids stale faster tails;
// then each follower is minimized against the entire first-rotation prefix.
export function autoTuneBoost(input){
 if(cascadingBoostPlan(input)){
  const output=autoTuneCascade(input),p=quickPreview(output);
  return {...output,configs:output.configs.map((c,i)=>i?{...c,syncCombatTarget:output.syncAudit.safe?p.actors[i]?.spd:null}:c)};
 }
 const keys=input.configs.map(c=>c.key),actorCache=new WeakMap(),opener=combatSpeed(input,0,Number(input.configs[0].manual.sheet.spd));
 let working=null,final=null,lastSeed=null;
 const safe=team=>{const p=quickPreview(team,{actorCache});return firstRotationSafe(p.scenario,keys)?p:null;};
 const upper=Math.min(opener,...input.configs.slice(1).map((_,i)=>combatSpeed(input,i+1,1000)));
 const lower=Math.max(1,Math.min(...input.configs.slice(1).map((c,i)=>combatSpeed(input,i+1,Math.ceil(Number(c.manual.base.spd))))));
 for(let target=lower;target<=upper;target++){
  const configs=input.configs.slice();let feasible=true,nextTarget=target;
  for(let i=configs.length-1;i>0;i--){
   const c=configs[i],unit={master:c.masterId,element:c.masterId%10,base:c.manual.base};
   const sheet=requiredSheetSpeed(nextTarget,unit,{...input,sheetSpeedFormula:true},c.combat,c.snapshotArtifactEffects);
   if(sheet==null||sheet>1000){feasible=false;break;}
   configs[i]={...c,manual:{...c.manual,sheet:{...c.manual.sheet,spd:sheet}}};
   nextTarget=combatSpeed({...input,configs},i,sheet);if(nextTarget>opener){feasible=false;break;}
  }
  if(!feasible)continue;
  const seed=configs.map(c=>c.manual.sheet.spd).join(',');if(seed===lastSeed)continue;lastSeed=seed;
  const candidate={...input,configs},p=safe(candidate);if(p){working=candidate;final=p;break;}
 }
 if(working)for(let i=keys.length-1;i>0;i--){
  const c=working.configs[i],upper=Number(c.manual.sheet.spd);
  for(let value=Math.ceil(Number(c.manual.base.spd));value<=upper;value++){
   const candidate={...working,configs:working.configs.map((v,j)=>j===i?{...v,manual:{...v.manual,sheet:{...v.manual.sheet,spd:value}}}:v)},p=safe(candidate);
   if(p){working=candidate;final=p;break;}
  }
 }
 const output=working||input;
 return {...output,syncAudit:{kind:'boost',safe:!!working,referenceEnemy:final?.referenceEnemy||0,reason:working?'':'Sem mínimos anti-corte encontrados no cenário e intervalo de ficha calculados.'},configs:output.configs.map((c,i)=>i?{...c,syncMinimum:working?Number(c.manual.sheet.spd):null,syncCombatTarget:working?final.actors[i].spd:null}:c)};
}

// Absolute ladder anchored to the opener, even when the opponent can still cut.
// A failed scenario check must not silently relax the requested one-point gaps.
export function autoTuneStrict(input){
 const opener=combatSpeed(input,0,Number(input.configs[0].manual.sheet.spd)),targets=input.configs.slice(1).map((_,i)=>opener-i-1),configs=input.configs.slice();
 let representable=true;
 for(let i=1;i<configs.length;i++){
  const sheet=sheetForCombat(input,i,targets[i-1]);if(sheet==null){representable=false;break;}
  const c=configs[i];configs[i]={...c,syncMinimum:sheet,syncCombatTarget:targets[i-1],manual:{...c.manual,sheet:{...c.manual.sheet,spd:sheet}}};
 }
 const output=representable?{...input,configs}:input,p=quickPreview(output),safe=representable&&firstRotationSafe(p.scenario,configs.map(c=>c.key));
 const audit={kind:'strict',safe,representable,targets,reason:!representable?'A diferença exata de 1 SPD não pode ser representada por fichas inteiras com os bônus informados.':safe?'':'Metas de 1 SPD aplicadas; o cenário interrompe a sequência do time.'};
 return {...output,syncAudit:audit,perfectTuneAudit:audit};
}

// One atomic transition shared by the number input and range control.
export function updateQuickSheetSpeed(team,key,value,tune=true){
 const master=team.configs[0]?.key===key;
 if(quickOrderLocked(team)&&!master)return tune?autoTuneQuickTeam(team):team;
 const next={...team,configs:team.configs.map(c=>c.key===key?{...c,autoSpeed:false,manual:{...c.manual,sheet:{...c.manual.sheet,spd:value}}}:master&&quickOrderLocked(team)?{...c,autoSpeed:true}:c)};
 return tune?autoTuneQuickTeam(next):next;
}

// Finite search over integer sheet speeds: do not assume a monotone predicate
// across tick/overflow boundaries. Final checks include the whole action prefix.
export function autoTuneCascade(input){
 let working={...input,towerSpd:15,guildSpd:0,configs:input.configs.map(c=>({...c,manual:{...c.manual,sheet:{...c.manual.sheet}}}))};
 const plan=cascadingBoostPlan(working),keys=working.configs.map(c=>c.key),suffix=keys.slice(plan.lastIndex+1),auto=working.configs.map((c,i)=>i>0&&c.autoSpeed!==false),base=i=>Math.ceil(Number(working.configs[i].manual.base.spd));
 const set=(i,value)=>{working={...working,configs:working.configs.map((c,j)=>j===i?{...c,manual:{...c.manual,sheet:{...c.manual.sheet,spd:value}}}:c)};};
 for(let i=1;i<keys.length;i++)if(auto[i])set(i,base(i));
 const actorCache=new WeakMap();
 const preview=()=>{try{return quickPreview(working,{captureCheckpoints:true,actorCache});}catch{return null;}};
 function safeThrough(index,ready=false){const p=preview();if(!p)return false;if(!firstRotationSafe(p.scenario,keys.slice(0,index+1)))return false;return !ready||cascadeReady(p.scenario,plan,suffix);}
 const initial=preview();let feasible=!!initial&&initial.scenario.turns[0]?.key===keys[0]&&!initial.scenario.turns[0]?.disabled;
 if(feasible)for(let i=1;i<=plan.lastIndex;i++){if(!auto[i]){if(!safeThrough(i))feasible=false;continue;}let found=false;for(let value=base(i);value<=1000;value++){set(i,value);if(safeThrough(i)){found=true;break;}}if(!found){feasible=false;break;}}
 if(feasible){
  // Seed all DPS together so stale/faster suffixes do not steal earlier slots.
  const seed=working;let found=false;
  for(let combatTarget=1;combatTarget<=1000;combatTarget++){
   working=seed;
   for(let i=plan.lastIndex+1;i<keys.length;i++)if(auto[i]){const c=working.configs[i],unit={master:c.masterId,element:c.masterId%10,base:c.manual.base};set(i,requiredSheetSpeed(combatTarget,unit,{...working,sheetSpeedFormula:true},c.combat,c.snapshotArtifactEffects,{}, {conservative:true}));}
   if(safeThrough(keys.length-1,true)){found=true;break;}
  }
  feasible=found;
 }
 if(feasible){for(let i=keys.length-1;i>0;i--)if(auto[i]){const upper=Number(working.configs[i].manual.sheet.spd);for(let value=base(i);value<=upper;value++){set(i,value);if(safeThrough(keys.length-1,true))break;}}}
 const final=preview(),safe=feasible&&safeThrough(keys.length-1,true);
 const output=safe?working:{...input,towerSpd:15,guildSpd:0};
 return {...output,syncAudit:{kind:'cascade',safe,readyAfterLastBoost:safe&&cascadeReady(final.scenario,plan,suffix),referenceEnemy:final?.referenceEnemy||0},configs:output.configs.map((c,i)=>({...c,syncMinimum:auto[i]&&safe?Number(c.manual.sheet.spd):i?null:c.syncMinimum,syncCascading:i>0}))};
}

function combatSpeed(team,index,value){
 const c=team.configs[index],unit={master:c.masterId,element:c.masterId%10,base:c.manual.base};
 return combatAttributes(unit,{total:{...c.manual.sheet,spd:value}},{},quickCombatTeam(team),c.combat,c.snapshotArtifactEffects).spd;
}
function sheetForCombat(team,index,target){
 const speed=value=>combatSpeed(team,index,value);
 let lo=Math.ceil(Number(team.configs[index].manual.base.spd)),hi=1000;if(speed(lo)>target||speed(hi)<target)return null;
 while(lo<hi){const mid=Math.floor((lo+hi)/2);if(speed(mid)>=target)hi=mid;else lo=mid+1;}return speed(lo)===target?lo:null;
}
export function autoTunePerfect(input){
 const baseline={...input,orderMode:'auto',perfectTune:false,towerSpd:15,guildSpd:0},keys=input.configs.map(c=>c.key),plan=cascadingBoostPlan(baseline);
 // Enumerate the whole ladder in ascending Slot 2 sheet speed, independently
 // of stale follower inputs. A failed flexible tune is not a lower-bound oracle.
 const floor=openerRequirements({...baseline,perfectTune:false})?.members.find(m=>m.key===keys[1])?.sheetExact;
 const minimum=Math.max(Math.ceil(Number(input.configs[1]?.manual.base.spd)||0),floor||0);
 let found=null,targets=null,referenceEnemy=0;
 const openerSpd=combatSpeed(baseline,0,Number(baseline.configs[0].manual.sheet.spd)),actorCache=new WeakMap();
 for(let sheet=minimum;keys.length>1&&sheet<=1000;sheet++){
  const second=combatSpeed(baseline,1,sheet);if(second>=openerSpd)break;
  const expected=keys.slice(1).map((_,i)=>second-i);
  let candidate={...baseline,configs:baseline.configs.map((c,i)=>i===1?{...c,manual:{...c.manual,sheet:{...c.manual.sheet,spd:sheet}}}:c)},representable=true;
  for(let i=2;i<keys.length;i++){const value=sheetForCombat(candidate,i,expected[i-1]);if(value===null){representable=false;break;}candidate={...candidate,configs:candidate.configs.map((c,j)=>j===i?{...c,manual:{...c.manual,sheet:{...c.manual.sheet,spd:value}}}:c)};}
  if(!representable)continue;
  let p;try{p=quickPreview(candidate,{captureCheckpoints:true,actorCache});}catch{continue;}
  if(firstRotationSafe(p.scenario,keys)&&(!plan||cascadeReady(p.scenario,plan,keys.slice(plan.lastIndex+1)))){found=candidate;targets=expected;referenceEnemy=p.referenceEnemy||0;break;}
 }
 const output=found||baseline;
 return {...output,syncAudit:null,perfectTuneAudit:{safe:!!found,targets,referenceEnemy,reason:found?'':'Sem fila segura com diferença exata de 1 SPD no cenário e intervalo calculados.'},configs:output.configs.map((c,i)=>i?{...c,autoSpeed:true,syncMinimum:found?Number(c.manual.sheet.spd):null,syncCombatTarget:found?targets[i-1]:null}:c)};
}

export function quickSpeedTarget(team,config){
 if(!config.masterId)return null;
 const sheetSpd=config.syncMinimum??Number(config.manual.sheet.spd);if(!Number.isFinite(sheetSpd)||sheetSpd<=0)return null;const unit={master:config.masterId,element:config.masterId%10,base:config.manual.base};
 const combatSpd=combatAttributes(unit,{total:{...config.manual.sheet,spd:sheetSpd}},{},quickCombatTeam(team),config.combat,config.snapshotArtifactEffects).spd;
 return {combatSpd,runeSpd:Math.max(0,sheetSpd-Number(unit.base.spd)),hasTarget:config.syncMinimum!=null};
}

// Compact rune controls edit the same sheet used by the tick engine. Swift is
// already part of that sheet and must be separated only at the UI boundary.
export const quickSwiftBonus=config=>(config.sets||[]).some(id=>Number(id)===3)?Math.ceil(Number(config.manual.base.spd)*.25):0;
export const quickRuneSpeed=config=>Math.max(0,Number(config.syncMinimum??config.manual.sheet.spd)-Number(config.manual.base.spd)-quickSwiftBonus(config));
export function updateQuickRuneSpeed(team,key,value,tune=true){
 const config=team.configs.find(c=>c.key===key),n=Number(value);if(!config||!Number.isFinite(n)||n<0||n>1000000)return team;
 return updateQuickSheetSpeed(team,key,Number(config.manual.base.spd)+quickSwiftBonus(config)+n,tune);
}
export function updateQuickRuneSets(team,key,sets,tune=true){
 const configs=team.configs.map(c=>{if(c.key!==key)return c;const next={...c,sets};return {...next,manual:{...c.manual,sheet:{...c.manual.sheet,spd:Number(c.manual.sheet.spd)-quickSwiftBonus(c)+quickSwiftBonus(next)}}};});
 const next={...team,configs};return tune?autoTuneQuickTeam(next):next;
}
export function toggleQuickSwift(team,key,enabled,tune=true){
 const config=team.configs.find(c=>c.key===key);if(!config)return team;
 const sets=enabled?[3,...config.sets.filter(id=>id&&!FOUR.has(Number(id))).slice(0,1)]:config.sets.filter(id=>Number(id)!==3);
 return updateQuickRuneSets(team,key,sets,tune);
}
