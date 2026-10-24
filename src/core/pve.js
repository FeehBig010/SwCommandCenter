import {PVE_STAGES} from './pve-stages.js';
export const PVE_AREAS=Object.fromEntries(Object.entries({cairos:['Cairos Dungeon',5],dimensional:['Buraco Dimensional',4],rift:['Fenda dos Mundos',6],toa:['Torre da Ascensão',5]}).map(([id,[label,slots]])=>[id,{label,slots,stages:PVE_STAGES[id]}]));
export const isPve=area=>Object.hasOwn(PVE_AREAS,area);
export function pveArt(area,stage){const scene=area==='cairos'?({gb10:'giant',db10:'dragon',nb10:'necro',gb12:'giant',db12:'dragon',nb12:'necro',gbah:'giant',dbah:'dragon',nbah:'necro',sf10:'steel',pc10:'punisher'})[stage]||'giant':isPve(area)?area:null;return scene?`/art/pve-${scene}.png`:null;}
export function cairosStagesForPresets(){return PVE_STAGES.cairos;}
