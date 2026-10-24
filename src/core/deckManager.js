import {canonicalPveStage,pveSlots} from './pve-stages.js';
import {isArenaContext} from './arena-context.js';
export const AREA_SLOTS={siege:3,arena:4,rta:4,cairos:5,dimensional:4,rift:6,toa:5};
export function presetsForArea(presets,area,dungeon,arenaContext='regular'){
 if(!AREA_SLOTS[area]||['cairos','dimensional','rift','toa'].includes(area)&&!dungeon)return [];
 return (presets||[]).filter(p=>p.gameMode===area&&(area!=='arena'||isArenaContext(p,arenaContext))&&Array.isArray(p.unitIds)&&(!['cairos','dimensional','rift','toa'].includes(area)||canonicalPveStage(p.dungeon)===canonicalPveStage(dungeon)));
}
export function teamsForArea(teams,area,dungeon,arenaContext='regular'){return (teams||[]).filter(t=>(t.gameMode||'siege')===area&&(area!=='arena'||isArenaContext(t,arenaContext))&&t.configs?.length===(pveSlots(area,dungeon)||AREA_SLOTS[area])&&(!['cairos','dimensional','rift','toa'].includes(area)||canonicalPveStage(t.sourceDungeon||t.dungeon)===canonicalPveStage(dungeon)));}
export function assertPresetArea(preset,area,dungeon,arenaContext='regular'){if(!presetsForArea([preset],area,dungeon,arenaContext).length)throw new Error('Este deck pertence a outra área ou masmorra.');}
