import {openerRequirements} from './opener-tune.js';
import {goalReport} from './optimizer.js';
import {pveSlots} from './pve-stages.js';
import {blankConfig,makeTeam,STATS,FOUR,GAME_MODES} from './data.js';
import {monsterBase} from './monster-search.js';
import {requiredSheetSpeed,leaderImpact,combatAttributes,scenarioForTeam,simulateCombat,cascadingBoostPlan,cascadeReady,firstRotationSafe,automaticSyncStrategy,NATURAL_GAUGE_STEP,RTA_GAUGE_STEP,gaugeStepForMode} from './speedTuner.js';
import {catalogLeader} from './leader-catalog.js';
import {monsterOpener} from './monsterDatabase.js';
import {canonicalMonsterId} from './CollabMapping.js';
import monsterSkillsData from './monster-skills.json' with {type:'json'};
const fallback={hp:10000,atk:800,def:650,spd:100,cr:15,cd:50,res:15,acc:0};
export function quickConfig(master=null,name='Escolher monstro'){
 const base={...(monsterBase(master)||fallback)};
 return {...blankConfig(null,name),masterId:master,sets:[],basis:'total',manual:{base,sheet:{...base}}};
}
export function quickTeam(area='siege',dungeon=null){return {...makeTeam(area),...(dungeon?{dungeon,destination:dungeon}:{}),towerSpd:15,guildSpd:0,sheetSpeedFormula:true,autoEnemyPassives:true,autoOpener:true,orderMode:'auto',perfectTune:false,configs:Array.from({length:pveSlots(area,dungeon)||GAME_MODES[area]?.slots||3},()=>quickConfig())};}
export function selectQuickMonster(config,option){const next=quickConfig(option?.master,option?.name),base={...(option?.base||next.manual.base)};return {...next,key:config.key,autoSpeed:config.autoSpeed,unitId:option?.id||null,equipmentSource:'manual',manual:{base,sheet:{...base}}};}
const resolvedTowerSpd=team=>team?.speedMode==='snapshot'||team?.customTowerSpd?Math.max(0,Math.min(15,Number(team.towerSpd??15)||0)):15;
export const quickCombatTeam=team=>({...team,towerSpd:resolvedTowerSpd(team),guildSpd:team.speedMode==='snapshot'?Number(team.guildSpd)||0:0,sheetSpeedFormula:true});

export function quickPreview(input,{captureCheckpoints=false,actorCache=null,includeReference=true,captureReadiness=false,captureTickSnapshots=false}={}){
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
 const configured=scenarioForTeam(team,actors),enemy=Number(team.enemyCombatSpd)||0,foes=configured.actors.some(a=>a.enemy);const cascade=cascadingBoostPlan(team,configured.events),referenceEnemy=includeReference&&!foes&&!enemy&&(cascade||automaticSyncStrategy(team).kind==='boost')?Math.max(1,actors[0].spd-1):0;const gaugeStep=gaugeStepForMode(team.gameMode,team.useRtaTickRate);
 const enemyActorLabel=team.enemyReference?.label&&enemy>0?team.enemyReference.label:referenceEnemy?'Inimigo de referência':'Inimigo';
 const enemyActorMaster=team.enemyReference?.masterId&&enemy>0?team.enemyReference.masterId:0;
 const scenario=simulateCombat([...configured.actors,...(!foes&&(enemy||referenceEnemy)>0?[{key:'quick-enemy',name:enemyActorLabel,master:enemyActorMaster,spd:enemy||referenceEnemy,enemy:true}]:[])],{events:configured.events,stopAfterFirst:true,captureCheckpoints,captureReadiness,captureTickSnapshots,gaugeStep});
 return {complete:true,missing:[],actors,turns:scenario.firstTurns,scenario,cut:scenario.cut,referenceEnemy,source:'manual'};
}
export function quickLeader(master){return catalogLeader(master);}

