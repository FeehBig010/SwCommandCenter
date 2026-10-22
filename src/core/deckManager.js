export const AREA_SLOTS={siege:3,arena:4,cairos:5,dimensional:4,rift:6,toa:5};
export function presetsForArea(presets,area,dungeon){
 if(!AREA_SLOTS[area]||['cairos','dimensional','rift','toa'].includes(area)&&!dungeon)return [];
 return (presets||[]).filter(p=>p.gameMode===area&&Array.isArray(p.unitIds)&&p.unitIds.length<=AREA_SLOTS[area]&&(!['cairos','dimensional','rift','toa'].includes(area)||p.dungeon===dungeon));
}
export function teamsForArea(teams,area,dungeon){return (teams||[]).filter(t=>(t.gameMode||'siege')===area&&t.configs?.length===AREA_SLOTS[area]&&(!['cairos','dimensional','rift','toa'].includes(area)||(t.sourceDungeon||t.dungeon)===dungeon));}
export function assertPresetArea(preset,area,dungeon){if(!presetsForArea([preset],area,dungeon).length)throw new Error('Este deck pertence a outra área ou masmorra.');}
