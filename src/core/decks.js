// SWEX deck layouts vary by exporter/game version. Unrecognized numeric types stay unclassified.
const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function classifyDeck(node={},path='',slots=0){
 const context=fold([path,node.area,node.mode,node.game_mode,node.content_name,node.deck_type].join(' '));
 if(/(?:^|[^a-z])rta(?:$|[^a-z])|world.?arena|arena.?world/.test(context))return {gameMode:'rta',dungeon:null};
 const pve=fold([path,node.dungeon_name,node.content_name].join(' '));
 if(pve.includes('pve-other'))return {gameMode:'cairos',dungeon:'pve-other'};
 const dimension=['karzhan','ellunia','lumel','khalderun'].find(v=>pve.includes(v));if(dimension)return {gameMode:'dimensional',dungeon:dimension};
 const rift=['ice-beast','fire-beast','wind-beast','light-beast','dark-beast','r5'].find(v=>pve.includes(v));if(rift)return {gameMode:'rift',dungeon:rift};
 if(/toa|tower.of.ascension/.test(pve))return {gameMode:'toa',dungeon:/hell/.test(pve)?'toahell':/hard|toah/.test(pve)?'toah':'toan'};
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
 if(/dungeon|cairos/.test(context))return {gameMode:'cairos',dungeon:null};
 return {gameMode:null,dungeon:null};
}
export function extractAccountPresets(deckList,units,forcedArea=null){
 const known=new Map(units.map(u=>[Number(u.id),u.id])),out=[],seen=new Set(),idsSeen=new Map();
 const pending=[{node:deckList,path:'',inherited:{}}];let raidCount=0;
 while(pending.length){
  const {node,path,inherited}=pending.pop();
  if(!node||typeof node!=='object'||seen.has(node))continue;seen.add(node);
  const context={...inherited,...Object.fromEntries(['dungeon_id','content_id','dungeon_name','content_name','area','mode','game_mode','deck_type','raid_party_id','raid_team_index','party_id'].filter(key=>Object.hasOwn(node,key)).map(key=>[key,node[key]]))};
  const isRaid=/r5|raid|party/.test(path)||classifyDeck({...context,...node},path).dungeon==='r5';
  if(Array.isArray(node)&&node.length&&node.every(v=>v==null||['number','string'].includes(typeof v)||typeof v==='object'&&Object.hasOwn(v,'unit_id'))){pending.push({node:{unit_id_list:node},path,inherited:context});continue;}
  const rawIds=node.monster_ids??node.unit_id_list??node.unit_ids??(Array.isArray(node.unit_list)?node.unit_list:undefined);
  if(Array.isArray(rawIds)){
   if(isRaid&&rawIds.length&&(rawIds.length>6||rawIds.every(Array.isArray))){const rows=rawIds.every(Array.isArray)?rawIds:Array.from({length:Math.ceil(rawIds.length/6)},(_,i)=>rawIds.slice(i*6,i*6+6));for(let i=rows.length-1;i>=0;i--)pending.push({node:{...node,monster_ids:undefined,unit_ids:undefined,unit_list:undefined,unit_id_list:rows[i],raid_party_id:context.raid_party_id??node.deck_id??path,raid_team_index:i},path:`${path}/team/${i}`,inherited:context});continue;}
   const ids=rawIds.map(v=>Number(typeof v==='object'?v?.unit_id??v?.id:v));
   let inferred=classifyDeck({...context,...node},path,ids.length);
   if(!inferred.gameMode&&/\/native_defense(?:\/|$)/.test(path)&&[3,4].includes(ids.length))inferred={gameMode:ids.length===3?'siege':'arena',dungeon:null};
   let area=forcedArea==='pve'?(['cairos','dimensional','rift','toa'].includes(inferred.gameMode)?inferred:{gameMode:'cairos',dungeon:null}):['siege','arena','rta'].includes(forcedArea)?{gameMode:forcedArea,dungeon:null}:inferred;
   if(forcedArea==='pve-default')area=inferred.gameMode?inferred:{gameMode:'cairos',dungeon:null};
   if(['pve','pve-default'].includes(forcedArea)&&area.gameMode==='cairos'&&!area.dungeon)area={...area,dungeon:'pve-other'};
   const base=`deck-${String(node.deck_id??node.id??path)}-${path.replace(/\/\d+(?=\/|$)/g,'')}`,occurrence=idsSeen.get(base)||0;idsSeen.set(base,occurrence+1);
   const leaderId=Number(node.leader_unit_id??0),leaderIndex=leaderId>0?Math.max(0,ids.indexOf(leaderId)):Math.max(0,Math.min(Math.max(0,ids.length-1),Math.floor(Number(node.leader_index)||0)));
   const unitIds=ids.map(id=>Number.isSafeInteger(id)&&id>0?known.get(id)??null:null),slots=({siege:3,arena:4,cairos:5,dimensional:4,rift:6,toa:5,rta:4})[area.gameMode]||unitIds.length;while(unitIds.length<slots)unitIds.push(null);
   out.push({mode:node.mode==='attack'?'attack':/defen|defesa/.test(fold([path,node.mode,node.name,node.deck_name].join(' ')))?'defense':'attack',leaderIndex,id:`${base}-${occurrence}`,name:String(node.name??node.deck_name??`Deck ${out.length+1}`),...area,...(area.gameMode==='rift'&&area.dungeon==='r5'?{raidPartyId:String(context.raid_party_id??context.party_id??`party-${Math.floor(raidCount/3)}`),raidTeamIndex:Number(context.raid_team_index??raidCount%3)}:{}),unitIds,missingIds:ids.filter(id=>Number.isSafeInteger(id)&&id>0&&!known.has(id))});if(area.dungeon==='r5')raidCount++;continue;
  }
  const entries=Object.entries(node);for(let i=entries.length-1;i>=0;i--){const [key,value]=entries[i];if(value&&typeof value==='object')pending.push({node:value,path:`${path}/${key}`,inherited:context});}
 }
 return out;
}
