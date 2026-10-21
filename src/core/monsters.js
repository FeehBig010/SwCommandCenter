import catalog from './catalog.json' with { type: 'json' };
// Public SWARFARM bestiary filename snapshot; provenance/update reference is in CONTEXT.md.
import images from './monster-images.json' with { type: 'json' };

export const MONSTER_CATALOG=Object.entries(catalog)
 .filter(([id,name])=>Number(id)>=10000&&name)
 .map(([id,name])=>({master:Number(id),name,element:Number(id)%10}))
 .sort((a,b)=>a.name.localeCompare(b.name)||a.master-b.master);

export function monsterImageSources(master){
 const filename=images[String(master)];
 if(!filename||!/^[\w.-]+$/.test(filename))return [];
 return [
  `https://swarfarm.com/static/herders/images/monsters/${filename}`,
  `https://raw.githubusercontent.com/swarfarm/swarfarm/master/herders/static/herders/images/monsters/${filename}`,
 ];
}
export function catalogMonster(master,label){
 return {master:Number(master)||null,name:catalog[master]||label||'Escolher monstro',element:Number(master)%10};
}
