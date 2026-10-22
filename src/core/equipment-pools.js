// RTA shares rune items but keeps a separate equipment assignment. Never overwrite
// unit.runeIds (normal PvP/PvE) with the World Arena loadout.
export function equipmentPools(raw,units,runes){
 const knownUnits=new Set(units.map(u=>u.id)),knownRunes=new Map(runes.map(r=>[r.id,r])),rta={},used=new Set();
 for(const row of Array.isArray(raw.world_arena_rune_equip_list)?raw.world_arena_rune_equip_list:[]){const unitId=Number(row.unit_id);if(!knownUnits.has(unitId)||Object.hasOwn(rta,unitId)||!Array.isArray(row.rune_id_list))continue;const ids=[...new Set(row.rune_id_list.map(Number).filter(id=>knownRunes.has(id)))];if(ids.length>6||ids.some(id=>used.has(id))||new Set(ids.map(id=>knownRunes.get(id).slot)).size!==ids.length)continue;rta[unitId]=ids;ids.forEach(id=>used.add(id));}
 return {main:{assignments:Object.fromEntries(units.map(u=>[u.id,[...u.runeIds]]))},rta:{assignments:rta}};
}
export function assertMainPool(teams,options={}){if(options.pool&&options.pool!=='main'||teams.some(t=>t.gameMode==='rta'||t.pool&&t.pool!=='main'))throw new Error('Pool RTA isolada: este builder usa somente o equipamento principal PvP/PvE.');}
