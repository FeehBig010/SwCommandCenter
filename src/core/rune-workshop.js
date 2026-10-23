import {craftCeiling,simulateRuneCraft} from './rune-crafts.js';
import {calculateStats,artifactBonus} from './optimizer.js';
import {STATS} from './data.js';

// Hypothetical stones: validate game rules without spending inventory or
// modifying the imported rune. Values are chosen rolls, not guaranteed rolls.
export function simulateRuneImprovement(rune,{kind,index,stat,value}){
 const cap=craftCeiling(kind,Number(stat),!!rune.ancient,5),amount=Number(value);
 if(!['gem','grind'].includes(kind)||cap==null||!Number.isInteger(amount)||amount<1||amount>cap)throw new Error('Valor fora do limite validado desta pedra.');
 const current=rune.subs[index];
 if(!current)throw new Error('Escolha um secundário.');
 if(kind==='grind'&&amount<=(current[3]||0)||kind==='gem'&&current[0]===Number(stat)&&amount<=current[1])throw new Error('O valor deve melhorar o atributo atual.');
 const craft={id:1,kind,stat:Number(stat),set:rune.set,ancient:!!rune.ancient,grade:5,quantity:1};
 const next=simulateRuneCraft(rune,craft,{index}).rune;
 next.subs[index][kind==='grind'?3:1]=amount;
 return next;
}
export function projectRuneImprovement(account,original,draft){
 const unit=account?.units.find(u=>u.runeIds.includes(original.id));
 if(!unit)return null;
 const byId=new Map(account.runes.map(r=>[r.id,r])),equipped=unit.runeIds.map(id=>byId.get(id)).filter(Boolean);
 const flat=artifactBonus({...account,artifacts:account.artifacts||[]},{...unit,artifactIds:unit.artifactIds||[]});
 const before=calculateStats(unit,equipped,flat).total,after=calculateStats(unit,equipped.map(r=>r.id===original.id?draft:r),flat).total;
 return {unit,before,after,gains:Object.fromEntries(STATS.map(key=>[key,after[key]-before[key]])),complete:equipped.length===6};
}
