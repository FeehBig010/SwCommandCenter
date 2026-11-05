import catalog from './catalog.json' with {type:'json'};
import variants from './monster-variants.json' with {type:'json'};
const familyNames=new Map(),familyPeers=new Map();
for(const [id,peers]of Object.entries(variants.peers))for(const peer of peers){const family=variants.units[id]?.[1],other=variants.units[peer]?.[1];if(!family||!other)continue;const related=familyPeers.get(family)||new Set();related.add(other);familyPeers.set(family,related);}

for(const [id,ref]of Object.entries(variants.units)){
 const key=`${ref[1]}:${Number(id)%10}`,names=familyNames.get(key)||new Set();names.add(ref[0]);familyNames.set(key,names);
}
export function awakenedMonsterId(master){
 const id=Number(master),ref=variants.units[id];
 if(!ref||ref[2]>0||!ref[3])return id;
 const next=variants.units[ref[3]];return next&&next[2]>0?ref[3]:id;
}
export function variantSearchNames(master){
 const id=Number(master),names=new Set(),family=variants.units[id]?.[1]||Math.floor(id/100)*100;
 // Family-name aliases can cover a recent elemental entry absent from the
 // reference without claiming its awakening, stats or exact counterpart ID.
 for(const group of [family,...(familyPeers.get(family)||[])]){const title=catalog[String(group/100)];if(title)names.add(title);}

 for(const peer of [id,...(variants.peers[id]||[])]){
  const ref=variants.units[peer];if(!ref)continue;
  names.add(ref[0]);for(const name of familyNames.get(`${ref[1]}:${peer%10}`)||[])names.add(name);
 }
 return [...names];
}
export function collectionOrder(master){const id=Number(master),ref=variants.units[id];return [Number(ref?.[1])||Math.floor(id/100)*100,id%10,Number(ref?.[2])||0,id];}
export function compareCollectionOptions(a,b){const aa=collectionOrder(a.master),bb=collectionOrder(b.master);for(let i=0;i<aa.length;i++)if(aa[i]!==bb[i])return aa[i]-bb[i];return 0;}
// Catalog choices use the verified first awakening, not an invented +10 rule.
// SWEX instance choices keep their actual IDs/equipment, using only an awakened portrait.
export function monsterPickerOptions(options){
 const choices=new Map();
 for(const option of options){
  const id=Number(option.master),awake=awakenedMonsterId(id),ref=variants.units[awake],owned=option.unitId!=null||String(option.value).startsWith('unit:');
  const converted=awake!==id&&!owned;
  if(!owned&&ref?.[2]===0)continue;
  const value=option.value??String(id),prefix=String(value).match(/^(.*:)\d+$/)?.[1]||'';
  const next={...option,value,...(converted?{master:awake,value:`${prefix}${awake}`} : {}),name:owned?option.name:ref?.[0]||option.name,portraitMaster:awakenedMonsterId(option.portraitMaster??awake),searchAliases:[...new Set([...(option.searchAliases||[]),...variantSearchNames(id),...variantSearchNames(awake)])]};
  if(!choices.has(next.value))choices.set(next.value,next);
 }
 return [...choices.values()].sort(compareCollectionOptions);
}
