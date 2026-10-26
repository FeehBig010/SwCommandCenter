import {runeEfficiency} from './accountDiagnostic.js';
import {accountStamp,currentRuneIds} from './loadouts.js';
import {cleanAccountResources} from './account-resources.js';

export function swexFreshness(importedAt,now=Date.now()){
 const time=Date.parse(importedAt),age=now-time;
 if(!Number.isFinite(time)||age< -300000)return 'unknown';
 return age<=86400000?'fresh':'stale';
}
function defenseTeams(account,teams){
 const found=teams.filter(t=>t.gameMode==='siege'&&t.mode==='defense'&&t.active!==false),known=new Set(found.map(t=>t.sourceDeckId));
 const presets=(account.accountPresets||[]).filter(p=>p.gameMode==='siege'&&p.mode==='defense');
 const sources=presets.length?presets:(account.siege||[]).map((p,i)=>({...p,id:`native-defense-${i}`}));
 for(const p of sources)if(!known.has(p.id))found.push({id:p.id,sourceDeckId:p.id,name:p.name,configs:(p.unitIds||[]).map((unitId,i)=>({key:`native:${i}`,unitId})),equipment:p.equipment});
 return found;
}
export function analyzeDashboard(account,{teams=[],options={},reservedIds=[]}={}){
 if(!account)return {defenses:{total:0,equipped:0},efficiency:null,insights:[],energy:null};
 const units=new Map(account.units.map(u=>[u.id,u])),runes=new Map(account.runes.map(r=>[r.id,r])),blocked=new Set([...reservedIds,...(options.blockedRuneIds||[]),...(options.localLocks?.runeIds||[])]),equippedIds=new Set();
 for(const unit of account.units)for(const id of unit.runeIds||[])equippedIds.add(id);
 for(const preset of account.accountPresets||[])if(preset.gameMode!=='rta')for(const equipment of preset.equipment||[])for(const id of equipment.runeIds||[])equippedIds.add(id);
 for(const team of teams)for(const config of team.configs||[]){const unit=units.get(config.unitId);if(unit)for(const id of currentRuneIds(account,team,config,unit)||[])equippedIds.add(id);}
 const efficiencies=[],fast=[];
 for(const rune of account.runes){
  const efficiency=runeEfficiency(rune);if(efficiency!==null&&Number.isFinite(efficiency))efficiencies.push(efficiency);
  if(rune.stars!==6||rune.owner||rune.pool==='rta'||rune.locked||equippedIds.has(rune.id)||blocked.has(rune.id))continue;
  const stat=(rune.subs||[]).find(s=>s[0]===8),speed=stat?Number(stat[1])+Number(stat[3]||0):0;
  if(speed>=18)fast.push({id:rune.id,spd:speed,set:rune.set});
 }
 efficiencies.sort((a,b)=>b-a);const top=efficiencies.slice(0,100);
 fast.sort((a,b)=>b.spd-a.spd||a.id-b.id);
 const defenses=defenseTeams(account,teams),incomplete=[],will=new Map();let equipped=0;
 for(const team of defenses){
  let complete=team.configs.length===3;const ids=new Set(),members=[];
  for(const config of team.configs){
   const unit=units.get(config.unitId),equipment=team.equipment?.find(e=>e.unitId===unit?.id);
   const gear=(unit?(equipment?.runeIds??currentRuneIds(account,team,config,unit)??[]):[]).map(id=>runes.get(id));
   const full=!!unit&&config.enabled!==false&&gear.length===6&&gear.every(r=>r&&r.slot>=1&&r.slot<=6)&&new Set(gear.map(r=>r?.id)).size===6&&new Set(gear.map(r=>r?.slot)).size===6;
   if(!full||ids.has(unit?.id))complete=false;
   if(unit)ids.add(unit.id);
   if(full&&gear.filter(r=>r.set===15).length<2)members.push(unit);
  }
  if(complete){equipped++;for(const unit of members)if(!will.has(unit.id))will.set(unit.id,{id:unit.id,name:unit.name,teamId:team.id,sourceDeckId:team.sourceDeckId});}
  else incomplete.push(team);
 }
 const insights=[];
 if(incomplete.length){const team=incomplete[0];insights.push({id:'incomplete-defense',kind:'equipment',title:'Equipamento incompleto',count:incomplete.length,summary:`${incomplete.length} defesa${incomplete.length===1?'':'s'} no acervo`,label:'Completar time',action:{area:'siege',view:'defense',teamId:team.id,sourceDeckId:team.sourceDeckId}});}
 if(fast.length)insights.push({id:'free-speed',kind:'speed',title:'Runas livres com SPD',count:fast.length,summary:`${fast.length} runa${fast.length===1?'':'s'} · +18 SPD ou mais`,label:'Ver runas',runeId:fast[0].id,set:fast[0].set,action:{area:'workshop',runeId:fast[0].id,runeIds:fast.map(r=>r.id)}});
 if(will.size){const first=will.values().next().value;insights.push({id:'review-will',kind:'will',title:'Revisar Will',count:will.size,summary:`${will.size} monstro${will.size===1?'':'s'} nas defesas`,label:'Revisar defesas',action:{area:'siege',view:'defense',teamId:first.teamId,sourceDeckId:first.sourceDeckId}});}
 // Order is stable and bounded. Findings open the exact equipment/team; no
 // inventory mutation, optimization or battle-outcome guarantee is implicit.
 const order={speed:0,will:1,equipment:2};insights.sort((a,b)=>order[a.kind]-order[b.kind]);
 const energy=cleanAccountResources(account.resources).dimensionalEnergy||null;
 return {accountStamp:accountStamp(account),defenses:{total:defenses.length,equipped,incomplete:incomplete.length},efficiency:top.length?Math.round(top.reduce((sum,n)=>sum+n,0)/top.length*10)/10:null,efficiencySample:top.length,energy,insights:insights.slice(0,3)};
}
