// Presentation only: never reorder semantic configs, physical placement or events.
export function visualConfigs(configs,order){
 const byKey=new Map(configs.map(c=>[c.key,c])),seen=new Set(),result=[];
 for(const key of Array.isArray(order)?order:[])if(byKey.has(key)&&!seen.has(key)){result.push(byKey.get(key));seen.add(key);}
 return [...result,...configs.filter(c=>!seen.has(c.key))];
}
export function moveVisualCard(configs,order,key,offset){
 const keys=visualConfigs(configs,order).map(c=>c.key),from=keys.indexOf(key),to=from+offset;
 if(from>=0&&Number.isInteger(offset)&&to>=0&&to<keys.length)[keys[from],keys[to]]=[keys[to],keys[from]];
 return keys;
}
