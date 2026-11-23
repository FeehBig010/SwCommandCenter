import passiveNotices from './passive-notices.json' with {type:'json'};
import {leaderApplies,speedLeaderBonus,raidLeaderBonuses} from './leaders.js';
import {MAX_TOWERS} from './combat-towers.js';
import {automaticReferenceSpeed,combatSkillRisks,resolvedQuickSkill} from './quick-skill-effects.js';
import {canonicalMonsterId} from './CollabMapping.js';
import {monsterRecord} from './monsterDatabase.js';
export const PASSIVES={20615:'amduat',25311:'miles',23512:'masha',23612:'masha_dismounted',26113:'sonia',21214:'tian_lang',16615:'ragdoll',22211:'abellio',22311:'abellio_beast',16312:'antares',16613:'leo',21314:'tablo'};
const number=(v,fallback,min,max,label)=>{const n=Number(v??fallback);if(!Number.isFinite(n)||n<min||n>max)throw new Error(`${label} inválido.`);return n;};
// Conservative requested 30-ATB floor, separate from the discrete scenario proof.
// This coefficient is a policy, not a universal SWOP identity across tick brackets.
export function boostedFollowerMinimum(combatSpd,boost=30){
 const speed=number(combatSpd,0,1,10000000,'SPD do abridor');
 const amount=number(boost,30,0,100,'Boost');
 if(amount!==30)throw new Error('Piso de sincronização disponível apenas para boost de 30.');
 return Math.ceil(speed*8475/10000-1e-10);
}
// Identity drives free-calculator synchronization; legacy manual flags do not
// override the detected first-slot skill. Conditional/single-target procs are
// deliberately not treated as guaranteed boosts of the entire team.
export function automaticSyncStrategy(team){
 const first=team.configs?.[0];if(!first?.masterId)return {kind:'pending',boost:0};
 const skill=resolvedQuickSkill(first);
 return skill.isOpener?{kind:'boost',...skill}:{kind:'strict',boost:0};
}
export function normalizeCombat(raw={}){const result={speedBuff:raw.speedBuff===true,slow:raw.slow===true,disabled:raw.disabled===true,oblivion:raw.oblivion===true,hpPercent:number(raw.hpPercent,100,0,100,'HP'),buffCount:number(raw.buffCount,0,0,100,'Buffs'),mashaStacks:number(raw.mashaStacks,0,0,5,'Stacks Masha'),targetTick:number(raw.targetTick,0,0,10000,'Tick alvo'),artifactSpd:number(raw.artifactSpd,0,0,500,'SPD adicional de artefatos'),artifactSpdBuff:number(raw.artifactSpdBuff,0,0,100,'Buff SPD de artefatos'),artifactSpdLostHp:number(raw.artifactSpdLostHp,0,0,100,'SPD por HP perdido'),artifactSpdDisabled:number(raw.artifactSpdDisabled,0,0,100,'SPD sob incapacidade')};if(![result.targetTick,result.buffCount,result.mashaStacks].every(Number.isInteger))throw new Error('Buffs, stacks e ticks devem ser inteiros.');return result;}
function runtimeSpeedValue(raw,master,combat={},effects={}){
 const c=normalizeCombat(combat),p=c.oblivion?null:PASSIVES[canonicalMonsterId(master)],a=effects.totals||effects;
 const passive=p==='miles'?Math.min(1,c.buffCount*.05):p==='masha'?c.mashaStacks*.1:p==='masha_dismounted'?-.15:0;
 // Buff/slow and dynamic passive percentages add; artifact lost-HP/incapacity scales separately.
 const status=1+(c.speedBuff?.3*(1+(Number(a.spdBuff||0)+c.artifactSpdBuff)/100):0)-(c.slow?.3:0)+passive;
 const artifact=1+(Number(a.spdLostHp||0)+c.artifactSpdLostHp)*(1-c.hpPercent/100)/100+(c.disabled?(Number(a.spdDisabled||0)+c.artifactSpdDisabled)/100:0);
 return Math.max(1,(raw+c.artifactSpd)*status*artifact);
}
export function runtimeSpeed(raw,master,combat={},effects={}){return Math.ceil(runtimeSpeedValue(raw,master,combat,effects)-1e-10);}
// Manual calculator inputs always represent sheet SPD, including equipped Swift.
export function combatSpeedFromSheet(sheetSpd,unit,team={}){
 const sheet=number(sheetSpd,0,1,10000000,'SPD ficha');
 const guild=(team.gameMode||'siege')==='siege'?Number(team.guildSpd||0):0;
 return sheet+Math.ceil(unit.base.spd*(Number(team.towerSpd||0)+guild+speedLeaderBonus(unit,team))/100-1e-10);
}
export function combatAttributes(unit,stats,counts={},team={},combat={},effects={}){
 // Sheet SPD already includes Swift; round the combined tower/leader/totem
 // bonus once before combat buffs and artifact conditions.
 const raw=combatSpeedFromSheet(stats.total.spd,unit,team);
 if(!Number.isFinite(raw)||raw<=0)throw new Error('SPD de combate inválida.');
 const total={...stats.total,spd:runtimeSpeed(raw,unit.master,combat,effects)},leader=team.leader;
 if(team.maxedTowers){for(const key of ['hp','atk','def'])total[key]+=Math.ceil(unit.base[key]*(MAX_TOWERS[key]+(team.gameMode==='siege'?MAX_TOWERS[`guild${key[0].toUpperCase()}${key.slice(1)}`]:0)+(key==='atk'?MAX_TOWERS.elementAtk:0))/100);total.cd+=MAX_TOWERS.cd;}
 if(team.raid){for(const [stat,value] of Object.entries(raidLeaderBonuses(unit,team)))if(stat!=='spd')total[stat]=Math.ceil(total[stat]+(['hp','atk','def'].includes(stat)?unit.base[stat]*value/100:value));}
 if(!team.raid&&leader&&leader.stat!=='spd'&&leaderApplies(leader,unit,team.gameMode||'siege')){
  const stat=leader.stat;total[stat]=Math.ceil(total[stat]+(['hp','atk','def'].includes(stat)?unit.base[stat]*leader.value/100:leader.value));
 }
 for(const key of ['cr','res','acc'])total[key]=Math.min(100,total[key]);
 return {...total,rawSpd:raw,speedBuffApplied:combat?.speedBuff===true,master:unit.master,...(team.maxedTowers?{maxedTowers:true}:{})};
}
// SW natural gauge increment: 7% standard (Siege/WGB/Arena/PvE) and 1.5% in World Arena (RTA).
export const NATURAL_GAUGE_STEP=7;
export const RTA_GAUGE_STEP=1.5;
export function gaugeStepForMode(gameMode,useRtaTickRate=false){
 return useRtaTickRate||gameMode==='rta'?RTA_GAUGE_STEP:NATURAL_GAUGE_STEP;
}
export function minimumSpeedForTick(tick,initialAtb=0,gaugeStep=NATURAL_GAUGE_STEP){
 const t=number(tick,1,1,10000,'Tick'),atb=number(initialAtb,0,0,100,'Barra inicial');
 const step=Number(gaugeStep)===RTA_GAUGE_STEP?RTA_GAUGE_STEP:NATURAL_GAUGE_STEP;
 if(!Number.isInteger(t))throw new Error('Tick alvo deve ser inteiro.');
 return Math.max(1,Math.ceil((100-atb)*100/(step*t)-1e-10));
}
export function simulateFirstTurns(actors){
 if(actors.some(a=>!Number.isFinite(a.spd)||a.spd<=0))throw new Error('SPD de combate deve ser positiva e finita.');
 if(!actors.length)return [];
 return simulateCombat(actors,{stopAfterFirst:true}).firstTurns.map(({key,tick,spd,atb})=>({key,tick,spd,atb}));
}
export function simulateCombat(actors,{events=[],captureDamageState=false,stopAfterFirst=false,maxTurns=30,captureCheckpoints=false,captureReadiness=false,captureTickSnapshots=false,captureTickLimit=60,gaugeStep=NATURAL_GAUGE_STEP}={}){
 const activeGaugeStep=Number(gaugeStep)===RTA_GAUGE_STEP?RTA_GAUGE_STEP:NATURAL_GAUGE_STEP;
 const snapshotLimit=Math.max(1,Math.min(300,Math.floor(Number(captureTickLimit)||60)));
 let lastTick=0;
 if(!Array.isArray(actors)||actors.length>20||!actors.length)throw new Error('Use de 1 a 20 unidades.');
 if(events.length>100||!Number.isInteger(maxTurns)||maxTurns<1||maxTurns>100)throw new Error('Cenário excede o limite.');
 const keys=new Set(),state=actors.map((a,index)=>{if(keys.has(a.key))throw new Error('Unidade repetida no cenário.');keys.add(a.key);const c=normalizeCombat(a.combat);return {...a,index,baseSpd:number(a.rawSpd??a.spd,0,.01,100000,'SPD'),spd:number(a.spd,0,.01,100000,'SPD'),atb:number(a.initialAtb,0,0,100,'Barra inicial'),hp:c.hpPercent,combat:c,passive:c.oblivion?null:PASSIVES[canonicalMonsterId(a.master)],turns:0,dead:c.hpPercent<=0,nemesisRemainder:0};});
 const order=(a,b)=>(Math.abs(b.atb-a.atb)>1e-9?b.atb-a.atb:0)||b.spd-a.spd||Number(b.enemy||false)-Number(a.enemy||false)||(Number.isInteger(a.placementIndex)?a.placementIndex:a.index)-(Number.isInteger(b.placementIndex)?b.placementIndex:b.index);
 const alive=()=>state.filter(a=>!a.dead),same=(a,b)=>!!a.enemy===!!b.enemy;
 const damageStates=captureDamageState?[]:null;
 const turns=[],firstTurns=[],seen=new Set(),log=[],risks=[],forced=[],checkpoints=[],tickSnapshots=[];
 // Readiness is independent of the one-action-per-tick queue. Record every
 // first threshold crossing before bars are consumed, including event gains.
 const firstReady=[],readySeen=captureReadiness?new Set():null;
 function recordReady(tick,phase,forcedActor=null){
  if(!captureReadiness)return;
  for(const a of state){
   if(a.dead||seen.has(a.key)||readySeen.has(a.key)||a.atb<100-1e-9&&a!==forcedActor)continue;
   readySeen.add(a.key);firstReady.push({key:a.key,name:a.name,master:a.master,tick,spd:a.rawSpd!==undefined?runtimeSpeed(a.baseSpd,a.master,a.combat,a.effects||{}):a.spd,atb:a.atb,enemy:!!a.enemy,disabled:a.combat.disabled,forced:a===forcedActor&&a.atb<100-1e-9,phase});
  }
 }
 for(const a of state){
  const notices=passiveNotices[canonicalMonsterId(a.master)];
  if(!a.combat.oblivion&&!a.passive&&notices)risks.push(`${a.name||a.key}: ${notices.join(', ')} exige eventos/regras adicionais; resultado condicional.`);
 }
 for(const a of state)if(a.passive==='antares')risks.push(`${a.name||a.key}: Antares pode interromper por RNG; cenário sem proc não garante segurança.`);
 const tls=()=>alive().filter(a=>a.passive==='tian_lang');
 function addBar(target,amount,source){
  const halved=tls().some(t=>t.key!==target.key&&target.passive!=='tian_lang'&&!target.boss);
  target.atb+=amount*(halved?.5:1);
 }
 function skillBoost(targets,amount,source){for(const t of targets)addBar(t,amount,source);for(const tl of tls())if(!same(tl,source)&&source.passive!=='tian_lang'&&!source.boss)tl.atb+=15;}
 function apply(event,source,tick){
  const targets=event.targets?.map(k=>{const t=state.find(a=>a.key===k);if(!t)throw new Error('Alvo de evento não encontrado.');return t;}).filter(t=>!t.dead)||[];
  const amount=number(event.amount,0,0,1000,'Valor do evento');if(event.critical&&event.glancing)throw new Error('Um hit não pode ser crítico e glancing ao mesmo tempo.');
  log.push({tick,source:source.key,type:event.type,targets:targets.map(t=>t.key),amount});
  if(event.type==='leo_attack'){if(source.passive!=='leo')throw new Error('Ataque Leo exige Leo.');const vulnerable=targets.filter(t=>!t.will||t.turns>0);if(vulnerable.length)apply({...event,type:'reduce',targets:vulnerable.map(t=>t.key),amount:15},source,tick);if(vulnerable.length!==targets.length)log.push({tick,source:source.key,type:'will_immunity',targets:targets.filter(t=>t.will&&t.turns===0).map(t=>t.key),amount:0});}
  else if(event.type==='cleanse'){for(const t of targets){t.combat.disabled=false;t.combat.slow=false;}}
  else if(event.type==='tiana'){
   if(canonicalMonsterId(source.master)!==18913)throw new Error('Wind of Changes exige Tiana.');
   for(const target of alive()){target.combat.disabled=false;target.combat.slow=false;target.combat.speedBuff=false;target.speedBuffTurns=0;target.attackBuffTurns=0;target.attackBuff=false;target.combat.buffCount=0;target.will=false;}
   skillBoost(alive().filter(t=>same(t,source)),30,source);
  }
  else if(event.type==='boost'){skillBoost(targets,amount,source);}
  else if(event.type==='reduce'){
   for(const t of targets){const before=t.atb;t.atb=Math.max(0,t.atb-amount*(t.passive==='masha'&&!same(t,source)?.5:1));if(t.atb<before&&!same(t,source))for(const m of alive().filter(m=>m.passive==='masha'&&same(m,t)))m.combat.mashaStacks=Math.min(5,m.combat.mashaStacks+1);}
  }else if(event.type==='heal'){for(const t of targets){t.hp=Math.min(100,t.hp+amount);t.combat.hpPercent=t.hp;}}
  else if(event.type==='damage'){
   for(const t of targets){const lost=Math.min(t.hp,amount);t.hp-=lost;t.dead=t.hp<=0;t.combat.hpPercent=t.hp;
    const sets=Math.min(3,Number(t.nemesisSets)||0);t.nemesisRemainder+=lost;const units=Math.floor((t.nemesisRemainder+1e-9)/7);t.nemesisRemainder-=units*7;if(!t.dead&&sets&&units)t.atb+=units*4*sets;
    if(!same(t,source)){
     if(event.critical)for(const r of alive().filter(r=>r.passive==='ragdoll'&&same(r,t)))skillBoost(alive().filter(a=>same(a,r)),10,r);
     if(!t.dead&&event.glancing&&t.passive==='sonia')skillBoost([t],50,t);
     if(!t.dead&&t.passive==='abellio_beast')skillBoost([t],15,t);
     if(t.hp<=40)for(const ab of alive().filter(a=>a.passive==='abellio'&&same(a,t))){ab.combat.disabled=false;ab.combat.slow=false;skillBoost([ab],100,ab);}
    }
   }
  }else if(event.type==='tablo'){
   if(canonicalMonsterId(source.master)!==21314)throw new Error('Reset Tablo exige Tablo como origem.');for(const a of alive()){a.atb=0;if(same(a,source)&&a.key!==source.key){a.combat.speedBuff=true;a.speedBuffTurns=0;}}source.combat.disabled=true;source.disabledFor=1;
  }else if(event.type==='buffs'){for(const a of alive())a.combat.buffCount=number(event.amount,0,0,100,'Buffs globais');}
  else if(event.type==='speed_buff'){for(const t of targets){
   t.combat.speedBuff=event.enabled!==false;
   t.speedBuffTurns=event.duration||0;
  }}
  else if(event.type==='attack_buff'){for(const target of targets){
   target.attackBuff=true;target.attackBuffTurns=event.duration;
  }}
  else if(event.type==='slow'){for(const t of targets)t.combat.slow=event.enabled!==false;}
  else if(event.type==='antares'){
   for(const t of targets){if(t.passive!=='antares'||same(t,source))throw new Error('Proc Antares exige Antares adversário da origem.');forced.push(t.key);}risks.push('Proc Antares forçado explicitamente; é um ramo condicional, não uma previsão de sorte.');
  }else throw new Error('Evento de combate não suportado.');
 }
 for(const e of events)if(!keys.has(e.afterKey)||!Number.isInteger(Number(e.occurrence??1))||Number(e.occurrence??1)<1)throw new Error('Origem ou turno de evento inválido.');
 const leo=alive().filter(a=>a.passive==='leo'&&!a.boss);if(leo.length)forced.push(...leo.slice().sort((a,b)=>b.spd-a.spd||a.index-b.index).map(a=>a.key));
 recordReady(0,'initial');
 for(let tick=1;tick<=10000&&turns.length<(stopAfterFirst?10000:maxTurns);tick++){
  lastTick=tick;
  for(const a of alive()){if(a.rawSpd!==undefined)a.spd=runtimeSpeed(a.baseSpd,a.master,a.combat,a.effects||{});}
  const leos=alive().filter(a=>a.passive==='leo');const cap=leos.length?Math.min(...leos.map(a=>a.spd)):Infinity;
  for(const a of alive())a.atb+=(a.passive==='leo'||a.boss?a.spd:Math.min(cap,a.spd))*activeGaugeStep/100;
  recordReady(tick,'natural');
  const preTurnBars=captureTickSnapshots?new Map(state.map(a=>[a.key,Math.round(a.atb*10)/10])):null;
  const forcedKey=forced.shift(),actor=forcedKey?alive().find(a=>a.key===forcedKey):alive().filter(a=>a.atb>=100-1e-9).sort(order)[0];
  if(!actor){
   if(captureTickSnapshots&&tick<=snapshotLimit)tickSnapshots.push({tick,actingKey:null,actingName:null,actingEnemy:false,bars:state.map(a=>({key:a.key,name:a.name||a.key,master:a.master,spd:a.spd,spdPost:a.spd,enemy:!!a.enemy,atb:preTurnBars.get(a.key)??0,atbPost:Math.round(a.atb*10)/10,dead:a.dead,acted:false}))});
   if(!alive().length)break;continue;
  }
  if(forcedKey)recordReady(tick,'forced',actor);
  if(damageStates&&!seen.has(actor.key))damageStates.push({tick,actors:state.map(a=>({key:a.key,master:a.master,spd:a.spd,hp:a.hp,attackBuff:a.attackBuff===true,oblivion:a.combat.oblivion,dead:a.dead}))});
  const row={key:actor.key,tick,spd:actor.spd,atb:actor.atb,enemy:!!actor.enemy,forced:!!forcedKey,disabled:actor.combat.disabled};if(row.disabled)risks.push(`${actor.name||actor.key}: turno consumido por incapacidade, sem executar ação.`);turns.push(row);if(!seen.has(actor.key)){seen.add(actor.key);firstTurns.push(row);}actor.turns++;actor.atb=0;
  // Disabled turns consume ATB but cannot execute the configured actions; duration changes require explicit scenario state.
  const skipped=actor.combat.disabled;
  if(actor.attackBuffTurns>0&&--actor.attackBuffTurns===0)actor.attackBuff=false;
  if(actor.speedBuffTurns>0&&--actor.speedBuffTurns===0)actor.combat.speedBuff=false;
  if(!skipped)for(const e of events.filter(e=>e.enabled!==false&&e.afterKey===actor.key&&Number(e.occurrence??1)===actor.turns)){apply(e,actor,tick);recordReady(tick,'event');}
  if(skipped&&actor.disabledFor){actor.disabledFor--;if(!actor.disabledFor)actor.combat.disabled=false;}
  for(const am of alive().filter(a=>a.passive==='amduat'&&!same(a,actor)))skillBoost([am],25,am);
  recordReady(tick,'passive');
  if(captureCheckpoints)checkpoints.push({key:actor.key,occurrence:actor.turns,tick,disabled:skipped,bars:state.map(a=>({key:a.key,atb:a.atb,dead:a.dead}))});
  if(captureTickSnapshots&&tick<=snapshotLimit)tickSnapshots.push({tick,actingKey:actor.key,actingName:actor.name||actor.key,actingEnemy:!!actor.enemy,bars:state.map(a=>({key:a.key,name:a.name||a.key,master:a.master,spd:a.spd,spdPost:a.rawSpd!==undefined?runtimeSpeed(a.baseSpd,a.master,a.combat,a.effects||{}):a.spd,enemy:!!a.enemy,atb:preTurnBars.get(a.key)??0,atbPost:Math.round(a.atb*10)/10,dead:a.dead,acted:a.key===actor.key}))});
  if(stopAfterFirst&&alive().every(a=>seen.has(a.key)))break;
 }
 if(stopAfterFirst&&alive().some(a=>!seen.has(a.key)))throw new Error('Simulação de turnos excedeu o limite.');
 const ei=firstTurns.findIndex(t=>t.enemy),deadAllies=state.some(a=>a.dead&&!a.enemy&&!seen.has(a.key)),cut=deadAllies?true:state.some(a=>a.enemy)?ei>=0&&firstTurns.slice(ei+1).some(t=>!t.enemy):null;
 if(deadAllies)risks.push('Um aliado foi eliminado antes da primeira ação no cenário de dano informado.');
 return {turns,firstTurns,...(damageStates?{damageStates}:{}),...(captureReadiness?{firstReady}:{}),...(captureTickSnapshots?{tickSnapshots,captureTruncated:lastTick>snapshotLimit,captureTickLimit:snapshotLimit}:{}),log,checkpoints,risks:[...new Set(risks)],cut,state:state.map(a=>({key:a.key,hp:a.hp,atb:a.atb,dead:a.dead,spd:a.spd})),assumptions:'Eventos informados como resolvidos; sem sorteio de procs, resistência, dano ou seleção automática de habilidade.'};
}
export const COMBAT_EVENTS={tiana:'Tiana S3 · remoção de efeitos + 30% ATB',boost:'Boost de barra',reduce:'Redução de barra',damage:'Dano (% HP máximo por alvo/hit)',heal:'Cura resolvida (% HP máximo)',tablo:'Tablo · reset + buff SPD',buffs:'Quantidade global de buffs',speed_buff:'Aplicar buff SPD',slow:'Aplicar slow',antares:'Forçar proc Antares (RNG)',leo_attack:'Leo · ataque com redução 15%',cleanse:'Remover incapacidade/slow'};
export function normalizeScenario(raw={}){
 if(!Array.isArray(raw.enemies||[])||!Array.isArray(raw.events||[])||(raw.enemies||[]).length>5||(raw.events||[]).length>100)throw new Error('Cenário inválido.');
 const ref=v=>{if(typeof v!=='string'||! /^(?:ally:[0-5]|enemy:[0-4])$/.test(v))throw new Error('Referência de cenário inválida.');return v;};
 return {enemies:(raw.enemies||[]).map(e=>{const spd=number(e.spd,0,0,10000,'SPD inimiga'),master=number(e.master??e.masterId,0,0,1000000,'Monstro'),nemesisSets=number(e.nemesisSets,0,0,3,'Nemesis');if(!Number.isInteger(master)||!Number.isInteger(nemesisSets))throw new Error('Monstro/Nemesis inválido.');return {will:e.will===true,...(e.initialAtb!=null?{initialAtb:number(e.initialAtb,0,0,100,'Barra inicial')}:{}),master,label:String(e.label||'Inimigo').slice(0,80),spd,nemesisSets,combat:normalizeCombat(e.combat)};}),events:(raw.events||[]).map(e=>{if(!COMBAT_EVENTS[e.type])throw new Error('Evento inválido.');const occurrence=number(e.occurrence,1,1,100,'Turno');if(!Number.isInteger(occurrence)||!Array.isArray(e.targets||[])||(e.targets||[]).length>10)throw new Error('Alvos/turno inválidos.');return {afterKey:ref(e.afterKey),occurrence,type:e.type,targets:(e.targets||[]).map(ref),amount:number(e.amount,0,0,1000,'Valor'),critical:e.critical===true,glancing:e.glancing===true,enabled:e.enabled!==false};})};
}
export function scenarioForTeam(team,actors,{captureDamageState=false}={}){
 const raw=normalizeScenario(team.combatScenario),active=new Set(actors.map(actor=>actor.key)),risks=[];
 if(team.autoEnemyPassives)raw.enemies.forEach((e,i)=>{
  if(canonicalMonsterId(e.master)===16613&&!raw.events.some(v=>v.afterKey===`enemy:${i}`&&v.type==='leo_attack'))raw.events.push({afterKey:`enemy:${i}`,type:'leo_attack',occurrence:1,targets:[`ally:${team.leoTarget||0}`],amount:15});
 });
 const targets=team.configs.flatMap((config,index)=>active.has(config.key)?[`ally:${index}`]:[]);
 team.configs.forEach((config,index)=>{
  if(!active.has(config.key)||!config.masterId)return;
  const source=`ally:${index}`,skill=resolvedQuickSkill(config);
  const firstEvents=raw.events.filter(e=>e.enabled!==false&&e.afterKey===source&&e.occurrence===1);
  risks.push(...combatSkillRisks(config,skill,firstEvents));
  const autoBoost=team.autoOpener&&skill.isOpener&&!firstEvents.some(e=>e.type==='boost'||e.type==='tiana');
  if(captureDamageState&&team.autoOpener!==false&&skill.attackBuffDuration){
   raw.events.push({afterKey:source,type:'attack_buff',occurrence:1,targets,amount:0,duration:skill.attackBuffDuration});
  }
  if(autoBoost)raw.events.push({afterKey:source,type:skill.type,occurrence:1,targets,amount:skill.boost});
  if((autoBoost&&skill.speedBuff||team.autoOpener!==false&&skill.speedBuffOnly)&&!firstEvents.some(e=>e.type==='speed_buff')){
   raw.events.push({afterKey:source,type:'speed_buff',occurrence:1,targets,amount:0,...(skill.speedBuffDuration?{duration:skill.speedBuffDuration}:{})});
  }
 });
 const ref=k=>k.startsWith('ally:')?team.configs[Number(k.split(':')[1])]?.key:k;
 const combined=[...actors.map(actor=>{
  const placement=team.gamePlacement?.indexOf(actor.key);
  return placement>=0?{...actor,placementIndex:placement}:actor;
 }),...raw.enemies.flatMap((e,i)=>e.spd>0?[{...e,key:`enemy:${i}`,rawSpd:e.spd,enemy:true,name:e.label}]:[])];
 const available=new Set(combined.map(a=>a.key));
 const resolved=raw.events.map(e=>({...e,afterKey:ref(e.afterKey),targets:e.targets.map(ref)}));
 return {actors:combined,events:team.includePartial?resolved.filter(e=>available.has(e.afterKey)).map(e=>({...e,targets:e.targets.filter(k=>available.has(k))})):resolved,risks};
}

