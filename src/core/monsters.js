import portraitCache from './portrait-cache.json' with {type:'json'};
import metadata from './monster-metadata.json' with {type:'json'};
import catalog from './catalog.json' with { type: 'json' };
// Public SWARFARM bestiary filename snapshot; provenance/update reference is in CONTEXT.md.
import images from './monster-images.json' with { type: 'json' };

const completeCatalog={...Object.fromEntries(Object.entries(metadata.monsters).filter(([id,m])=>m.obtainable&&[1,2,3,4,5].includes(Number(id)%10)).map(([id,m])=>[id,m.name])),...catalog};
export const MONSTER_CATALOG=Object.entries(completeCatalog)
 .filter(([id,name])=>Number(id)>=10000&&name)
 .map(([id,name])=>({master:Number(id),name,element:Number(id)%10}))
 .sort((a,b)=>a.name.localeCompare(b.name)||a.master-b.master);

export const MONSTER_FALLBACK='/game-icons/monster-silhouette.svg';
const resolvedPortraits=new Map(),runtimePortraits=new Map();
function portraitSources(filename){
 if(!filename||!/^[\w.-]+$/.test(filename))return [];
 return [...(portraitCache.includes(filename)?[`/game-icons/monsters/${filename}`]:[]),`https://swarfarm.com/static/herders/images/monsters/${filename}`,`https://raw.githubusercontent.com/swarfarm/swarfarm/master/herders/static/herders/images/monsters/${filename}`];
}
export function monsterImageSources(master){return runtimePortraits.get(Number(master))||portraitSources(images[String(master)]);}
// The public API can include recent units before the fixture snapshot is updated.
// Deduplicate across cards, virtualized search rows and timelines; failure keeps
// the local silhouette and never exposes a broken image to the layout.
export function resolveMonsterImageSources(master,{fetcher=globalThis.fetch}={}){
 const id=Number(master);if(!Number.isSafeInteger(id)||id<10000)return Promise.resolve([]);
 if(!resolvedPortraits.has(id))resolvedPortraits.set(id,(async()=>{
  try{const response=await fetcher(`https://swarfarm.com/api/v2/monsters/?com2us_id=${id}`,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(6000)});if(!response.ok)return [];const data=await response.json(),unit=data.results?.find(m=>Number(m.com2us_id)===id);const sources=portraitSources(unit?.image_filename);if(sources.length)runtimePortraits.set(id,sources);return sources;}catch{return [];}
 })());return resolvedPortraits.get(id);
}

export function catalogMonster(master,label){
 return {master:Number(master)||null,name:completeCatalog[master]||label||'Escolher monstro',element:Number(master)%10};
}
