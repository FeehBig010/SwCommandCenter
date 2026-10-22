// Preserve tower levels and explicit bonuses; unknown numeric IDs are not guessed.
export function extractTowers(raw={}){
 const pct=v=>Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=100?Number(v):0;
 const records=[];
 for(const [key,scope] of [['deco_list','glory'],['building_list','glory'],['guild_deco_list','guild'],['guild_building_list','guild']])for(const row of Array.isArray(raw[key])?raw[key]:[]){const id=Number(row.deco_id??row.building_master_id??row.master_id??row.building_id),level=Number(row.level??row.deco_level??0);if(Number.isSafeInteger(id)&&id>0&&Number.isInteger(level)&&level>=0&&level<=100)records.push({id,level,scope});}
 const explicit=raw.towers||{};const hasGlory=Object.hasOwn(explicit,'glorySpd'),hasGuild=Object.hasOwn(explicit,'guildSpd');
 return {glorySpd:pct(explicit.glorySpd),guildSpd:pct(explicit.guildSpd),records,needsReview:records.length>0&&(!hasGlory||!hasGuild)};
}
export function cleanTowers(input={}){return {...extractTowers({towers:input}),records:(input.records||[]).filter(r=>Number.isSafeInteger(r.id)&&r.id>0&&Number.isInteger(r.level)&&r.level>=0&&r.level<=100&&['glory','guild'].includes(r.scope)).map(r=>({id:r.id,level:r.level,scope:r.scope})),needsReview:input.needsReview===true};}