// Known Siege defense gear supplies real combat actors. A tick-only target
// remains a timeline marker and does not participate in the ATB queue.
function appendSiegeDefense(team,configured){
 const references=[],unknownDefense=[],matched=new Set();
 for(const [i,member] of (team.enemyDefense||[]).entries()){
  const master=canonicalMonsterId(member.masterId);
  const explicit=configured.actors.find(a=>a.enemy&&!matched.has(a.key)&&canonicalMonsterId(a.master)===master);
  if(explicit){matched.add(explicit.key);continue;}
  const actor={key:`defense:${i}`,master:member.masterId,name:member.label,enemy:true};
  const known=Number(member.combatSpd),bonus=Number(member.bonusSpd??(member.basis==='bonus'?member.goals?.spd:0));
  const sheet=member.basis==='total'?Number(member.goals?.spd):0,unit=monsterRecord(member.masterId);
  if(known>0){configured.actors.push({...actor,spd:known,combat:member.combat});matched.add(actor.key);continue;}
  if(unit&&(bonus>0||sheet>0)){
   const defense={gameMode:'siege',towerSpd:15,guildSpd:0,leader:team.siege?.defenseLeader||null};
   const rawSpd=combatSpeedFromSheet(sheet||unit.base.spd+bonus,unit,defense);
   configured.actors.push({...actor,spd:runtimeSpeed(rawSpd,actor.master,member.combat),rawSpd,combat:member.combat});matched.add(actor.key);continue;
  }
  const tick=Number(member.maxTick);
  if(Number.isInteger(tick)&&tick>0)references.push({...actor,tick,spd:null,referenceOnly:true});
  else unknownDefense.push(member.label);
 }
 return {references,unknownDefense};
}

