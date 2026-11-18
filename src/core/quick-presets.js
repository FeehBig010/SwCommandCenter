import {quickTeam,quickConfig} from './quick-calculator.js';
import {hydrateAccountPresets} from './account-teams.js';
import {FOUR,GAME_MODES} from './data.js';
import {catalogLeader} from './leader-catalog.js';
import {PVE_STAGES,pveSlots,canonicalPveStage} from './pve-stages.js';
import {arenaContextOf,ARENA_CONTEXTS} from './arena-context.js';
import {artifactEffects} from './artifacts.js';
import {accountStamp} from './loadouts.js';
import {skillLevels} from './skill-levels.js';

export const QUICK_AREA_LABELS={siege:'Siege / GvG',arena:'Arena',rta:'RTA',cairos:'Cairos',dimensional:'Dimensional',rift:'Rift / R5',toa:'ToA',solo:'Solo'};
export function quickPresetArea(preset){
 const area=preset.gameMode;
 if(area==='arena')return ARENA_CONTEXTS[arenaContextOf(preset)]||'Arena · contexto não identificado';
 const stage=PVE_STAGES[area]?.find(s=>s[0]===canonicalPveStage(preset.dungeon));
 return stage?.[1]||QUICK_AREA_LABELS[area]||'Outra área';
}
const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function quickPresetChoices(presets=[],query='',area='all'){
 const tokens=fold(query).trim().split(/\s+/).filter(Boolean);
 return presets.filter(p=>p&&Array.isArray(p.unitIds)&&(area==='all'||p.gameMode===area)&&tokens.every(token=>fold([p.name,quickPresetArea(p),p.gameMode,...(p.members||[]).map(m=>m?.name||'')].join(' ')).includes(token)));
}

// Work on a fresh copy of the native formation. No local preset, unit, rune or
// previously saved calculator draft is changed when loading or experimenting.
export function quickTeamFromPreset(preset,account){
 if(!account||!Array.isArray(account.units))throw new Error('Importe seu JSON SWEX para carregar presets.');
 if(!preset||!Array.isArray(preset.unitIds)||!GAME_MODES[preset.gameMode]||preset.unitIds.length>8)throw new Error('Este preset não possui uma formação válida.');
 const safe={...account,units:account.units.map(u=>({...u,runeIds:u.runeIds||[],artifactIds:u.artifactIds||[]})),runes:account.runes||[],artifacts:account.artifacts||[]};
 const hydrated=hydrateAccountPresets({...safe,accountPresets:[preset]})[0];
 const slots=Math.max(pveSlots(preset.gameMode,preset.dungeon)||GAME_MODES[preset.gameMode].slots,preset.unitIds.length);
 const configs=Array.from({length:slots},(_,index)=>{
  const member=hydrated.members[index];
  if(!member)return {...quickConfig(),enabled:false,missingUnitId:preset.unitIds[index]||null};
  const counts={};for(const r of member.runes)counts[r.set]=(counts[r.set]||0)+1;
  const sets=Object.entries(counts).flatMap(([id,n])=>Array(Math.floor(n/(FOUR.has(Number(id))?4:2))).fill(Number(id))).filter(id=>id!==25&&id!==99);
  const levels=skillLevels(member.skillLevels);
  return {...quickConfig(member.master,member.name),unitId:member.id,enabled:true,autoSpeed:false,sourceRuneCount:member.runes.length,sets,strictSets:false,skillLevels:levels,skillLevelSource:levels.length?'swex':'unknown',
   manual:{base:{...member.base},sheet:{...member.sheetStats}},basis:'total',goals:{...member.sheetStats},
   snapshotArtifactEffects:structuredClone(artifactEffects(safe,member)),
   mains:Object.fromEntries([2,4,6].map(slot=>[slot,member.runes.find(r=>r.slot===slot)?.main?.[0]||0]))};
 });
 const leaderIndex=Math.max(0,Math.min(slots-1,Number(preset.leaderIndex)||0)),leader=catalogLeader(configs[leaderIndex]?.masterId);
 const team={...quickTeam(preset.gameMode,preset.dungeon),configs,name:preset.name||quickPresetArea(preset),autoName:false,speedMode:'snapshot',
  mode:preset.mode||'defense',arenaContext:preset.gameMode==='arena'?arenaContextOf(preset):undefined,
  leader,leaderIndex,leaderKey:leader?configs[leaderIndex]?.key:null,leaderSpd:0,towerSpd:Number(account.towers?.glorySpd)||0,guildSpd:Number(account.towers?.guildSpd)||0,
  sourceDeckId:preset.id,sourceDeckName:preset.name||quickPresetArea(preset),sourceAccountId:account.id,sourceImportedAt:account.importedAt,
  sourceDungeon:preset.dungeon||null,dungeon:preset.dungeon||null,destination:preset.dungeon||undefined};
 team.plannedRunes={accountStamp:accountStamp(account),byConfig:Object.fromEntries(configs.flatMap((c,index)=>c.unitId?[[c.key,hydrated.members[index].runes.map(r=>r.id)]]:[]))};
 return team;
}
