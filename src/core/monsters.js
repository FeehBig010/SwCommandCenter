import {monsterAliases} from './monster-aliases.js';
import {LOCAL_MONSTER_MANIFEST,safePortraitFilename,localMonsterImage,monsterSlug,portraitNameKeys} from './monster-assets.js';
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
export function monsterImageSources(master,{name='',element}={}){
 const known=runtimePortraits.get(Number(master))||portraitSources(images[String(master)]);if(known.length)return known;
 const keys=portraitNameKeys(name,element||Number(master)%10),alias=keys.map(k=>monsterAliases[k]).find(Boolean);
 if(typeof alias==='number'&&images[alias])return portraitSources(images[alias]);
 return keys.map(key=>localMonsterImage(`${key}.png`)).filter(Boolean);
}
async function localPortraitManifest(fetcher){
 if(typeof fetcher!=='function')return {};
 if(!manifestRequests.has(fetcher))manifestRequests.set(fetcher,(async()=>{
  try{const response=await fetcher(LOCAL_MONSTER_MANIFEST,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(4000)});if(!response.ok)return {monsters:{},names:{}};const data=await response.json();return data.version===1&&data.monsters&&typeof data.monsters==='object'&&!Array.isArray(data.monsters)?{monsters:data.monsters,names:data.names||{}}:{monsters:{},names:{}};}catch{return {};}
 })());return manifestRequests.get(fetcher);
}
// One local manifest request serves every card. Weekly git pulls refresh the
// ID/filename map without rebuilding the frontend; the API remains a fallback
// for units newer than the community repository.
export function resolveMonsterImageSources(master,{fetcher=globalThis.fetch,name='',element}={}){
 const id=Number(master),validId=Number.isSafeInteger(id)&&id>=10000,keys=portraitNameKeys(name,element||id%10),key=validId?id:`name:${keys.join('|')}`;
 if(!validId&&!keys.length)return Promise.resolve([]);
 if(!resolvedPortraits.has(key))resolvedPortraits.set(key,(async()=>{
  const manifest=await localPortraitManifest(fetcher),filename=manifest.monsters?.[id]||keys.map(k=>manifest.names?.[k]).find(Boolean),local=portraitSources(filename);
  if(local.length){if(validId)runtimePortraits.set(id,local);return local;}
  const trusted=runtimePortraits.get(id)||portraitSources(images[String(id)]);if(trusted.length)return trusted;
  const alias=keys.map(k=>monsterAliases[k]).find(Boolean);
  if(typeof alias==='number'&&images[alias])return portraitSources(images[alias]);
  try{
   let unit;
   if(validId){const response=await fetcher(`https://swarfarm.com/api/v2/monsters/?com2us_id=${id}`,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(6000)});if(response.ok){const data=await response.json();unit=data.results?.find(m=>Number(m.com2us_id)===id);}}
   // A name lookup is only authoritative when no instance/master ID was supplied.
   if(!unit&&!validId&&name){const canonical=alias?.searchName||name.replace(/\([^)]*\)/g,'').trim(),response=await fetcher(`https://swarfarm.com/api/v2/monsters/?name=${encodeURIComponent(canonical)}`,{credentials:'omit',signal:AbortSignal.timeout(6000)});if(response.ok){const data=await response.json(),matches=(data.results||[]).filter(m=>monsterSlug(m.name)===monsterSlug(canonical)&&(!element&&!alias?.element||Number(m.com2us_id)%10===Number(element||alias.element)));if(matches.length===1)unit=matches[0];}}
   let sources=portraitSources(unit?.image_filename);if(sources.length){
    // New collaboration portraits can exist on the API/CDN before the mirrored
    // Git repository. Probe local availability before choosing an image src.
    let available=false;try{available=(await fetcher(localMonsterImage(unit.image_filename),{method:'HEAD',credentials:'omit',signal:AbortSignal.timeout(4000)})).ok;}catch{}
    if(!available)sources=[...sources.filter(url=>url.startsWith('https:')),...sources.filter(url=>!url.startsWith('https:'))];
    if(validId)runtimePortraits.set(id,sources);return sources;
   }
  }catch{}
  return monsterImageSources(master,{name,element});
 })());return resolvedPortraits.get(key);
}

export function catalogMonster(master,label){
 return {master:Number(master)||null,name:completeCatalog[master]||label||'Escolher monstro',element:Number(master)%10};
}
