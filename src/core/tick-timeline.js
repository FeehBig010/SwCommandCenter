// View model only. Tick positions come from measured readiness, never from the
// serialized action queue or a natural-speed formula that would miss ATB events.
export function tickTimeline(preview){
 const ready=preview?.scenario?.firstReady||[],actors=new Map((preview?.actors||[]).map(a=>[a.key,a])),turns=new Map((preview?.turns||[]).map(t=>[t.key,t]));
 const groups=new Map(),allocated=new Set();
 for(const row of ready){
  if(!Number.isInteger(row.tick)||row.tick<0||allocated.has(row.key))continue;
  const actor=actors.get(row.key),turn=turns.get(row.key),member={key:row.key,name:actor?.name||row.name||(row.enemy?'Inimigo':'Monstro'),master:actor?.master??row.master,enemy:row.enemy===true,forced:row.forced===true,disabled:turn?.disabled??row.disabled,spd:turn?.spd??row.spd,actionTick:turn?.tick??null,readyTick:row.tick};
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
