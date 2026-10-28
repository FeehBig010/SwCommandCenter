// SWEX codebooks: Xzandro/sw-exporter app/mapping.js; QuatZo/swstats
// website/models.py (Deck, DimensionHoleRun); B4tiste/bot-swbox Dungeon::id.
// Saved deck sequences and recent dungeon IDs belong to different namespaces.
export const DIMENSIONS=[['karzhan','Karzhan','dark',2],['ellunia','Ellunia','wind',1],['lumel','Lumel','fire',3],['khalderun','Khalderun','dark',4],['sacreon','Sacréon','light',5],['inferath','Inferath','fire',6]];
export const PVE_STAGES={
 cairos:[['gbah','Gigante Abissal','water'],['dbah','Dragão Abissal','fire'],['nbah','Necrópolis Abissal','dark'],['sf10','Fortaleza de Aço 10','wind'],['pc10','Cripta do Justiceiro 10','light'],['gb10','Gigante B10','water'],['db10','Dragão B10','fire'],['nb10','Necrópolis B10','dark']],
 dimensional:DIMENSIONS.flatMap(([id,name,element,code])=>[[`${id}-runes`,`${name} · Runas`,element],[`${id}-2a`,`${name} · Despertar Secundário (2A)`,element],...(code<6?[[`${id}-predator`,`${name} · Predador`,element]]:[])]),
 rift:[['r5','Rift Raid R5','dark'],['ice-beast','Fera de Gelo','water'],['fire-beast','Fera de Fogo','fire'],['wind-beast','Fera de Vento','wind'],['light-beast','Fera de Luz','light'],['dark-beast','Fera de Trevas','dark']],
 toa:[['toan','ToA Normal','dark'],['toah','ToA Hard','dark'],['toahell','ToA Hell','dark'],['toa-saved','ToA · Times salvos','dark']],
};
const aliases={gb12:'gbah',db12:'dbah',nb12:'nbah',...Object.fromEntries(DIMENSIONS.map(([id])=>[id,`${id}-runes`]))};
export function canonicalPveStage(stage){return aliases[stage]||stage;}
export function isPveStage(area,stage){return !!PVE_STAGES[area]?.some(s=>s[0]===canonicalPveStage(stage));}
export function pveSlots(area,stage){return area==='dimensional'&&canonicalPveStage(stage)?.endsWith('-predator')?5:({cairos:5,dimensional:4,rift:6,toa:5})[area];}
export function pveStageIcon(stage){stage=canonicalPveStage(stage);const dimension=DIMENSIONS.find(([id])=>stage?.startsWith(`${id}-`));return dimension?(stage.endsWith('-predator')?'dimension-predator':dimension[0]):({gb10:'gbah',db10:'dbah',nb10:'nbah','toa-saved':'toan'})[stage]||stage;}
