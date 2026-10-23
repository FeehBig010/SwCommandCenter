export const PVE_AREAS={
 cairos:{label:'Cairos Dungeon',slots:5,stages:[['gbah','Gigante Abissal','water'],['dbah','Dragão Abissal','fire'],['nbah','Necrópolis Abissal','dark'],['sf10','Fortaleza de Aço 10','wind'],['pc10','Cripta do Justiceiro 10','light']]},
 dimensional:{label:'Buraco Dimensional',slots:4,stages:[['karzhan','Karzhan','dark'],['ellunia','Ellunia','wind'],['lumel','Lumel','fire'],['khalderun','Khalderun','dark']]},
 rift:{label:'Fenda dos Mundos',slots:6,stages:[['r5','Rift Raid R5','dark'],['ice-beast','Fera de Gelo','water'],['fire-beast','Fera de Fogo','fire'],['wind-beast','Fera de Vento','wind'],['light-beast','Fera de Luz','light'],['dark-beast','Fera de Trevas','dark']]},
 toa:{label:'Torre da Ascensão',slots:5,stages:[['toan','ToA Normal','dark'],['toah','ToA Hard','dark'],['toahell','ToA Hell','dark']]},
};
export const isPve=area=>Object.hasOwn(PVE_AREAS,area);
export function pveArt(area,stage){const scene=area==='cairos'?({gb12:'giant',db12:'dragon',nb12:'necro',gbah:'giant',dbah:'dragon',nbah:'necro',sf10:'steel',pc10:'punisher'})[stage]||'giant':isPve(area)?area:null;return scene?`/art/pve-${scene}.png`:null;}
export function cairosStagesForPresets(presets=[]){
 const legacy=[['pve-other','Outros presets PvE','light'],['gb12','Gigante B12','water'],['db12','Dragão B12','fire'],['nb12','Necrópolis B12','dark']];
 return [...PVE_AREAS.cairos.stages,...legacy.filter(([id])=>presets.some(p=>p.gameMode==='cairos'&&p.dungeon===id))];
}
