// SWEX deck layouts vary by exporter/game version. Unrecognized numeric types stay unclassified.
const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function classifyDeck(node={},path='',slots=0){
 const context=fold([path,node.area,node.mode,node.game_mode,node.content_name,node.deck_type].join(' '));
 if(/(?:^|[^a-z])rta(?:$|[^a-z])|world.?arena|arena.?world/.test(context))return {gameMode:'rta',dungeon:null};
 if(/arena/.test(context))return {gameMode:'arena',dungeon:null};
 if(/siege|gvg|guild|cerco/.test(context))return {gameMode:'siege',dungeon:null};
 const dungeonIds={6001:'nb12',6011:'nbah',8001:'gb12',8011:'gbah',9001:'db12',9011:'dbah',9501:'sf10',9502:'pc10'};
 const identified=dungeonIds[Number(node.dungeon_id??node.content_id)]||path.split('/').map(part=>dungeonIds[Number(part)]).find(Boolean);
 if(identified)return {gameMode:'cairos',dungeon:identified};
 const label=fold([path,node.name,node.deck_name,node.area,node.mode,node.content_name,node.dungeon_name,node.game_mode,node.deck_type].join(' '));
 const dungeon=[['gbah',/gbah|giant.*abyss|gigante.*abiss/],['dbah',/dbah|dragon.*abyss|dragao.*abiss/],['nbah',/nbah|necro.*abyss|necro.*abiss/],['gb12',/gb12|giant|gigante/],['db12',/db12|dragon|dragao/],['nb12',/nb12|necro/],['sf10',/sf10|steel|fortaleza/],['pc10',/pc10|punisher|cripta/]].find(([,re])=>re.test(label))?.[0];
 if(dungeon)return {gameMode:'cairos',dungeon};
 if(/arena/.test(label))return {gameMode:'arena',dungeon:null};
 if(/siege|gvg|guild|cerco/.test(label))return {gameMode:'siege',dungeon:null};
 // Unknown metadata must not make a four-unit RTA deck appear as Arena.
 return {gameMode:null,dungeon:null};
}
export function extractAccountPresets(deckList,units){
 const known=new Map(units.map(u=>[Number(u.id),u.id])),out=[],seen=new Set(),idsSeen=new Map();
 function walk(node,path='',depth=0,inherited={}){
  if(!node||typeof node!=='object'||depth>8||seen.has(node))return;seen.add(node);
  const context={...inherited,...Object.fromEntries(['dungeon_id','content_id','dungeon_name','content_name','area','mode','game_mode','deck_type'].filter(key=>Object.hasOwn(node,key)).map(key=>[key,node[key]]))};
  const rawIds=node.monster_ids??node.unit_id_list??node.unit_ids;
  if(Array.isArray(rawIds)){
   const ids=rawIds.slice(0,5).map(v=>Number(typeof v==='object'?v?.unit_id??v?.id:v));
   if(!ids.length||!ids.some(id=>Number.isSafeInteger(id)&&id>0))return;
   const area=classifyDeck({...context,...node},path,ids.length);
   const base=`deck-${String(node.deck_id??node.id??path).slice(0,80)}-${path.replace(/\/\d+(?=\/|$)/g,'').slice(0,80)}`,occurrence=idsSeen.get(base)||0;idsSeen.set(base,occurrence+1);
   const leaderId=Number(node.leader_unit_id??0),leaderIndex=leaderId>0?Math.max(0,ids.indexOf(leaderId)):Math.max(0,Math.min(ids.length-1,Math.floor(Number(node.leader_index)||0)));
   out.push({mode:/defen|defesa/.test(fold([path,node.mode,node.name,node.deck_name].join(' ')))?'defense':'attack',leaderIndex,id:`${base}-${occurrence}`,name:String(node.name??node.deck_name??`Deck ${out.length+1}`).slice(0,100),...area,unitIds:ids.map(id=>known.get(id)??null),missingIds:ids.filter(id=>id>0&&!known.has(id))});return;
  }
  for(const [key,value] of Object.entries(node))if(value&&typeof value==='object')walk(value,`${path}/${key}`,depth+1,context);
 }
 walk(deckList);return out;
}
