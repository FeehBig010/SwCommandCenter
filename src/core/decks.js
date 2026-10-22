// Normalize only deck metadata and account unit references, never copy raw SWEX objects.
export function extractAccountPresets(deckList,units){
 const known=new Map(units.map(u=>[Number(u.id),u.id])),out=[],seen=new Set();
 function walk(node,path='',depth=0){
  if(!node||typeof node!=='object'||depth>5||seen.has(node)||out.length>=500)return;
  seen.add(node);
  const rawIds=node.monster_ids??node.unit_id_list??node.unit_ids;
  if(Array.isArray(rawIds)){
   const ids=rawIds.slice(0,5).map(v=>Number(typeof v==='object'?v?.unit_id??v?.id:v));
   if(!ids.length||!ids.some(id=>Number.isSafeInteger(id)&&id>0))return;
   out.push({id:`deck-${out.length}-${String(node.deck_id??node.id??path).slice(0,60)}`,
    name:String(node.name??node.deck_name??`Deck ${out.length+1}`).slice(0,100),
    unitIds:ids.map(id=>known.get(id)??null),missingIds:ids.filter(id=>id>0&&!known.has(id))});
   return;
  }
  for(const [key,value] of Object.entries(node))if(value&&typeof value==='object')walk(value,`${path}/${key}`,depth+1);
 }
 walk(deckList);return out;
}
