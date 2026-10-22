export const AREA_SLOTS={siege:3,arena:4,cairos:5};
export function presetsForArea(presets,area,dungeon){
 if(!AREA_SLOTS[area]||area==='cairos'&&!dungeon)return [];
 return (presets||[]).filter(p=>p.gameMode===area&&Array.isArray(p.unitIds)&&p.unitIds.length<=AREA_SLOTS[area]&&(area!=='cairos'||p.dungeon===dungeon));
}
export function teamsForArea(teams,area,dungeon){return (teams||[]).filter(t=>(t.gameMode||'siege')===area&&t.configs?.length===AREA_SLOTS[area]&&(area!=='cairos'||(t.sourceDungeon||t.dungeon)===dungeon));}
export function assertPresetArea(preset,area,dungeon){if(!presetsForArea([preset],area,dungeon).length)throw new Error('Este deck pertence a outra área ou masmorra.');}
