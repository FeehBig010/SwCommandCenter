// View model only. Tick positions come from measured readiness, never from the
// serialized action queue or a natural-speed formula that would miss ATB events.
export function tickTimeline(preview){
 const ready=[...(preview?.scenario?.firstReady||[]),...(preview?.references||[])],actors=new Map((preview?.actors||[]).map(a=>[a.key,a])),turns=new Map((preview?.turns||[]).map(t=>[t.key,t]));
 const groups=new Map(),allocated=new Set();
 for(const row of ready){
  if(!Number.isInteger(row.tick)||row.tick<0||allocated.has(row.key))continue;
  const actor=actors.get(row.key),turn=turns.get(row.key),member={key:row.key,name:actor?.name||row.name||(row.enemy?'Inimigo':'Monstro'),master:actor?.master??row.master,enemy:row.enemy===true,forced:row.forced===true,disabled:turn?.disabled??row.disabled,spd:turn?.spd??row.spd,actionTick:turn?.tick??null,readyTick:row.tick,...(row.referenceOnly?{referenceOnly:true}:{})};
  if(!groups.has(row.tick))groups.set(row.tick,[]);groups.get(row.tick).push(member);allocated.add(row.key);
 }
 const ticks=[...groups.keys()].sort((a,b)=>a-b),start=ticks[0]??1,end=ticks.at(-1)??start,cells=[];
 let cursor=start;
 for(const tick of ticks){
  // Compact DOM for very long empty ranges, with the exact number of grid
  // columns retained so spacing still represents real elapsed ticks.
  if(tick-cursor>24)cells.push({tick:cursor,end:tick-1,span:tick-cursor,members:[]});
  else for(let empty=cursor;empty<tick;empty++)cells.push({tick:empty,end:empty,span:1,members:[]});
  cells.push({tick,end:tick,span:1,members:groups.get(tick)});cursor=tick+1;
 }
 return {start,end,count:end-start+1,cells,unallocated:[...actors.values()].filter(a=>!allocated.has(a.key))};
}


import {minimumSpeedForTick,NATURAL_GAUGE_STEP,RTA_GAUGE_STEP} from './speedTuner.js';

export function tickCardsFromPreview(preview,{maxTicks=120}={}){
 if(!preview?.complete||!preview?.scenario)return {synced:false,cut:null,statusMessage:'Selecione os monstros para simular os ticks.',cards:[]};
 const snapshots=preview.scenario.tickSnapshots||[];
 const turns=preview.turns||[];
 const allyActors=(preview.actors||[]).filter(a=>!a.enemy);
 const allyKeys=allyActors.map(a=>a.key);
 const firstAllyTurns=turns.filter(t=>!t.enemy).map(t=>t.key);
 const inOrder=allyKeys.every((k,idx)=>firstAllyTurns[idx]===k);
 const cut=preview.cut===true;
 const synced=!preview.partial&&preview.cut===false&&inOrder&&!turns.some(t=>t.disabled||t.skipped);
 const statusMessage=preview.partial?'Cenário parcial: somente os monstros selecionados foram simulados.'
  :synced?'Ordem preservada contra a referência simulada; não garante segurança contra outras defesas.'
  :cut?'Interrupção observada no cenário. Consulte os turnos e eventos.'
  :inOrder?'Ordem observada, sem referência suficiente para avaliar cortes.'
  :'Aliados fora da ordem de turno esperada.';
 const lastFirstTurnTick=Math.max(1,...turns.map(t=>Number(t.tick)||1));
 const limit=Math.min(maxTicks,Math.max(lastFirstTurnTick,snapshots.length));
 const cards=snapshots.slice(0,limit).map(snap=>({
  tick:snap.tick,
  actingKey:snap.actingKey,
  actingName:snap.actingName,
  actingEnemy:snap.actingEnemy,
  bars:(snap.bars||[]).map(b=>({
   key:b.key,
   name:b.name,
   master:b.master,
   spd:b.spd,
   spdPost:b.spdPost??b.spd,
   enemy:!!b.enemy,
   atb:Number(b.atb||0),
   atbPost:Number(b.atbPost||0),
   acted:!!b.acted,
   dead:!!b.dead
  }))
 }));
 const events=preview.scenario.log||[];for(const card of cards)card.events=events.filter(e=>e.tick===card.tick);
 return {synced,cut,inOrder,statusMessage,cards,truncated:preview.scenario.captureTruncated===true||snapshots.length>limit};
}

export function tickBreakpointsTable({gaugeStep=NATURAL_GAUGE_STEP,maxTick=20,initialAtb=0}={}){
 const step=Number(gaugeStep)===RTA_GAUGE_STEP?RTA_GAUGE_STEP:NATURAL_GAUGE_STEP;
 const maxT=Math.max(1,Math.min(60,Math.floor(Number(maxTick)||20)));
 const atb=Math.max(0,Math.min(99,Number(initialAtb)||0));
 const rows=[];
 for(let tick=1;tick<=maxT;tick++){
  const minCombatSpd=minimumSpeedForTick(tick,atb,step);
  const nextTickSpd=tick<maxT?minimumSpeedForTick(tick+1,atb,step):1;
  rows.push({
   tick,
   gaugeStep:step,
   initialAtb:atb,
   minCombatSpd,
   maxCombatSpd:tick===1?999:Math.max(minCombatSpd,minimumSpeedForTick(tick-1,atb,step)-1),
   nextTickFloor:nextTickSpd
  });
 }
 return rows;
}
