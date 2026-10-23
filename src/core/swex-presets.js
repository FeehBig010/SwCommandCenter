import {extractAccountPresetsSteps} from './decks.js';

// Discover named formation trees at any nesting level without retaining the raw
// export. Equipment/social trees cannot become a second set of phantom teams.
export function discoverDeckSources(raw){
 const sources=[],pending=[{node:raw,path:'',inherited:{}}],seen=new Set();
 while(pending.length){
  const {node,path,inherited}=pending.pop();if(!node||typeof node!=='object'||seen.has(node))continue;seen.add(node);
  const context={...inherited,...Object.fromEntries(['game_mode','area','mode','dungeon_id','dungeon_name','content_id','difficulty','deck_type','type','sub_type'].filter(key=>Object.hasOwn(node,key)).map(key=>[key,node[key]]))};
  if(path&&['game_mode','area','mode','dungeon_id','dungeon_name','content_id','deck_type','deck_id','leader_unit_id'].some(key=>Object.hasOwn(context,key)||Object.hasOwn(node,key))&&['unit_id_list','monster_ids','unit_ids'].some(key=>node[key]&&typeof node[key]==='object')){sources.push({key:path.split('/').at(-1),path,value:node,context});continue;}
  for(const [key,value] of Object.entries(node)){
   if(key==='unit_list'||!value||typeof value!=='object'||/equip|rune|artifact|craft|lock|chat|friend|mail|session|token/i.test(key))continue;
   const next=path?`${path}/${key}`:key;
   if(/(?:^|_)(?:deck|decks|preset|presets|party|formation|formations|teams)(?:_|$)/i.test(key)||key==='defense_unit_list'){
    sources.push({key,path:next,value,context});
   }else pending.push({node:value,path:next,inherited:context});
  }
 }
 return sources;
}
function sourceArea(path){
 if(/world.?arena|(?:^|[\/_])rta(?:[\/_]|$)/i.test(path))return 'rta';
 if(/siege|guild.?war|guild.?battle|server_guild|gvg|wgb/i.test(path))return 'siege';
 if(/arena|defense_unit_list|(?:^|\/)defense_deck_info$/i.test(path))return 'arena';
 return 'pve-default';
}
export function* collectAccountPresetsSteps(raw,units){
 const sources=discoverDeckSources(raw),presets=[],presetImport={sources:{}};
 // Keep absent canonical sources visible in diagnostics, even on fresh accounts.
 for(const key of ['deck_list','deck_recent_list','defense_deck_list','world_arena_deck_list'])presetImport.sources[key]={present:Object.hasOwn(raw,key),hasData:false,imported:0,unrecognized:0};
 for(let i=0;i<sources.length;i++){
  const source=sources[i],detail={present:true,hasData:hasSourceData(source.value),imported:0,unrecognized:0};
  let path=source.path,area=sourceArea(path);
  if(source.key==='deck_list')path=`pve/${path}`;
  if(source.key==='defense_deck_list'){path=`native_defense/${path}`;area=null;}
  if(['raid_deck','raid_deck_list','party_deck'].includes(source.key)||/(?:^|[_/])raid/.test(source.path))path=`r5/${path}`;
  const value=source.key==='guildsiege_defense_deck_unit_list'&&Array.isArray(source.value)?source.value.map(row=>row?{...row,equip:row.equip??raw.guildsiege_defense_deck_equip_list?.[row.deck_id]?.equip}:row):source.value;
  const iterator=extractAccountPresetsSteps({[path]:{...source.context,sourceKey:source.key,sourcePath:source.path,entries:value}},units,area,detail);
  let step=iterator.next();while(!step.done){yield {percent:55+Math.floor(i/Math.max(1,sources.length)*32),message:`Extraindo times: ${source.key}`};step=iterator.next();}
  const decks=step.value;detail.imported=decks.length;
  if(detail.hasData&&!decks.length)detail.unrecognized=Math.max(1,detail.unrecognized);
  presetImport.sources[source.path]=detail;
  for(const preset of decks){
   // Source path is part of the identity: equal rosters in two sources survive.
   presets.push({...preset,id:`source:${source.path}:${preset.id}`});
  }
  yield {percent:55+Math.floor((i+1)/Math.max(1,sources.length)*32),message:`Times extraídos: ${source.key}`};
 }
 return {presets,presetImport};
}

function hasSourceData(value){const pending=[value],seen=new Set();while(pending.length){const node=pending.pop();if(node==null)continue;if(typeof node!=='object')return true;if(seen.has(node))continue;seen.add(node);for(const value of Object.values(node))pending.push(value);}return false;}