// Auto-tuned quick plans already chose an opening action; their legacy floor
// switch can hide the advisory without removing the chosen action.
export const usesAutomaticOpening=team=>team.autoOpener!==false||team.automaticSync?.kind==='boost';

export function simulateTeamCombat(input,actors,{includeReference=true,...options}={}){
 const team={...input,autoOpener:usesAutomaticOpening(input),autoEnemyPassives:input.autoEnemyPassives??true};
 const configured=scenarioForTeam(team,actors,options);
 const {references,unknownDefense}=appendSiegeDefense(team,configured);
 const explicitEnemy=configured.actors.find(a=>a.enemy),enemy=Number(team.enemyCombatSpd)||0;
 const strategy=automaticSyncStrategy({...team,configs:team.configs.filter(c=>actors.some(a=>a.key===c.key))});
 const referenceEnemy=includeReference&&!team.target_goals&&!team.enemyDefense?.length&&!explicitEnemy&&!enemy&&(team.balanceEnabled||team.autoOpener&&strategy.kind==='boost'||cascadingBoostPlan(team,configured.events))
  ?automaticReferenceSpeed(actors[0].spd,team):0;
 const reference=enemy||referenceEnemy;
 if(!explicitEnemy&&reference>0)configured.actors.push({
  key:'quick-enemy',name:enemy?(team.enemyReference?.label||(team.enemyDefense?.length?'Referência inimiga':'Inimigo')):'Inimigo de referência',
  master:enemy?team.enemyReference?.masterId:0,spd:reference,enemy:true,
 });
 const scenario=simulateCombat(configured.actors,{
  stopAfterFirst:true,...options,events:configured.events,gaugeStep:gaugeStepForMode(team.gameMode,team.useRtaTickRate),
 });
 const defenseRisks=[...unknownDefense,...references.map(r=>r.name)].map(name=>`${name}: SPD da defesa ausente; o risco de corte permanece condicional.`);
 const enemyRisks=configured.actors.filter(a=>a.enemy&&canonicalMonsterId(a.master)===29711&&!a.combat?.oblivion)
  .map(a=>`${a.name||'Rigna/Ciri'}: a passiva de crítico depende da SPD do atacante; o dano não é resolvido automaticamente.`);
 scenario.risks=[...new Set([...scenario.risks,...configured.risks,...defenseRisks,...enemyRisks,...missingDefenseConditions(team,configured.actors)])];
 return {scenario,actors:configured.actors,references,unknownDefense,referenceEnemy,referenceSpeed:explicitEnemy?.spd||reference};
}
export function missingDefenseConditions(team,actors=[]){
 const configured=new Set([...actors.filter(a=>a.enemy),...(team.combatScenario?.enemies||[])].filter(e=>Number(e.spd)>0).map(e=>canonicalMonsterId(e.master??e.masterId)));
 return (team.enemyDefense||[]).filter(m=>!configured.has(canonicalMonsterId(m.masterId))&&(PASSIVES[canonicalMonsterId(m.masterId)]||passiveNotices[canonicalMonsterId(m.masterId)]||canonicalMonsterId(m.masterId)===29711)).map(m=>`${m.label}: informe SPD e eventos da defesa no cenário anti-corte; há mecânica de SPD/barra a considerar.`);
}

