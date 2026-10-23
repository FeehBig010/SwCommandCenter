import {calculateStats,artifactBonus} from './optimizer.js';
import {assertPresetArea} from './deckManager.js';
import {blankConfig,makeTeam,FOUR,GAME_MODES} from './data.js';
import {catalogLeader} from './leader-catalog.js';
import {automaticTeamName} from './team-ux.js';
export function teamFromGameDeck(preset,account,previous){
 const mode=preset.gameMode||previous?.gameMode||'siege';assertPresetArea(preset,mode,preset.dungeon);if(previous&&(previous.gameMode||'siege')!==mode)throw new Error('Não é possível carregar um deck de outra área.');const slots=GAME_MODES[mode]?.slots||3;
 const oldByUnit=new Map((previous?.configs||[]).map(c=>[c.unitId,c]));
 const configs=Array.from({length:slots},(_,i)=>{
  const unit=account.units.find(u=>u.id===preset.unitIds[i]),old=unit&&oldByUnit.get(unit.id);
  if(old)return {...old,masterId:unit.master,label:unit.name};
  const c=blankConfig(unit);const counts={};
  for(const id of unit?.runeIds||[]){const r=account.runes.find(r=>r.id===id);if(r)counts[r.set]=(counts[r.set]||0)+1;}
  const sets=Object.entries(counts).flatMap(([id,n])=>Array(Math.floor(n/(FOUR.has(Number(id))?4:2))).fill(Number(id))).filter(id=>id!==25&&id!==99);
  return {...c,sets,strictSets:false,basis:'total',lockSpeedSync:mode==='cairos',mains:Object.fromEntries([2,4,6].map(s=>[s,account.runes.find(r=>unit?.runeIds.includes(r.id)&&r.slot===s)?.main[0]||0]))};
 });
 const leaderIndex=Math.max(0,Math.min(slots-1,Number(preset.leaderIndex)||0)),leader=catalogLeader(configs[leaderIndex]?.masterId);
 const next={...makeTeam(mode),...previous,gameMode:mode,mode:preset.mode||previous?.mode||'defense',configs,inactiveConfigs:[],leader,leaderIndex,leaderKey:leader?configs[leaderIndex]?.key:null,leaderSpd:0,towerSpd:previous?.towerSpd??account.towers?.glorySpd??0,guildSpd:previous?.guildSpd??account.towers?.guildSpd??0,sourceDeckId:preset.id,sourceAccountId:account.id,sourceDungeon:preset.dungeon||null,dungeon:preset.dungeon||previous?.dungeon||null,sourceDeckName:preset.name,sourceImportedAt:account.importedAt};
 delete next.plannedRunes;
 return {...next,autoName:previous?.autoName!==false,name:previous?.autoName===false?previous.name:automaticTeamName(configs)};
}
function refreshManualTeam(account,team){return {...team,plannedRunes:null,configs:team.configs.map(c=>{const unit=account.units.find(u=>u.id===c.unitId);return unit?{...c,masterId:unit.master,label:unit.name}:{...c,unitId:null};})};}
export function syncAccountTeams(account,previous=[],sameAccount=false){
 const decks=(account.accountPresets||[]).filter(p=>['siege','arena'].includes(p.gameMode));
 const kept=sameAccount?previous.filter(t=>!t.sourceDeckId).map(t=>refreshManualTeam(account,t)):[];
 const imported=decks.map(p=>teamFromGameDeck(p,account,sameAccount?previous.find(t=>t.sourceDeckId===p.id):null));
 return [...kept,...imported];
}
export const pvePlanKey=(stage,id)=>`${stage}::${id}`;
export function selectPvePreset(all,stage,preset,account,current){
 const key=pvePlanKey(stage,preset.id),saved=all[key];
 const next={...all};
 if(current?.sourceDeckId&&current.sourceDeckId!==preset.id)next[pvePlanKey(stage,current.sourceDeckId)]=current;
 next[stage]=saved||teamFromGameDeck(preset,account);
 delete next[key];return next;
}
export function syncCairosPlans(account,previous={},sameAccount=false){
 const oldByDeck=new Map(Object.values(previous).filter(t=>t.sourceDeckId).map(t=>[t.sourceDeckId,t]));
 const presetById=new Map((account.accountPresets||[]).map(p=>[p.id,p]));
 const next=sameAccount?Object.fromEntries(Object.entries(previous).map(([key,t])=>[key,{...refreshManualTeam(account,t),sourceDeckId:null,sourceDeckName:null}])):{},selected=new Set();
 for(const p of account.accountPresets||[])if(['cairos','dimensional','rift','toa'].includes(p.gameMode)&&p.dungeon){
  const stage=p.dungeon,first=!selected.has(stage);selected.add(stage);
  const old= sameAccount?oldByDeck.get(p.id):null;
  const team=teamFromGameDeck(p,account,old);
  if(first){const chosen=sameAccount?previous[stage]?.sourceDeckId:null;const candidate=presetById.get(chosen),preset=candidate?.dungeon===stage&&candidate?.gameMode===p.gameMode?candidate:null;next[stage]=preset?teamFromGameDeck(preset,account,previous[stage]):team;}
  if(next[stage].sourceDeckId!==p.id)next[pvePlanKey(stage,p.id)]=team;
 }
 return next;
}
// Manual calculator gets a snapshot of the equipped sheet, never base-only values.
export function quickPlansFromAccount(account){
 const plans={};
 for(const area of ['siege','arena','cairos']){
  const preset=(account.accountPresets||[]).find(p=>p.gameMode===area&&p.unitIds.length<=GAME_MODES[area].slots);
  if(!preset)continue;
  const team=teamFromGameDeck(preset,account);
  plans[area]={...team,sheetSpeedFormula:true,autoOpener:true,configs:team.configs.map(c=>{
   const unit=account.units.find(u=>u.id===c.unitId);if(!unit)return {...c,manual:{base:{hp:10000,atk:800,def:650,spd:100,cr:15,cd:50,res:15,acc:0},sheet:{hp:10000,atk:800,def:650,spd:100,cr:15,cd:50,res:15,acc:0}},autoSpeed:false};
   const runes=account.runes.filter(r=>unit.runeIds.includes(r.id));
   return {...c,autoSpeed:false,manual:{base:{...unit.base},sheet:calculateStats(unit,runes,artifactBonus(account,unit)).total}};
  })};
 }
 return plans;
}
