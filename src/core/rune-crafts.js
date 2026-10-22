// Six-star legendary max-roll ceilings. Lower grades are handled explicitly below.
export const REGULAR_GEM={1:580,2:13,3:40,4:13,5:40,6:13,8:10,9:9,10:10,11:11,12:11};
export const REGULAR_GRIND={1:550,2:10,3:30,4:10,5:30,6:10,8:5};
// Ancient HP/ATK/DEF flat rolls are deliberately not guessed. Supported extended
// ceilings cover percent stats and SPD; unavailable combinations stay explicit.
export const ANCIENT_GEM={2:15,4:15,6:15,8:11,9:10,10:12,11:13,12:13};
export const ANCIENT_GRIND={2:12,4:12,6:12,8:6};
const REGULAR={gem:{1:[150,220,310,420,580],2:[4,7,9,11,13],3:[12,16,23,30,40],4:[4,7,9,11,13],5:[12,16,23,30,40],6:[4,7,9,11,13],8:[3,4,6,8,10],9:[3,4,5,7,9],10:[3,5,6,8,10],11:[4,6,8,9,11],12:[4,6,8,9,11]},grind:{1:[120,200,250,450,550],2:[3,5,6,7,10],3:[8,12,18,22,30],4:[3,5,6,7,10],5:[8,12,18,22,30],6:[3,5,6,7,10],8:[2,2,3,4,5]}};
export function craftCeiling(kind,stat,ancient=false,grade=5){if(!Number.isInteger(grade)||grade<1||grade>5)return null;return ancient?(grade===5?(kind==='gem'?ANCIENT_GEM:ANCIENT_GRIND)[stat]??null:null):REGULAR[kind]?.[stat]?.[grade-1]??null;}
// SWEX craft_type is the kind (1 gem/2 grind/5 ancient gem/6 ancient grind).
// Packed craft_type_id: set prefix, two stat digits, two quality digits.
export function normalizeCrafts(rows){
 const result=[];for(const r of Array.isArray(rows)?rows.slice(0,100000):[]){const type=Number(r.craft_type),packed=Number(r.craft_type_id),id=Number(r.craft_item_id??r.id),quantity=Number(r.quantity??r.amount??1);if(![1,2,5,6].includes(type)||!Number.isSafeInteger(packed)||packed<=0||!Number.isSafeInteger(id)||id<=0||!Number.isInteger(quantity)||quantity<1||quantity>1000000)continue;const set=Math.floor(packed/10000),stat=Math.floor(packed/100)%100,grade=packed%100;if(set<1||set>25||![1,2,3,4,5,6,8,9,10,11,12].includes(stat)||grade<1||grade>5)continue;result.push({id,kind:[1,5].includes(type)?'gem':'grind',set,stat,grade,ancient:type>=5,quantity});}return [...new Map(result.map(c=>[c.id,c])).values()];
}
export function compatibleCrafts(rune,crafts){return (crafts||[]).filter(c=>c.quantity>0&&c.set===rune.set&&c.ancient===!!rune.ancient&&craftCeiling(c.kind,c.stat,c.ancient,c.grade)!==null);}
export function simulateRuneCraft(rune,craft,{index,used={}}={}){
 if(rune.stars!==6)throw new Error('Simulador disponível para runas de seis estrelas.');
 if(!compatibleCrafts(rune,[craft]).length||Number(used[craft.id]||0)>=craft.quantity)throw new Error('Pedra incompatível, limite não validado ou estoque esgotado.');
 if(!Number.isInteger(index)||!rune.subs[index])throw new Error('Escolha um atributo secundário.');
 const cap=craftCeiling(craft.kind,craft.stat,craft.ancient,craft.grade),subs=rune.subs.map(e=>e.slice()),current=subs[index];
 if(craft.kind==='grind'){if(current[0]!==craft.stat||cap<=(current[3]||0))throw new Error('Grind não melhora este atributo.');current[3]=cap;}
 else{if(rune.level<12||subs.length!==4)throw new Error('A gema exige quatro secundários revelados (+12).');if(subs.some((e,i)=>e[2]&&i!==index))throw new Error('Somente um slot pode receber gema por runa.');if(rune.main[0]===craft.stat||rune.innate?.[0]===craft.stat||subs.some((e,i)=>i!==index&&e[0]===craft.stat)||rune.slot===1&&[5,6].includes(craft.stat)||rune.slot===3&&[3,4].includes(craft.stat))throw new Error('Atributo não permitido neste slot.');if(current[0]===craft.stat&&cap<=current[1])throw new Error('Gema não melhora este atributo.');subs[index]=[craft.stat,cap,1,current[0]===craft.stat?(current[3]||0):0];}
 return {rune:{...rune,subs},used:{...used,[craft.id]:Number(used[craft.id]||0)+1},maxRoll:cap};
}
