import {monsterOpener} from './monsterDatabase.js';
import passiveNotices from './passive-notices.json' with {type:'json'};
import {leaderApplies,speedLeaderBonus} from './leaders.js';
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
export function normalizeCombat(raw={}){const result={speedBuff:raw.speedBuff===true,slow:raw.slow===true,disabled:raw.disabled===true,oblivion:raw.oblivion===true,hpPercent:number(raw.hpPercent,100,0,100,'HP'),buffCount:number(raw.buffCount,0,0,100,'Buffs'),mashaStacks:number(raw.mashaStacks,0,0,5,'Stacks Masha'),targetTick:number(raw.targetTick,0,0,10000,'Tick alvo')};if(![result.targetTick,result.buffCount,result.mashaStacks].every(Number.isInteger))throw new Error('Buffs, stacks e ticks devem ser inteiros.');return result;}
export function runtimeSpeed(raw,master,combat={},effects={}){
 const c=normalizeCombat(combat),p=c.oblivion?null:PASSIVES[master],a=effects.totals||effects;
 const passive=p==='miles'?Math.min(1,c.buffCount*.05):p==='masha'?c.mashaStacks*.1:p==='masha_dismounted'?-.15:0;
 // Buff/slow and dynamic passive percentages add; artifact lost-HP/incapacity scales separately.
 const status=1+(c.speedBuff?.3*(1+Number(a.spdBuff||0)/100):0)-(c.slow?.3:0)+passive;
 const artifact=1+Number(a.spdLostHp||0)*(1-c.hpPercent/100)/100+(c.disabled?Number(a.spdDisabled||0)/100:0);
 return Math.max(1,Math.ceil(raw*status*artifact-1e-10));
}
export function combatAttributes(unit,stats,counts={},team={},combat={},effects={}){
 const swift=25*Math.floor((counts[3]||0)/4),guild=(team.gameMode||'siege')==='siege'?Number(team.guildSpd||0):0;
 const raw=team.sheetSpeedFormula===true?Number(stats.total.spd)+unit.base.spd*(Number(team.towerSpd||0)+guild+speedLeaderBonus(unit,team))/100:stats.total.spd-Math.ceil(unit.base.spd*swift/100)+unit.base.spd*(swift+Number(team.towerSpd||0)+guild+speedLeaderBonus(unit,team))/100;
 if(!Number.isFinite(raw)||raw<=0)throw new Error('SPD de combate inválida.');
 const total={...stats.total,spd:runtimeSpeed(raw,unit.master,combat,effects)},leader=team.leader;
 if(leader&&leader.stat!=='spd'&&leaderApplies(leader,unit,team.gameMode||'siege')){
  const stat=leader.stat;total[stat]=Math.ceil(total[stat]+(['hp','atk','def'].includes(stat)?unit.base[stat]*leader.value/100:leader.value));
 }
 for(const key of ['cr','res','acc'])total[key]=Math.min(100,total[key]);
 return {...total,rawSpd:raw,master:unit.master};
}
// Fixed SW natural gauge increment; callers select integer tick deadlines, never a rate.
const NATURAL_GAUGE_STEP=7;
export function minimumSpeedForTick(tick,initialAtb=0){
 const t=number(tick,1,1,10000,'Tick'),atb=number(initialAtb,0,0,100,'Barra inicial');
 if(!Number.isInteger(t))throw new Error('Tick alvo deve ser inteiro.');
 return Math.max(1,Math.ceil((100-atb)*100/(NATURAL_GAUGE_STEP*t)-1e-10));
}
export function simulateFirstTurns(actors){
 if(actors.some(a=>!Number.isFinite(a.spd)||a.spd<=0))throw new Error('SPD de combate deve ser positiva e finita.');
 if(!actors.length)return [];
 return simulateCombat(actors,{stopAfterFirst:true}).firstTurns.map(({key,tick,spd,atb})=>({key,tick,spd,atb}));
}
export function simulateCombat(actors,{events=[],stopAfterFirst=false,maxTurns=30}={}){
 if(!Array.isArray(actors)||actors.length>20||!actors.length)throw new Error('Use de 1 a 20 unidades.');
 if(events.length>100||!Number.isInteger(maxTurns)||maxTurns<1||maxTurns>100)throw new Error('Cenário excede o limite.');
 const keys=new Set(),state=actors.map((a,index)=>{if(keys.has(a.key))throw new Error('Unidade repetida no cenário.');keys.add(a.key);const c=normalizeCombat(a.combat);return {...a,index,baseSpd:number(a.rawSpd??a.spd,0,.01,100000,'SPD'),spd:number(a.spd,0,.01,100000,'SPD'),atb:number(a.initialAtb,0,0,100,'Barra inicial'),hp:c.hpPercent,combat:c,passive:c.oblivion?null:PASSIVES[a.master],turns:0,dead:c.hpPercent<=0,nemesisRemainder:0};});
 const order=(a,b)=>(Math.abs(b.atb-a.atb)>1e-9?b.atb-a.atb:0)||b.spd-a.spd||Number(b.enemy||false)-Number(a.enemy||false)||a.index-b.index;
 const alive=()=>state.filter(a=>!a.dead),same=(a,b)=>!!a.enemy===!!b.enemy;
 const turns=[],firstTurns=[],seen=new Set(),log=[],risks=[],forced=[];
 for(const a of state)if(!a.combat.oblivion&&!a.passive&&passiveNotices[a.master])risks.push(`${a.name||a.key}: ${passiveNotices[a.master].join(', ')} exige eventos/regras adicionais; resultado condicional.`);
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
   if(source.master!==18913)throw new Error('Wind of Changes exige Tiana.');
   for(const target of alive()){target.combat.disabled=false;target.combat.slow=false;target.combat.speedBuff=false;target.combat.buffCount=0;target.will=false;}
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
   if(source.master!==21314)throw new Error('Reset Tablo exige Tablo como origem.');for(const a of alive()){a.atb=0;if(same(a,source)&&a.key!==source.key)a.combat.speedBuff=true;}source.combat.disabled=true;source.disabledFor=1;
  }else if(event.type==='buffs'){for(const a of alive())a.combat.buffCount=number(event.amount,0,0,100,'Buffs globais');}
  else if(event.type==='speed_buff'){for(const t of targets)t.combat.speedBuff=event.enabled!==false;}
  else if(event.type==='slow'){for(const t of targets)t.combat.slow=event.enabled!==false;}
  else if(event.type==='antares'){
   for(const t of targets){if(t.passive!=='antares'||same(t,source))throw new Error('Proc Antares exige Antares adversário da origem.');forced.push(t.key);}risks.push('Proc Antares forçado explicitamente; é um ramo condicional, não uma previsão de sorte.');
  }else throw new Error('Evento de combate não suportado.');
 }
 for(const e of events)if(!keys.has(e.afterKey)||!Number.isInteger(Number(e.occurrence??1))||Number(e.occurrence??1)<1)throw new Error('Origem ou turno de evento inválido.');
 const leo=alive().filter(a=>a.passive==='leo'&&!a.boss);if(leo.length)forced.push(...leo.slice().sort((a,b)=>b.spd-a.spd||a.index-b.index).map(a=>a.key));
 for(let tick=1;tick<=10000&&turns.length<(stopAfterFirst?10000:maxTurns);tick++){
  for(const a of alive()){if(a.rawSpd!==undefined)a.spd=runtimeSpeed(a.baseSpd,a.master,a.combat,a.effects||{});}
  const leos=alive().filter(a=>a.passive==='leo');const cap=leos.length?Math.min(...leos.map(a=>a.spd)):Infinity;
  for(const a of alive())a.atb+=(a.passive==='leo'||a.boss?a.spd:Math.min(cap,a.spd))*NATURAL_GAUGE_STEP/100;
  const forcedKey=forced.shift(),actor=forcedKey?alive().find(a=>a.key===forcedKey):alive().filter(a=>a.atb>=100-1e-9).sort(order)[0];
  if(!actor){if(!alive().length)break;continue;}
  const row={key:actor.key,tick,spd:actor.spd,atb:actor.atb,enemy:!!actor.enemy,forced:!!forcedKey,disabled:actor.combat.disabled};if(row.disabled)risks.push(`${actor.name||actor.key}: turno consumido por incapacidade, sem executar ação.`);turns.push(row);if(!seen.has(actor.key)){seen.add(actor.key);firstTurns.push(row);}actor.turns++;actor.atb=0;
  // Disabled turns consume ATB but cannot execute the configured actions; duration changes require explicit scenario state.
  const skipped=actor.combat.disabled;
  if(!skipped)for(const e of events.filter(e=>e.afterKey===actor.key&&Number(e.occurrence??1)===actor.turns))apply(e,actor,tick);
  if(skipped&&actor.disabledFor){actor.disabledFor--;if(!actor.disabledFor)actor.combat.disabled=false;}
  for(const am of alive().filter(a=>a.passive==='amduat'&&!same(a,actor)))skillBoost([am],25,am);
  if(stopAfterFirst&&alive().every(a=>seen.has(a.key)))break;
 }
 if(stopAfterFirst&&alive().some(a=>!seen.has(a.key)))throw new Error('Simulação de turnos excedeu o limite.');
 const ei=firstTurns.findIndex(t=>t.enemy),deadAllies=state.some(a=>a.dead&&!a.enemy&&!seen.has(a.key)),cut=deadAllies?true:state.some(a=>a.enemy)?ei>=0&&firstTurns.slice(ei+1).some(t=>!t.enemy):null;
 if(deadAllies)risks.push('Um aliado foi eliminado antes da primeira ação no cenário de dano informado.');
 return {turns,firstTurns,log,risks:[...new Set(risks)],cut,state:state.map(a=>({key:a.key,hp:a.hp,atb:a.atb,dead:a.dead,spd:a.spd})),assumptions:'Eventos informados como resolvidos; sem sorteio de procs, resistência, dano ou seleção automática de habilidade.'};
}
export const COMBAT_EVENTS={tiana:'Tiana S3 · remoção de efeitos + 30% ATB',boost:'Boost de barra',reduce:'Redução de barra',damage:'Dano (% HP máximo por alvo/hit)',heal:'Cura resolvida (% HP máximo)',tablo:'Tablo · reset + buff SPD',buffs:'Quantidade global de buffs',speed_buff:'Aplicar buff SPD',slow:'Aplicar slow',antares:'Forçar proc Antares (RNG)',leo_attack:'Leo · ataque com redução 15%',cleanse:'Remover incapacidade/slow'};
export function normalizeScenario(raw={}){
 if(!Array.isArray(raw.enemies||[])||!Array.isArray(raw.events||[])||(raw.enemies||[]).length>5||(raw.events||[]).length>100)throw new Error('Cenário inválido.');
 const ref=v=>{if(typeof v!=='string'||! /^(?:ally:[0-5]|enemy:[0-4])$/.test(v))throw new Error('Referência de cenário inválida.');return v;};
 return {enemies:(raw.enemies||[]).map(e=>{const spd=number(e.spd,0,0,10000,'SPD inimiga'),master=number(e.master??e.masterId,0,0,1000000,'Monstro'),nemesisSets=number(e.nemesisSets,0,0,3,'Nemesis');if(!Number.isInteger(master)||!Number.isInteger(nemesisSets))throw new Error('Monstro/Nemesis inválido.');return {will:e.will===true,master,label:String(e.label||'Inimigo').slice(0,80),spd,nemesisSets,combat:normalizeCombat(e.combat)};}),events:(raw.events||[]).map(e=>{if(!COMBAT_EVENTS[e.type])throw new Error('Evento inválido.');const occurrence=number(e.occurrence,1,1,100,'Turno');if(!Number.isInteger(occurrence)||!Array.isArray(e.targets||[])||(e.targets||[]).length>10)throw new Error('Alvos/turno inválidos.');return {afterKey:ref(e.afterKey),occurrence,type:e.type,targets:(e.targets||[]).map(ref),amount:number(e.amount,0,0,1000,'Valor'),critical:e.critical===true,glancing:e.glancing===true,enabled:e.enabled!==false};})};
}
export function scenarioForTeam(team,actors){
 const raw=normalizeScenario(team.combatScenario);if(team.autoEnemyPassives)raw.enemies.forEach((e,i)=>{if(e.master===16613&&!raw.events.some(v=>v.afterKey===`enemy:${i}`&&v.type==='leo_attack'))raw.events.push({afterKey:`enemy:${i}`,type:'leo_attack',occurrence:1,targets:[`ally:${team.leoTarget||0}`],amount:15,critical:false,glancing:false});});if(team.autoOpener){const opener=team.configs[0],skill=monsterOpener(opener?.masterId);if(skill&&!raw.events.some(e=>e.afterKey==='ally:0'&&Number(e.occurrence??1)===1&&['boost','tiana'].includes(e.type)))raw.events.push({afterKey:'ally:0',type:skill.type,occurrence:1,targets:[],amount:skill.boost});}const ref=k=>k.startsWith('ally:')?team.configs[Number(k.split(':')[1])]?.key:k;
 return {actors:[...actors,...raw.enemies.filter(e=>e.spd>0).map(e=>{const i=raw.enemies.indexOf(e);return {...e,key:`enemy:${i}`,rawSpd:e.spd,enemy:true,name:e.label};})],events:raw.events.map(e=>({...e,afterKey:ref(e.afterKey),targets:e.targets.map(ref)}))};
}
export function missingDefenseConditions(team){
 const configured=new Set((team.combatScenario?.enemies||[]).filter(e=>Number(e.spd)>0).map(e=>Number(e.master??e.masterId)));
 return (team.enemyDefense||[]).filter(m=>!configured.has(Number(m.masterId))&&(PASSIVES[m.masterId]||passiveNotices[m.masterId])).map(m=>`${m.label}: informe SPD e eventos da defesa no cenário anti-corte; há mecânica de SPD/barra a considerar.`);
}

// Exact displayed delta after rounding, buffs/passives and capped combat attributes.
export function leaderImpact(unit,stats,counts,team,combat={},effects={}){
 const withLeader=combatAttributes(unit,stats,counts,team,combat,effects);
 const without=combatAttributes(unit,stats,counts,{...team,leader:null,leaderSpd:0},combat,effects);
 return {combat:withLeader,bonus:Object.fromEntries(['hp','atk','def','spd','cr','res','acc'].map(k=>[k,withLeader[k]-without[k]]))};
}
