import {lookupPveDeck} from './pve-lookup.js';
import {pveSlots} from './pve-stages.js';
import {arenaContextOf,ARENA_CONTEXT_FIELDS} from './arena-context.js';
// SWEX deck layouts vary by exporter/game version. Unrecognized numeric types stay unclassified.
export const DECK_SOURCE_KEYS=['deck_list','deck_recent_list','defense_deck_list','world_arena_deck_list','party_deck','raid_deck','raid_deck_list','dungeon_deck','defense_deck_info','server_arena_defense_deck_info','interserver_defense_deck_info','interserver_deck_list','inter_server_defense_deck_list','guildsiege_defense_deck_unit_list','siege_deck','arena_deck','world_arena_deck','defense_unit_list'];
const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function classifyDeck(node={},path='',slots=0){
 const context=fold([path,node.area,node.mode,node.game_mode,node.content_name,node.deck_type].join(' '));
 if(/(?:^|[^a-z])rta(?:$|[^a-z])|world.?arena|arena.?world/.test(context))return {gameMode:'rta',dungeon:null};
 if(arenaContextOf(node,path)==='interserver'||/arena/.test(context))return {gameMode:'arena',dungeon:null};
 if(/siege|gvg|guild|cerco/.test(context))return {gameMode:'siege',dungeon:null};
 const pve=lookupPveDeck(node,path);if(pve)return pve;
 const saved=node.sourceKey==='deck_list',recent=node.sourceKey==='deck_recent_list',type=Number(saved?node.deck_type:node.type);
 if(saved&&type===1||recent&&type===2)return {gameMode:'arena',dungeon:null};
 if(saved&&[2,22].includes(type)||recent&&[6,7].includes(type))return {gameMode:'siege',dungeon:null};
 return {gameMode:null,dungeon:null};
}
const SLOT_FIELDS=['monster_ids','unit_id_list','unit_ids','unit_list'];
function isReference(value){
 if(value==null||['number','string'].includes(typeof value))return true;
 if(typeof value!=='object'||Array.isArray(value)||SLOT_FIELDS.some(k=>Object.hasOwn(value,k)))return false;
 // Empty SWEX slots can be {}, {pos_id: n} or {unit_id: null}. They must not
 // prevent recognition of an otherwise valid list of monster references.
 if(Object.keys(value).every(key=>key==='pos_id'))return true;
 if(Object.hasOwn(value,'unit_id'))return value.unit_id==null||['number','string'].includes(typeof value.unit_id);
 return Object.hasOwn(value,'id')&&!Object.hasOwn(value,'deck_id');
}
function referenceId(value){
 // unit_id is authoritative: a slot's own `id` is not a monster instance ID.
 const id=value&&typeof value==='object'?(Object.hasOwn(value,'unit_id')?value.unit_id:value.id):value;
 return ['number','string'].includes(typeof id)?Number(id):NaN;
}
// Some exports encode a list as an object keyed by slot. Preserve holes, rather
// than compacting with filter(Boolean), so the leader and formation do not move.
function positionedSlots(entries){
 const positions=entries.map(([position])=>Number(position)),start=positions.includes(0)?0:1;
 if(positions.every(p=>Number.isInteger(p)&&p>=start&&p<start+8)&&new Set(positions).size===positions.length){
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
 for(const row of entries){const key=JSON.stringify([row.deck_id,row.dungeon_id,row.content_id,row.deck_type,row.deck_seq,row.type,row.sub_type,row.game_mode,row.mode,row.difficulty,row.floor,row.stage,arenaContextOf(row)]);if(!groups.has(key))groups.set(key,{...row,unit_id_list:[]});groups.get(key).unit_id_list.push(row);}
 return [...groups.values()];
}
export function extractAccountPresets(deckList,units,forcedArea=null,diagnostics=null){
 const iterator=extractAccountPresetsSteps(deckList,units,forcedArea,diagnostics);let step=iterator.next();while(!step.done)step=iterator.next();return step.value;
}
export function* extractAccountPresetsSteps(deckList,units,forcedArea=null,diagnostics=null){
 const known=new Map(units.map(u=>[Number(u.id),u.id])),out=[],seen=new Set(),idsSeen=new Map();
 const pending=[{node:deckList,path:'',inherited:{}}];let raidCount=0,visited=0;
 while(pending.length){
  if(++visited%128===0)yield {visited};
  const {node,path,inherited}=pending.pop();
  if(!node||typeof node!=='object'||seen.has(node))continue;seen.add(node);
  const context={...inherited,...Object.fromEntries([...ARENA_CONTEXT_FIELDS,'dungeon_id','content_id','dungeon_name','content_name','difficulty','floor','floor_no','stage','stage_id','sourceMeta','area','mode','game_mode','deck_type','deck_seq','type','sub_type','sourceKey','sourcePath','raid_party_id','raid_team_index','party_id','name','deck_name','leader_unit_id','leader_index'].filter(key=>Object.hasOwn(node,key)).map(key=>[key,node[key]]))};
  const identified=classifyDeck({...context,...node},path),isRaid=identified.dungeon==='r5'||!identified.dungeon&&/r5|raid|party/.test(path);
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
   let rawIds=candidate.slots;
   // SWEX allocates eight formation positions for a six-monster Raid team.
   // Preserve that source layout separately while removing only empty padding
   // for the six native cards. Never split one such team into two presets.
   const sourceUnitIds=Array.isArray(node.source_unit_ids)?node.source_unit_ids.map(referenceId).map(id=>known.get(id)??null):isRaid&&rawIds.length===8&&rawIds.filter(v=>referenceId(v)>0).length<=6?rawIds.map(referenceId).map(id=>known.get(id)??null):null;
   if(sourceUnitIds&&rawIds.length>6){rawIds=rawIds.slice();while(rawIds.length>6){const empty=rawIds.findLastIndex(v=>!(referenceId(v)>0));rawIds.splice(empty,1);}}

   if(isRaid&&rawIds.length&&(rawIds.length>6||rawIds.every(Array.isArray))){const rows=rawIds.every(Array.isArray)?rawIds:Array.from({length:Math.ceil(rawIds.length/6)},(_,i)=>rawIds.slice(i*6,i*6+6));for(let i=rows.length-1;i>=0;i--)pending.push({node:{...node,monster_ids:undefined,unit_ids:undefined,unit_list:undefined,unit_id_list:rows[i],raid_party_id:context.raid_party_id??node.deck_id??path,raid_team_index:i},path:`${path}/team/${i}`,inherited:context});continue;}
   const ids=rawIds.map(referenceId);
   let inferred=classifyDeck({...context,...node},path,ids.length);
   if(!inferred.gameMode&&/\/native_defense(?:\/|$)/.test(path)&&[3,4].includes(ids.length))inferred={gameMode:ids.length===3?'siege':'arena',dungeon:null};
   let area=forcedArea==='pve'?(['cairos','dimensional','rift','toa'].includes(inferred.gameMode)?inferred:{gameMode:'cairos',dungeon:null}):['siege','arena','rta'].includes(forcedArea)?{gameMode:forcedArea,dungeon:null}:inferred;
   if(forcedArea==='pve-default')area=inferred.gameMode?inferred:{gameMode:'cairos',dungeon:null};
   if(!area.dungeon&&!['siege','arena','rta'].includes(area.gameMode)&&diagnostics)diagnostics.unrecognized=(diagnostics.unrecognized||0)+1;
   if(area.gameMode==='arena')area={...area,arenaContext:arenaContextOf({...context,...node},path)};
   const base=`deck-${String(node.deck_id??node.id??path)}-${path.replace(/\/\d+(?=\/|$)/g,'')}`,occurrence=idsSeen.get(base)||0;idsSeen.set(base,occurrence+1);
   const leaderId=Number(node.leader_unit_id??context.leader_unit_id??0),leaderIndex=leaderId>0?Math.max(0,ids.indexOf(leaderId)):Math.max(0,Math.min(Math.max(0,ids.length-1),Math.floor(Number(node.leader_index??context.leader_index)||0)));
   const unitIds=ids.map(id=>Number.isSafeInteger(id)&&id>0?known.get(id)??null:null),slots=pveSlots(area.gameMode,area.dungeon)||({siege:3,arena:4,rta:4})[area.gameMode]||unitIds.length;while(unitIds.length<slots)unitIds.push(null);
   const equipment=Array.isArray(node.equip)?node.equip.filter(e=>e&&known.has(Number(e.unit_id))).map(e=>({unitId:Number(e.unit_id),runeIds:(Array.isArray(e.rune_id_list)?e.rune_id_list:[]).map(Number).filter(id=>Number.isSafeInteger(id)&&id>0),artifactIds:(Array.isArray(e.artifact_id_list)?e.artifact_id_list:[]).map(Number).filter(id=>Number.isSafeInteger(id)&&id>0)})):[];
   const sourceMeta=Object.fromEntries(['deck_type','deck_seq','type','sub_type','dungeon_id','content_id','difficulty','floor','floor_no','stage','stage_id'].filter(k=>context[k]!=null||context.sourceMeta?.[k]!=null).map(k=>[k,Number(context[k]??context.sourceMeta?.[k])]).filter(([,v])=>Number.isSafeInteger(v)&&v>=0));
   out.push({...(Object.keys(sourceMeta).length?{sourceMeta}:{}),...(sourceUnitIds?{sourceUnitIds}:{}),...(equipment.length?{equipment}:{}),...(DECK_SOURCE_KEYS.includes(context.sourceKey)?{sourceKey:context.sourceKey}:{}),mode:node.mode==='attack'?'attack':/defen|defesa/.test(fold([path,node.mode,node.name,node.deck_name].join(' ')))?'defense':'attack',leaderIndex,id:`${base}-${occurrence}`,name:String(node.name??node.deck_name??context.name??context.deck_name??`Deck ${out.length+1}`),...area,...(area.gameMode==='rift'&&area.dungeon==='r5'?{raidPartyId:String(context.raid_party_id??context.party_id??`${context.sourcePath||context.sourceKey||'native'}:party-${Math.floor(raidCount/3)}`),raidTeamIndex:Number(context.raid_team_index??raidCount%3)}:{}),unitIds,missingIds:ids.filter(id=>Number.isSafeInteger(id)&&id>0&&!known.has(id))});if(area.dungeon==='r5')raidCount++;continue;
  }
  if(fields.length&&diagnostics)diagnostics.unrecognized=(diagnostics.unrecognized||0)+1;
  const entries=Object.entries(node);for(let i=entries.length-1;i>=0;i--){const [key,value]=entries[i];if(value&&typeof value==='object'&&!/equip|rune|artifact/.test(key))pending.push({node:value,path:`${path}/${key}`,inherited:context});}
 }
 return out;
}
