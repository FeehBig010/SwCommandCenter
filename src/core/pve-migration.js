import {canonicalPveStage,isPveStage} from './pve-stages.js';
import {lookupPveDeck} from './pve-lookup.js';
export const PVE_SOURCE_FIELDS=['deck_type','deck_seq','type','sub_type','dungeon_id','content_id','difficulty','floor','floor_no','stage','stage_id'];
export function cleanPveSourceMeta(value){return Object.fromEntries(PVE_SOURCE_FIELDS.filter(k=>value?.[k]!=null&&Number.isSafeInteger(Number(value[k]))&&Number(value[k])>=0).map(k=>[k,Number(value[k])]));}
export function upgradePveAccount(account){
 if(!account)return account;
 return {...account,accountPresets:(account.accountPresets||[]).map(p=>{
  if(['arena','siege','rta'].includes(p.gameMode))return p;
  const identified=p.sourceMeta?lookupPveDeck({...cleanPveSourceMeta(p.sourceMeta),sourceKey:p.sourceKey},''):null;
  if(identified)return {...p,...identified};
  return {...p,dungeon:isPveStage(p.gameMode,p.dungeon)?canonicalPveStage(p.dungeon):null};
 })};
}
// Merge former B12/Abissal caches without losing the alternate or edited builds.
export function migratePvePlans(plans={},presets=[]){
 const bySource=new Map(presets.map(p=>[p.id,p])),out={};
 for(const [key,team] of Object.entries(plans)){
  if(!team?.configs)continue;
  const source=bySource.get(team.sourceDeckId),stage=source?.dungeon||canonicalPveStage(team.dungeon||key.split('::')[0]);
  if(!isPveStage(source?.gameMode||team.gameMode,stage)){out[key]=team;continue;} // Kept privately for recovery, never navigable as “Other”.
  const next={...team,dungeon:stage,sourceDungeon:stage,gameMode:source?.gameMode||team.gameMode},alternate=key.includes('::');
  const target=alternate?`${stage}::${team.sourceDeckId||team.id}`:stage;
  if(out[target]&&out[target].id!==next.id){let alternateKey=`${stage}::${next.sourceDeckId||next.id}`;if(out[alternateKey]&&out[alternateKey].id!==next.id)alternateKey+=`::${next.id}`;out[alternateKey]=next;}else out[target]=next;
 }
 return out;
}
