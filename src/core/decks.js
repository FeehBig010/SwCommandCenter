// SWEX deck layouts vary by exporter/game version. Unrecognized numeric types stay unclassified.
const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function classifyDeck(node={},path='',slots=0){
 const context=fold([path,node.area,node.mode,node.game_mode,node.content_name,node.deck_type].join(' '));
 if(/(?:^|[^a-z])rta(?:$|[^a-z])|world.?arena|arena.?world/.test(context))return {gameMode:'rta',dungeon:null};
 if(/arena/.test(context))return {gameMode:'arena',dungeon:null};
 if(/siege|gvg|guild|cerco/.test(context))return {gameMode:'siege',dungeon:null};
 const pve=fold([context,node.dungeon_name,node.name,node.deck_name].join(' '));
 if(pve.includes('pve-other'))return {gameMode:'cairos',dungeon:'pve-other'};
 const dimension=['karzhan','ellunia','lumel','khalderun'].find(v=>pve.includes(v));if(dimension)return {gameMode:'dimensional',dungeon:dimension};
 const rift=['ice-beast','fire-beast','wind-beast','light-beast','dark-beast','r5'].find(v=>pve.includes(v));if(rift)return {gameMode:'rift',dungeon:rift};
 // These IDs overlap with elemental Halls. Require a Rift namespace as well.
 if(/elemental.?rift|rift.?dungeon|(?:^|[^a-z])rift(?:$|[^a-z])/.test(pve)&&!/raid/.test(pve)){
  const beasts={1001:'ice-beast',2001:'fire-beast',3001:'wind-beast',4001:'light-beast',5001:'dark-beast'};
  const beast=beasts[Number(node.dungeon_id??node.content_id)]||path.split('/').map(part=>beasts[Number(part)]).find(Boolean);
  if(beast)return {gameMode:'rift',dungeon:beast};
 }
 if(/toa|tower.of.ascension|trial.?tower/.test(pve))return {gameMode:'toa',dungeon:/hell/.test(pve)?'toahell':/hard|toah/.test(pve)||Number(node.difficulty)===2?'toah':'toan'};
 const dungeonIds={6001:'nb12',6011:'nbah',8001:'gb12',8011:'gbah',9001:'db12',9011:'dbah',9501:'sf10',9502:'pc10'};
 const identified=dungeonIds[Number(node.dungeon_id??node.content_id)]||path.split('/').map(part=>dungeonIds[Number(part)]).find(Boolean);
 if(identified)return {gameMode:'cairos',dungeon:identified};
 const label=fold([path,node.name,node.deck_name,node.area,node.mode,node.content_name,node.dungeon_name,node.game_mode,node.deck_type].join(' '));
 const dungeon=[['gbah',/gbah|giant.*abyss|gigante.*abiss/],['dbah',/dbah|dragon.*abyss|dragao.*abiss/],['nbah',/nbah|necro.*abyss|necro.*abiss/],['gb12',/gb12|giant|gigante/],['db12',/db12|dragon|dragao/],['nb12',/nb12|necro/],['sf10',/sf10|steel|fortaleza/],['pc10',/pc10|punisher|cripta/]].find(([,re])=>re.test(label))?.[0];
 if(dungeon)return {gameMode:'cairos',dungeon};
 if(/arena/.test(label))return {gameMode:'arena',dungeon:null};
 if(/siege|gvg|guild|cerco/.test(label))return {gameMode:'siege',dungeon:null};
 // Unknown metadata must not make a four-unit RTA deck appear as Arena.
 if(/dungeon|cairos/.test(context))return {gameMode:'cairos',dungeon:null};
 return {gameMode:null,dungeon:null};
}
const SLOT_FIELDS=['monster_ids','unit_id_list','unit_ids','unit_list'];
const isReference=value=>value==null||['number','string'].includes(typeof value)||typeof value==='object'&&!Array.isArray(value)&&SLOT_FIELDS.every(k=>!Object.hasOwn(value,k))&&(Object.hasOwn(value,'unit_id')&&typeof value.unit_id!=='object'||Object.hasOwn(value,'id')&&!Object.hasOwn(value,'deck_id'));
// Some exports encode a list as an object keyed by slot. Preserve holes, rather
// than compacting with filter(Boolean), so the leader and formation do not move.
function positionedSlots(entries){
 const positions=entries.map(([position])=>Number(position)),start=positions.includes(0)?0:1;
 if(positions.every(p=>Number.isInteger(p)&&p>=start&&p<start+6)&&new Set(positions).size===positions.length){
  const slots=Array(Math.max(...positions)-start+1).fill(null);for(const [position,value] of entries)slots[Number(position)-start]=value;return slots;
 }
 // Non-slot numeric keys (for example instance IDs) still retain every entry.
 return entries.sort((a,b)=>Number(a[0])-Number(b[0])).map(([,value])=>value);
}
function deckSlots(value){
 if(Array.isArray(value)){
  if(value.length&&value.every(Array.isArray))return null;
  const positioned=value.length&&value.every(v=>v&&typeof v==='object'&&Number.isInteger(Number(v.pos_id))&&v.pos_id!=null);
  return positioned?positionedSlots(value.map(v=>[v.pos_id,v])):value;
 }
 if(value&&typeof value==='object'){
  const entries=Object.entries(value);
  if(entries.every(([key])=>/^\d+$/.test(key)))return entries.length?positionedSlots(entries):[];
 }
 return null;
}
// Flat per-monster records must be grouped by deck before walking their fields.
// The same deck_id in two dungeons is not the same formation.
function groupedDeckRows(node){
 const entries=Array.isArray(node)?node:Object.values(node);
 if(!entries.length||!entries.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.hasOwn(v,'deck_id')&&Object.hasOwn(v,'unit_id')&&!Array.isArray(v.unit_id)&&SLOT_FIELDS.every(k=>!Object.hasOwn(v,k))))return null;
 const groups=new Map();
 for(const row of entries){const key=JSON.stringify([row.deck_id,row.dungeon_id,row.content_id,row.deck_type,row.game_mode,row.mode]);if(!groups.has(key))groups.set(key,{...row,unit_id_list:[]});groups.get(key).unit_id_list.push(row);}
 return [...groups.values()];
}
export function extractAccountPresets(deckList,units,forcedArea=null,diagnostics=null){
 const known=new Map(units.map(u=>[Number(u.id),u.id])),out=[],seen=new Set(),idsSeen=new Map();
 const pending=[{node:deckList,path:'',inherited:{}}];let raidCount=0;
 while(pending.length){
  const {node,path,inherited}=pending.pop();
  if(!node||typeof node!=='object'||seen.has(node))continue;seen.add(node);
  const context={...inherited,...Object.fromEntries(['dungeon_id','content_id','dungeon_name','content_name','difficulty','area','mode','game_mode','deck_type','raid_party_id','raid_team_index','party_id','name','deck_name','leader_unit_id','leader_index'].filter(key=>Object.hasOwn(node,key)).map(key=>[key,node[key]]))};
  const isRaid=/r5|raid|party/.test(path)||classifyDeck({...context,...node},path).dungeon==='r5';
  const grouped=groupedDeckRows(node);
  if(grouped){for(let i=grouped.length-1;i>=0;i--)pending.push({node:grouped[i],path:`${path}/group/${i}`,inherited:context});continue;}
  if(Array.isArray(node)&&node.length&&node.every(isReference)){pending.push({node:{...context,unit_id_list:node},path,inherited:context});continue;}
  const slotEntries=Array.isArray(node)?[]:Object.entries(node);
  if(slotEntries.length&&slotEntries.every(([key,v])=>/^\d+$/.test(key)&&isReference(v))){pending.push({node:{...context,unit_id_list:node},path,inherited:context});continue;}
  const fields=SLOT_FIELDS.filter(key=>Object.hasOwn(node,key));
  // Accept collection-valued unit_id without treating a scalar ID as a deck.
  if(node.unit_id&&typeof node.unit_id==='object')fields.push('unit_id');
  const candidates=fields.map(key=>({key,value:node[key],slots:deckSlots(node[key])}));
  const candidate=candidates.find(c=>c.slots?.length)||candidates.find(c=>c.slots);
  const rawIds=candidate?.value??candidates.find(c=>Array.isArray(c.value)&&c.value.length&&c.value.every(Array.isArray))?.value;
  if(isRaid&&Array.isArray(rawIds)&&rawIds.length&&rawIds.every(Array.isArray)){for(let i=rawIds.length-1;i>=0;i--)pending.push({node:{...context,...node,monster_ids:undefined,unit_ids:undefined,unit_list:undefined,unit_id_list:rawIds[i],raid_party_id:context.raid_party_id??node.deck_id??path,raid_team_index:i},path:`${path}/team/${i}`,inherited:context});continue;}
  if(candidate){
   const rawIds=candidate.slots;
   if(isRaid&&rawIds.length&&(rawIds.length>6||rawIds.every(Array.isArray))){const rows=rawIds.every(Array.isArray)?rawIds:Array.from({length:Math.ceil(rawIds.length/6)},(_,i)=>rawIds.slice(i*6,i*6+6));for(let i=rows.length-1;i>=0;i--)pending.push({node:{...node,monster_ids:undefined,unit_ids:undefined,unit_list:undefined,unit_id_list:rows[i],raid_party_id:context.raid_party_id??node.deck_id??path,raid_team_index:i},path:`${path}/team/${i}`,inherited:context});continue;}
   const ids=rawIds.map(v=>{const id=typeof v==='object'?v?.unit_id??v?.id:v;return ['number','string'].includes(typeof id)?Number(id):NaN;});
   let inferred=classifyDeck({...context,...node},path,ids.length);
   if(!inferred.gameMode&&/\/native_defense(?:\/|$)/.test(path)&&[3,4].includes(ids.length))inferred={gameMode:ids.length===3?'siege':'arena',dungeon:null};
   let area=forcedArea==='pve'?(['cairos','dimensional','rift','toa'].includes(inferred.gameMode)?inferred:{gameMode:'cairos',dungeon:null}):['siege','arena','rta'].includes(forcedArea)?{gameMode:forcedArea,dungeon:null}:inferred;
   if(forcedArea==='pve-default')area=inferred.gameMode?inferred:{gameMode:'cairos',dungeon:null};
   if(['pve','pve-default'].includes(forcedArea)&&area.gameMode==='cairos'&&!area.dungeon)area={...area,dungeon:'pve-other'};
   const base=`deck-${String(node.deck_id??node.id??path)}-${path.replace(/\/\d+(?=\/|$)/g,'')}`,occurrence=idsSeen.get(base)||0;idsSeen.set(base,occurrence+1);
   const leaderId=Number(node.leader_unit_id??context.leader_unit_id??0),leaderIndex=leaderId>0?Math.max(0,ids.indexOf(leaderId)):Math.max(0,Math.min(Math.max(0,ids.length-1),Math.floor(Number(node.leader_index??context.leader_index)||0)));
   const unitIds=ids.map(id=>Number.isSafeInteger(id)&&id>0?known.get(id)??null:null),slots=({siege:3,arena:4,cairos:5,dimensional:4,rift:6,toa:5,rta:4})[area.gameMode]||unitIds.length;while(unitIds.length<slots)unitIds.push(null);
   out.push({mode:node.mode==='attack'?'attack':/defen|defesa/.test(fold([path,node.mode,node.name,node.deck_name].join(' ')))?'defense':'attack',leaderIndex,id:`${base}-${occurrence}`,name:String(node.name??node.deck_name??context.name??context.deck_name??`Deck ${out.length+1}`),...area,...(area.gameMode==='rift'&&area.dungeon==='r5'?{raidPartyId:String(context.raid_party_id??context.party_id??`party-${Math.floor(raidCount/3)}`),raidTeamIndex:Number(context.raid_team_index??raidCount%3)}:{}),unitIds,missingIds:ids.filter(id=>Number.isSafeInteger(id)&&id>0&&!known.has(id))});if(area.dungeon==='r5')raidCount++;continue;
  }
  if(fields.length&&diagnostics)diagnostics.unrecognized=(diagnostics.unrecognized||0)+1;
  const entries=Object.entries(node);for(let i=entries.length-1;i>=0;i--){const [key,value]=entries[i];if(value&&typeof value==='object')pending.push({node:value,path:`${path}/${key}`,inherited:context});}
 }
 return out;
}
