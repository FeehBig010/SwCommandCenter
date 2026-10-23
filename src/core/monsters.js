import {LOCAL_MONSTER_MANIFEST,safePortraitFilename,localMonsterImage} from './monster-assets.js';
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
const resolvedPortraits=new Map(),runtimePortraits=new Map(),manifestRequests=new WeakMap();
function portraitSources(filename){
 if(!safePortraitFilename(filename))return [];
 return [localMonsterImage(filename),...(portraitCache.includes(filename)?[`/game-icons/monsters/${filename}`]:[]),`https://swarfarm.com/static/herders/images/monsters/${filename}`,`https://raw.githubusercontent.com/swarfarm/swarfarm/master/herders/static/herders/images/monsters/${filename}`];
}
export function monsterImageSources(master){return runtimePortraits.get(Number(master))||portraitSources(images[String(master)]);}
async function localPortraitManifest(fetcher){
 if(typeof fetcher!=='function')return {};
 if(!manifestRequests.has(fetcher))manifestRequests.set(fetcher,(async()=>{
  try{const response=await fetcher(LOCAL_MONSTER_MANIFEST,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(4000)});if(!response.ok)return {};const data=await response.json();return data.version===1&&data.monsters&&typeof data.monsters==='object'&&!Array.isArray(data.monsters)?data.monsters:{};}catch{return {};}
 })());return manifestRequests.get(fetcher);
}
// One local manifest request serves every card. Weekly git pulls refresh the
// ID/filename map without rebuilding the frontend; the API remains a fallback
// for units newer than the community repository.
export function resolveMonsterImageSources(master,{fetcher=globalThis.fetch}={}){
 const id=Number(master);if(!Number.isSafeInteger(id)||id<10000)return Promise.resolve([]);
 if(!resolvedPortraits.has(id))resolvedPortraits.set(id,(async()=>{
  const manifest=await localPortraitManifest(fetcher),local=portraitSources(manifest[id]);
  if(local.length){runtimePortraits.set(id,local);return local;}
  const known=monsterImageSources(id);if(known.length)return known;
  try{const response=await fetcher(`https://swarfarm.com/api/v2/monsters/?com2us_id=${id}`,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(6000)});if(!response.ok)return [];const data=await response.json(),unit=data.results?.find(m=>Number(m.com2us_id)===id);const sources=portraitSources(unit?.image_filename);if(sources.length)runtimePortraits.set(id,sources);return sources;}catch{return [];}
 })());return resolvedPortraits.get(id);
}

export function catalogMonster(master,label){
 return {master:Number(master)||null,name:completeCatalog[master]||label||'Escolher monstro',element:Number(master)%10};
}
