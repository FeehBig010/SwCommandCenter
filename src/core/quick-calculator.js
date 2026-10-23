import {openerRequirements} from './opener-tune.js';
import {goalReport} from './optimizer.js';
import {blankConfig,makeTeam,STATS,FOUR} from './data.js';
import {monsterBase} from './monster-search.js';
import {requiredSheetSpeed,leaderImpact,combatAttributes,scenarioForTeam,simulateCombat,cascadingBoostPlan,cascadeReady,firstRotationSafe} from './speedTuner.js';
import {catalogLeader} from './leader-catalog.js';
const fallback={hp:10000,atk:800,def:650,spd:100,cr:15,cd:50,res:15,acc:0};
export function quickConfig(master=null,name='Escolher monstro'){
 const base={...(monsterBase(master)||fallback)};
 return {...blankConfig(null,name),masterId:master,sets:[],basis:'total',manual:{base,sheet:{...base}}};
}
export function quickTeam(area='siege'){return {...makeTeam(area),towerSpd:15,guildSpd:0,sheetSpeedFormula:true,autoEnemyPassives:true,autoOpener:true,orderMode:'locked',perfectTune:true,configs:Array.from({length:{siege:3,arena:4,cairos:5}[area]||3},()=>quickConfig())};}
export function selectQuickMonster(config,option){return {...quickConfig(option?.master,option?.name),key:config.key,autoSpeed:config.autoSpeed};}
export function quickPreview(input,{captureCheckpoints=false,actorCache=null}={}){
 const team={...input,guildSpd:0,sheetSpeedFormula:true};
 const active=team.configs.filter(c=>c.enabled!==false),actors=[];
 for(const c of active){if(!c.masterId)return {complete:false,missing:active.filter(c=>!c.masterId).map(c=>c.label),actors:[],turns:[],cut:null};
  if(actorCache?.has(c)){actors.push(actorCache.get(c));continue;}
  const {base,sheet}=c.manual;for(const kind of [base,sheet])for(const stat of STATS){const n=Number(kind[stat]);if(!Number.isFinite(n)||n<0||n>10000000||stat==='spd'&&n<=0)throw new Error(`${c.label}: atributo ${stat.toUpperCase()} inválido.`);}
  const unit={master:c.masterId,element:c.masterId%10,base:Object.fromEntries(STATS.map(k=>[k,Number(base[k])]))},counts={};for(const set of c.sets.filter(Boolean))counts[set]=(counts[set]||0)+(FOUR.has(set)?4:2);
  const total=Object.fromEntries(STATS.map(k=>[k,Number(sheet[k])])),stats={total,bonus:Object.fromEntries(STATS.map(k=>[k,total[k]-unit.base[k]]))},combat=combatAttributes(unit,stats,counts,team,c.combat);
  actors.push({key:c.key,will:(counts[15]||0)>=2,master:c.masterId,name:c.label,spd:combat.spd,rawSpd:combat.rawSpd,combat:c.combat,attributes:combat,leaderBonus:leaderImpact(unit,stats,counts,team,c.combat).bonus,goals:goalReport({...stats,combat},c),nemesisSets:Math.floor((counts[14]||0)/2)});if(actorCache)actorCache.set(c,actors.at(-1));
 }
 if(!actors.length)return {complete:false,missing:[],actors:[],turns:[],cut:null};
 const configured=scenarioForTeam(team,actors),enemy=Number(team.enemyCombatSpd)||0,foes=configured.actors.some(a=>a.enemy);const cascade=cascadingBoostPlan(team,configured.events),referenceEnemy=!foes&&!enemy&&(cascade||quickOrderLocked(team))?Math.max(1,actors[0].spd-1):0;const scenario=simulateCombat([...configured.actors,...(!foes&&(enemy||referenceEnemy)>0?[{key:'quick-enemy',name:referenceEnemy?'Inimigo de referência':'Inimigo',spd:enemy||referenceEnemy,enemy:true}]:[])],{events:configured.events,stopAfterFirst:true,captureCheckpoints});
 return {complete:true,missing:[],actors,turns:scenario.firstTurns,scenario,cut:scenario.cut,referenceEnemy,source:'manual'};
}
export function quickLeader(master){return catalogLeader(master);}

// Old plans without a mode migrate to locked order. Only an explicit advanced
// choice may bypass it; legacy perfectTune/autoSpeed flags cannot opt out.
export function quickOrderLocked(team){return team.orderMode!=='advanced';}
export function autoTuneQuickTeam(input){
 const locked=quickOrderLocked(input),team={...input,orderMode:locked?'locked':'advanced',perfectTune:locked,syncAudit:null,perfectTuneAudit:null};
 if(team.configs.some(c=>!c.masterId))return {...team,configs:team.configs.map((c,i)=>i?{...c,syncMinimum:null,syncCombatTarget:null}:c)};
 try{return locked?autoTunePerfect(team):autoTuneFlexibleTeam({...team,configs:team.configs.map(c=>({...c,syncCombatTarget:null,...(c.autoSpeed===false?{syncMinimum:null}:{})}))});}
 catch(error){return {...team,perfectTuneAudit:locked?{safe:false,targets:null,reason:error.message}:null,configs:team.configs.map((c,i)=>i?{...c,syncMinimum:null,syncCombatTarget:null}:c)};}
}