// Exact displayed delta after rounding, buffs/passives and capped combat attributes.
export function leaderImpact(unit,stats,counts,team,combat={},effects={}){
 const withLeader=combatAttributes(unit,stats,counts,team,combat,effects);
 const without=combatAttributes(unit,stats,counts,{...team,leader:null,leaderSpd:0,raidLeaders:[]},combat,effects);
 return {combat:withLeader,bonus:Object.fromEntries(['hp','atk','def','spd','cr','res','acc'].map(k=>[k,withLeader[k]-without[k]]))};
}

// Inspect resolved first-turn actions, including explicit scenario overrides.
export function cascadingBoostPlan(team,resolvedEvents){
 const actors=team.configs.filter(c=>c.enabled!==false).map(c=>({key:c.key,master:c.masterId,spd:1})),events=resolvedEvents||scenarioForTeam(team,actors).events;
 const sources=new Map();for(const e of events)if(Number(e.occurrence??1)===1&&(e.type==='tiana'||e.type==='boost'&&Number(e.amount)>0&&e.targets?.length)){const index=team.configs.findIndex(c=>c.key===e.afterKey);if(index>=0)sources.set(index,e.afterKey);}
 const indices=[...sources.keys()].sort((a,b)=>a-b),lastIndex=indices.at(-1);
 return indices.length>1&&indices[0]===0&&lastIndex<team.configs.length-1?{indices,lastIndex,lastKey:team.configs[lastIndex].key}:null;
}
export function cascadeReady(scenario,plan,keys){
 const checkpoint=scenario.checkpoints.find(p=>p.key===plan.lastKey&&p.occurrence===1);
 return !!checkpoint&&!checkpoint.disabled&&keys.every(key=>{const actor=checkpoint.bars.find(a=>a.key===key);return actor&&!actor.dead&&actor.atb>=100-1e-9;});
}

export function firstRotationSafe(scenario,keys,{consecutiveTicks=true}={}){
 const prefix=scenario.turns.slice(0,keys.length);
 return prefix.length===keys.length&&prefix.every((t,i)=>t.key===keys[i]&&!t.disabled&&(!consecutiveTicks||i===0||t.tick===prefix[0].tick+i));
}

export function requiredSheetSpeed(target,unit,team={},combat={},effects={},counts={},{conservative=false}={}){
 const desired=number(target,0,0,10000000,'SPD alvo');let lo=Math.ceil(unit.base.spd),hi=Math.max(lo,Math.ceil(desired));
 const speed=spd=>{const value=combatAttributes(unit,{total:{...unit.base,spd}},counts,team,combat,effects);return conservative?runtimeSpeedValue(value.rawSpd,unit.master,combat,effects):value.spd;};
 while(speed(hi)<desired&&hi<10000000)hi=Math.min(10000000,hi*2);
 if(speed(hi)<desired)return null;
 while(lo<hi){const mid=Math.floor((lo+hi)/2);if(speed(mid)>=desired)hi=mid;else lo=mid+1;}return lo;
}
