export const isPriority=team=>team.priorityFocus===true||Number(team.priority)>1;
// Compare normalized team deficits first, then the worst relative objective loss.
// Priority teams form a lexicographically earlier allocation tier.
export function allocationScore(assignments,teams,bestUtility={}){
 const groups={priority:[],regular:[]};
 for(const team of teams){const configs=team.configs.filter(c=>c.enabled!==false&&assignments[c.key]);if(!configs.length)continue;
  let deficit=0,regret=0,utility=0;
  for(const c of configs){const a=assignments[c.key],goals=Object.values(c.goals||{}).filter(v=>Number(v)>0).length+(Number(c.combatSpd)>0?1:0);deficit+=a.deficit/Math.max(1,goals);const reference=bestUtility[c.key]||a.utility||1;regret+=Math.max(0,1-a.utility/reference);utility+=a.utility;}
  groups[isPriority(team)?'priority':'regular'].push({deficit:deficit/configs.length,regret:regret/configs.length,utility:utility/configs.length});
 }
 const summary=rows=>[Math.max(0,...rows.map(r=>r.deficit)),rows.reduce((n,r)=>n+r.deficit,0),Math.max(0,...rows.map(r=>r.regret)),rows.reduce((n,r)=>n+r.regret,0),-rows.reduce((n,r)=>n+r.utility,0)];
 return [...summary(groups.priority),...summary(groups.regular)];
}
export function compareAllocation(a,b){for(let i=0;i<a.length;i++){const diff=a[i]-b[i];if(Math.abs(diff)>1e-9)return diff;}return 0;}