// Synchronization is chosen by identity, including restored legacy plans.
// Manual teams keep automatic follower targets. Explicit JSON verification
// preserves the equipped sheets until the player requests a simulation.
export function quickOrderLocked(team){return !['snapshot','free'].includes(team?.speedMode);}
export function autoTuneQuickTeam(input){
 return input.configs.some(c=>c.masterId&&c.tickTarget!=null)?resolveQuickTickTargets(input):tuneQuickTeam(input);
}
function tuneQuickTeam(input){
 if(!quickOrderLocked(input))return {...quickCombatTeam(input),automaticSync:null,syncAudit:null,perfectTuneAudit:null,configs:input.configs.map(c=>({...c,autoSpeed:false,syncMinimum:null,syncCombatTarget:null}))};
 const strategy=automaticSyncStrategy(input),team={...input,orderMode:'auto',autoOpener:true,autoEnemyPassives:true,towerSpd:resolvedTowerSpd(input),guildSpd:0,perfectTune:strategy.kind==='strict',automaticSync:strategy,syncAudit:null,perfectTuneAudit:null,configs:input.configs.map((c,i)=>({...c,autoSpeed:i>0&&!c.tickTarget&&!c.manualSpeed,syncMinimum:null,syncCombatTarget:null}))};
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
   const c=configs[i];if(c.tickTarget!=null||c.manualSpeed){nextTarget=combatSpeed({...input,configs},i,Number(c.manual.sheet.spd));continue;}const unit={master:c.masterId,element:c.masterId%10,base:c.manual.base};
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
  const c=working.configs[i];if(c.tickTarget!=null||c.manualSpeed)continue;const upper=Number(c.manual.sheet.spd);
  for(let value=Math.ceil(Number(c.manual.base.spd));value<=upper;value++){
   const candidate={...working,configs:working.configs.map((v,j)=>j===i?{...v,manual:{...v.manual,sheet:{...v.manual.sheet,spd:value}}}:v)},p=safe(candidate);
   if(p){working=candidate;final=p;break;}
  }
 }
 const output=working||input;
 return {...output,syncAudit:{kind:'boost',safe:!!working,referenceEnemy:final?.referenceEnemy||0,reason:working?'':'Sem mínimos anti-corte encontrados no cenário e intervalo de ficha calculados.'},configs:output.configs.map((c,i)=>i&&!c.tickTarget&&!c.manualSpeed?{...c,syncMinimum:working?Number(c.manual.sheet.spd):null,syncCombatTarget:working?final.actors[i].spd:null}:c)};
}