// Exact integer sheet-SPD minimum within this first-rotation model. Unknown
// procs/damage still remain conditional; this is not a win guarantee.
function autoTuneFlexibleTeam(team){
 if(team.configs.some(c=>!c.masterId))return team;
 if(cascadingBoostPlan(team))return autoTuneCascade(team);
 let working={...team,syncAudit:null,towerSpd:15,guildSpd:0,configs:team.configs.map(c=>({...c,manual:{...c.manual,sheet:{...c.manual.sheet}}}))};
 // Seed all boosted followers together before testing any prefix: stale fast
 // followers must not invalidate the first follower's search during a drag.
 const floors=openerRequirements(working);
 if(floors)working.configs=working.configs.map((c,i)=>{const floor=floors.members.find(m=>m.key===c.key);return i&&floor&&c.autoSpeed!==false?{...c,manual:{...c.manual,sheet:{...c.manual.sheet,spd:floor.sheetExact}}}:c;});
 let opener;try{opener=quickPreview(working).turns.find(t=>t.key===working.configs[0].key);}catch{return working;}if(!opener)return working;
 for(let index=1;index<working.configs.length;index++){
  const config=working.configs[index];if(config.autoSpeed===false)continue;
  const requirement=openerRequirements(working)?.members.find(m=>m.key===config.key);
  const expected=working.configs.slice(0,index+1).map(c=>c.key),minimum=Math.max(Math.ceil(Number(config.manual.base.spd)),requirement?.sheetExact||0),deadline=opener.tick+index;
  const probe=value=>{const candidate={...working,configs:working.configs.map((c,i)=>i===index?{...c,manual:{...c.manual,sheet:{...c.manual.sheet,spd:value}}}:c)};try{const p=quickPreview(candidate),turn=p.turns.find(t=>t.key===config.key),prefix=p.turns.filter(t=>!t.enemy).slice(0,index+1),position=p.turns.indexOf(turn),enemy=p.turns.findIndex(t=>t.enemy);return !!turn&&!turn.disabled&&turn.tick<=deadline&&prefix.every((t,i)=>t.key===expected[i])&&(enemy<0||position<enemy);}catch{return false;}};
  let max=1000;try{const prev=quickPreview(working).actors[index-1].spd;let lo=minimum,hi=1000;const speed=value=>quickPreview({...working,configs:working.configs.map((v,i)=>i===index?{...v,manual:{...v.manual,sheet:{...v.manual.sheet,spd:value}}}:v)}).actors[index].spd;if(speed(minimum)>prev)max=minimum-1;else{while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(speed(mid)<=prev)lo=mid;else hi=mid-1;}max=lo;}}catch{max=minimum-1;}
  let found=null;if(max>=minimum&&probe(max)){let lo=minimum,hi=max;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(probe(mid))hi=mid;else lo=mid+1;}found=lo;}
  working.configs[index]={...config,syncMinimum:found,...(found!==null?{manual:{...config.manual,sheet:{...config.manual.sheet,spd:found}}}:{})};
 }
 return working;
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
   for(let i=plan.lastIndex+1;i<keys.length;i++)if(auto[i]){const c=working.configs[i],unit={master:c.masterId,element:c.masterId%10,base:c.manual.base};set(i,requiredSheetSpeed(combatTarget,unit,{...working,sheetSpeedFormula:true},c.combat,{}, {},{conservative:true}));}
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
 return combatAttributes(unit,{total:{...c.manual.sheet,spd:value}},{},{...team,sheetSpeedFormula:true,towerSpd:15,guildSpd:0},c.combat).spd;
}
function sheetForCombat(team,index,target){
 const speed=value=>combatSpeed(team,index,value);
 let lo=Math.ceil(Number(team.configs[index].manual.base.spd)),hi=1000;if(speed(lo)>target||speed(hi)<target)return null;
 while(lo<hi){const mid=Math.floor((lo+hi)/2);if(speed(mid)>=target)hi=mid;else lo=mid+1;}return speed(lo)===target?lo:null;
}
export function autoTunePerfect(input){
 const baseline={...input,orderMode:'locked',perfectTune:true,towerSpd:15,guildSpd:0},keys=input.configs.map(c=>c.key),plan=cascadingBoostPlan(baseline);
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
 const combatSpd=combatAttributes(unit,{total:{...config.manual.sheet,spd:sheetSpd}},{},{...team,sheetSpeedFormula:true,guildSpd:0},config.combat).spd;
 return {combatSpd,runeSpd:Math.max(0,sheetSpd-Number(unit.base.spd)),hasTarget:config.syncMinimum!=null};
}