// Absolute ladder anchored to the opener, even when the opponent can still cut.
// A failed scenario check must not silently relax the requested one-point gaps.
export function autoTuneStrict(input){
 const opener=combatSpeed(input,0,Number(input.configs[0].manual.sheet.spd)),targets=input.configs.slice(1).map((_,i)=>opener-i-1),configs=input.configs.slice();
 let representable=true;
 for(let i=1;i<configs.length;i++){
  if(configs[i].tickTarget!=null||configs[i].manualSpeed)continue;
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
 const edited=team.configs.find(c=>c.key===key),explicit=edited?.tickTarget!=null||edited?.manualSpeed;
 if(quickOrderLocked(team)&&!master&&!explicit)return tune?autoTuneQuickTeam(team):team;
 const next={...team,configs:team.configs.map(c=>c.key===key?{...c,autoSpeed:false,tickTarget:null,tickAudit:null,...(explicit?{manualSpeed:true}:{}),manual:{...c.manual,sheet:{...c.manual.sheet,spd:value}}}:master&&quickOrderLocked(team)?{...c,autoSpeed:true}:c)};
 return tune?autoTuneQuickTeam(next):next;
}

// Finite search over integer sheet speeds: do not assume a monotone predicate
// across tick/overflow boundaries. Final checks include the whole action prefix.
export function autoTuneCascade(input){
 let working={...input,towerSpd:resolvedTowerSpd(input),guildSpd:0,configs:input.configs.map(c=>({...c,manual:{...c.manual,sheet:{...c.manual.sheet}}}))};
 const plan=cascadingBoostPlan(working),keys=working.configs.map(c=>c.key),suffix=keys.slice(plan.lastIndex+1),auto=working.configs.map((c,i)=>i>0&&c.autoSpeed!==false&&c.tickTarget==null&&!c.manualSpeed),base=i=>Math.ceil(Number(working.configs[i].manual.base.spd));
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
 const output=safe?working:{...input,towerSpd:resolvedTowerSpd(input),guildSpd:0};
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
 const baseline={...input,orderMode:'auto',perfectTune:false,towerSpd:resolvedTowerSpd(input),guildSpd:0},keys=input.configs.map(c=>c.key),plan=cascadingBoostPlan(baseline);
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

// Optional input mode. Search integer rune contributions, leaving Swift in the
// sheet exactly once. No search candidate calls the automatic follower solver.
export const QUICK_TICK_MIN=1,QUICK_TICK_MAX=30,QUICK_TICK_RUNE_MAX=600;
export function updateQuickTickTarget(team,key,value,tune=true){
 const c=team.configs.find(c=>c.key===key),n=Number(value);
 if(!c?.masterId||value!==null&&(!Number.isInteger(n)||n<QUICK_TICK_MIN||n>QUICK_TICK_MAX))return team;
 const next={...team,configs:team.configs.map(c=>c.key===key?{...c,tickTarget:value===null?null:n,tickAudit:null,manualSpeed:value===null,autoSpeed:false,syncMinimum:null,syncCombatTarget:null}:c)};
 return tune?autoTuneQuickTeam(next):next;
}
function tickPreview(team,actorCache){
 // Disable empty slots rather than removing them: scenario ally:N references
 // must continue to refer to their original slots in a partially selected team.
 return quickPreview({...team,configs:team.configs.map(c=>c.masterId?c:{...c,enabled:false})},{includeReference:false,captureReadiness:true,actorCache});
}
function tickMinimum(team,index,actorCache){
 const c=team.configs[index],floor=Number(c.manual.base.spd)+quickSwiftBonus(c);
 for(let rune=0;rune<=QUICK_TICK_RUNE_MAX;rune++){
  const sheet=floor+rune,next={...c,syncMinimum:null,manual:{...c.manual,sheet:{...c.manual.sheet,spd:sheet}}};
  const candidate={...team,configs:team.configs.map((v,j)=>j===index?next:v)};
  const p=tickPreview(candidate,actorCache),row=p.scenario?.firstReady.find(r=>r.key===c.key);
  if(row&&!row.forced&&row.tick<=c.tickTarget)return sheet;
 }
 return null;
}
function resolveQuickTickTargets(input){
 const pinned=input.configs.map((c,i)=>c.masterId&&c.tickTarget!=null?i:-1).filter(i=>i>=0),actorCache=new WeakMap(),original=input.configs;
 let working=input,stable=false,error=null;const failed=new Set();
 // Coordinate resolution is bounded, not a joint optimization guarantee.
 // Rechecking every pin after automatic followers change avoids stale success.
 try{for(let pass=0;pass<4;pass++){
  const before=working.configs.map(c=>c.manual.sheet.spd).join(',');failed.clear();
  for(const index of pinned){
   const sheet=tickMinimum(working,index,actorCache),c=working.configs[index];
   if(sheet===null)failed.add(index);
   working={...working,configs:working.configs.map((v,j)=>j===index?{...c,syncMinimum:null,manual:{...c.manual,sheet:{...c.manual.sheet,spd:sheet??original[index].manual.sheet.spd}}}:v)};
  }
  working=tuneQuickTeam(working);
  if(working.configs.map(c=>c.manual.sheet.spd).join(',')===before){stable=true;break;}
 }}catch(e){error=e.message;working={...input,configs:input.configs.map(c=>({...c,syncMinimum:null,syncCombatTarget:null}))};}
 let preview;try{preview=tickPreview(working,actorCache);}catch(e){error=e.message;}
 const partial=working.configs.some(c=>!c.masterId),keys=working.configs.filter(c=>c.masterId&&c.enabled!==false).map(c=>c.key);
 const allMet=pinned.every(i=>{const row=preview?.scenario?.firstReady.find(r=>r.key===working.configs[i].key);return row&&!row.forced&&row.tick<=working.configs[i].tickTarget;});
 const safe=!partial&&!error&&stable&&!failed.size&&allMet&&working.syncAudit?.safe!==false&&firstRotationSafe(preview?.scenario,keys);
 const configs=working.configs.map((c,i)=>{
  if(!pinned.includes(i))return c;
  const row=preview?.scenario?.firstReady.find(r=>r.key===c.key),turn=preview?.scenario?.firstTurns.find(r=>r.key===c.key),readyTick=row&&!row.forced?row.tick:null;
  const met=!error&&stable&&!failed.has(i)&&readyTick!=null&&readyTick<=c.tickTarget;
  const reason=error?`Cenário não resolvido: ${error}`:!stable?'Conflito entre metas: a busca conjunta não estabilizou em 4 passagens.':failed.has(i)?`Meta não atendida: nenhuma contribuição entre +0 e +${QUICK_TICK_RUNE_MAX} SPD de runas atinge o tick pedido.`:!met?'Meta não atendida no cenário final.':!safe&&!partial?'Prontidão atendida; a ordem ou a sincronia do time está em conflito.':'';
  return {...c,autoSpeed:false,syncMinimum:null,syncCombatTarget:null,tickAudit:{status:met?'met':error?'unsupported':!stable?'conflict':'unreachable',readyTick,actionTick:turn&&!turn.disabled?turn.tick:null,disabledTurnTick:turn?.disabled?turn.tick:null,partial,reason}};
 });
 return {...working,configs,syncAudit:{...working.syncAudit,safe,reason:partial?'Time incompleto: prontidão avaliada apenas com os monstros selecionados.':safe?'':error||'Metas por tick verificadas; há conflito de prontidão, ordem ou sincronia no cenário final.'}};
}

// Read-only build previews may replace equipped speeds. Measure their existing
// scenario cheaply; never carry the manual inverse audit into another build.
export function quickTickObservation(config,preview){
 if(config.tickTarget==null)return null;
 const row=preview?.scenario?.firstReady.find(r=>r.key===config.key),turn=preview?.scenario?.firstTurns.find(r=>r.key===config.key),readyTick=row&&!row.forced?row.tick:null;
 return {readyTick,actionTick:turn&&!turn.disabled?turn.tick:null,disabledTurnTick:turn?.disabled?turn.tick:null,met:readyTick!=null&&readyTick<=config.tickTarget};
}

// Applying validated gear is an explicit change of input source: keep its real
// sheets and rune IDs, leaving inverse mode. A later tick selection is deliberate.
export function applyQuickInventoryPlan(plan){
 return {...plan,configs:plan.configs.map(c=>({...c,tickTarget:null,tickAudit:null,manualSpeed:false}))};
}


// --- 00peanuts Speed Tuning Calculator integration helpers ---
export function monsterSkillsForCard(masterId){
 if(!masterId)return [];
 const id=canonicalMonsterId(masterId),skillIds=monsterSkillsData.monsters[String(id)]||monsterSkillsData.monsters[String(masterId)]||[];
 const opener=monsterOpener(masterId);
 return skillIds.map((sid,idx)=>{
  const meta=monsterSkillsData.skills[String(sid)]||{name:`Skill ${idx+1}`,slot:idx+1,icon:''};
  const slot=Number(meta.slot||idx+1);
  const isOpener=!!opener&&Number(opener.slot||3)===slot;
  return {
   id:sid,
   slot,
   label:`S${slot}`,
   name:meta.name||`Skill ${slot}`,
   icon:meta.icon?`/game-icons/skills/${meta.icon}`:null,
   isOpener,
   openerBoost:isOpener?Number(opener.boost||0):0,
   openerSpeedBuff:isOpener?!!opener.speedBuff:false,
   openerType:isOpener?opener.type:null
  };
 });
}

export function updateQuickTowerSpd(team,towerSpd,tune=true){
 const n=Math.max(0,Math.min(15,Math.floor(Number(towerSpd)||0)));
 const next={...team,towerSpd:n,customTowerSpd:true};
 return tune?autoTuneQuickTeam(next):next;
}

export function updateQuickFirstTurnSkill(team,key,{slot=null,fullSkill=true,skillBoostBonus=0}={},tune=true){
 const next={
  ...team,
  configs:team.configs.map(c=>c.key===key?{
   ...c,
   firstTurnSkillSlot:slot==null?null:Number(slot),
   fullSkill:fullSkill!==false,
   skillBoostBonus:Math.max(0,Math.min(30,Number(skillBoostBonus)||0))
  }:c)
 };
 return tune?autoTuneQuickTeam(next):next;
}

export function applyQuickAutoPresets(config,index,autoPresets={}){
 if(!config?.masterId)return config;
 let sets=[...(config.sets||[]).filter(Boolean)];
 const wantSwift=(index===0&&autoPresets.autoSwiftStarter)||(index>0&&autoPresets.autoSwiftOthers);
 const isChilling=[19901,19911].includes(Number(canonicalMonsterId(config.masterId)))||/chilling/i.test(String(config.label||''));
 const wantWill=isChilling&&autoPresets.autoWillChilling;
 if(wantSwift&&!sets.some(id=>Number(id)===3)){
  sets=[3,...sets.filter(id=>!FOUR.has(Number(id))).slice(0,1)];
 }
 if(wantWill&&!sets.some(id=>Number(id)===15)){
  const fourSet=sets.find(id=>FOUR.has(Number(id)));
  sets=fourSet?[fourSet,15]:[...sets.slice(0,2),15].slice(0,3);
 }
 const oldSwift=quickSwiftBonus(config);
 const updated={...config,sets};
 const newSwift=quickSwiftBonus(updated);
 return {
  ...updated,
  manual:{
   ...updated.manual,
   sheet:{
    ...updated.manual.sheet,
    spd:Number(updated.manual.sheet.spd)-oldSwift+newSwift
   }
  }
 };
}

export function computeEnemyReferenceSpd(enemyRef={},team={}){
 if(!enemyRef?.masterId)return 0;
 const base=Number(enemyRef.baseSpd)||(monsterBase(enemyRef.masterId)?.spd)||100;
 const runeSpd=Math.max(0,Number(enemyRef.runeSpd)||0);
 const swiftBonus=enemyRef.swift?Math.ceil(base*0.25):0;
 const tower=Number(enemyRef.towerSpd??team.towerSpd??15)||0;
 const leader=Math.max(0,Number(enemyRef.leaderSpd)||0);
 const artifactSpd=Math.max(0,Number(enemyRef.artifactSpd)||0);
 const raw=base+runeSpd+swiftBonus+Math.ceil(base*(tower+leader)/100-1e-10)+artifactSpd;
 return Math.max(1,Math.ceil(raw));
}

export function updateQuickEnemyReference(team,patch={},tune=true){
 const ignoreEnemyReference=patch.ignoreEnemyReference!==undefined?!!patch.ignoreEnemyReference:(team.ignoreEnemyReference!==false);
 const currentRef=team.enemyReference||{masterId:null,label:'Inimigo',baseSpd:100,runeSpd:150,swift:true,leaderSpd:0,artifactSpd:0};
 const nextRef={...currentRef,...patch};
 if(patch.option){
  const base=(patch.option.base||monsterBase(patch.option.master)||{spd:100});
  nextRef.masterId=patch.option.master||null;
  nextRef.label=patch.option.name||'Inimigo';
  nextRef.baseSpd=Number(base.spd)||100;
 }
 const enemyCombatSpd=!ignoreEnemyReference&&nextRef.masterId?computeEnemyReferenceSpd(nextRef,team):0;
 const next={...team,ignoreEnemyReference,enemyReference:nextRef,enemyCombatSpd};
 return tune?autoTuneQuickTeam(next):next;
}
