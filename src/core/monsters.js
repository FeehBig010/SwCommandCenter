import {COLLAB_PORTRAIT_FILES} from './collab-portrait-files.js';
import {MONSTER_IMAGE_INDEX_URL,COMMUNITY_MONSTER_CDN,SWARFARM_MONSTER_CDN,readPortraitIndex,parseCommunityPortraitIndex} from './monster-image-index.js';
import {LOCAL_MONSTER_MANIFEST,safePortraitFilename,localMonsterImage} from './monster-assets.js';
import portraitCache from './portrait-cache.json' with {type:'json'};
import metadata from './monster-metadata.json' with {type:'json'};
import catalog from './catalog.json' with { type: 'json' };
// Public SWARFARM filename snapshot; current sources/update steps: docs/ASSETS.md.
import images from './monster-images.json' with { type: 'json' };

const completeCatalog={...Object.fromEntries(Object.entries(metadata.monsters).filter(([id,m])=>m.obtainable&&[1,2,3,4,5].includes(Number(id)%10)).map(([id,m])=>[id,m.name])),...catalog};
export const MONSTER_CATALOG=Object.entries(completeCatalog)
 .filter(([id,name])=>Number(id)>=10000&&name)
 .map(([id,name])=>({master:Number(id),name,element:Number(id)%10}))
 .sort((a,b)=>a.name.localeCompare(b.name)||a.master-b.master);

export const MONSTER_FALLBACK='/game-icons/monster-silhouette.svg';
const resolvedPortraits=new WeakMap(),runtimePortraits=new Map();
export function monsterMasterId(input){
 // Raw SWEX and normalized records are accepted; instance IDs are never used.
 const value=input&&typeof input==='object'?(Object.hasOwn(input,'unit_master_id')?input.unit_master_id:input.master??input.masterId):input;
 if(typeof value!=='number'&&!(typeof value==='string'&&/^\d+$/.test(value)))return null;
 const id=Number(value);return Number.isSafeInteger(id)&&id>=10000?id:null;
}
const embeddedFilename=id=>images[id]||COLLAB_PORTRAIT_FILES[id];
function portraitSources(filename,{preferLocal=false,community=true}={}){
 if(!safePortraitFilename(filename))return [];
 const local=[localMonsterImage(filename),...(portraitCache.includes(filename)?[`/game-icons/monsters/${filename}`]:[])],remote=[...(community?[`${COMMUNITY_MONSTER_CDN}${filename}`]:[]),`${SWARFARM_MONSTER_CDN}${filename}`,`https://raw.githubusercontent.com/swarfarm/swarfarm/master/herders/static/herders/images/monsters/${filename}`];
 return preferLocal?[...local,...remote]:[...remote,...local];
}
export function monsterImageSources(master){
 const id=monsterMasterId(master);if(id==null)return [];
 return runtimePortraits.get(id)||portraitSources(embeddedFilename(id),{preferLocal:!!metadata.monsters[id]});
}
async function localPortraitManifest(fetcher){
 return await readPortraitIndex(fetcher,LOCAL_MONSTER_MANIFEST,data=>data?.version===1&&data.monsters&&typeof data.monsters==='object'&&!Array.isArray(data.monsters)?{monsters:data.monsters}:null)||{};
}
// Refresh the entire public image index before trusting a static/local mapping.
// Newer units absent from that index resolve by their exact ID in the live API.
export function resolveMonsterImageSources(master,{fetcher=globalThis.fetch}={}){
 const id=monsterMasterId(master);if(id==null)return Promise.resolve([]);
 if(typeof fetcher!=='function')return Promise.resolve(monsterImageSources(id));
 let cache=resolvedPortraits.get(fetcher);if(!cache){cache=new Map();resolvedPortraits.set(fetcher,cache);}
 const previous=cache.get(id);if(previous&&previous.expires>Date.now())return previous.promise;
 const entry={expires:Infinity};entry.promise=(async()=>{
  const [manifest,current]=await Promise.all([localPortraitManifest(fetcher),readPortraitIndex(fetcher,MONSTER_IMAGE_INDEX_URL,parseCommunityPortraitIndex)]);
  const currentFilename=current?.[id],filename=currentFilename||manifest.monsters?.[id],sources=portraitSources(filename,{preferLocal:filename===manifest.monsters?.[id]||!currentFilename,community:!!currentFilename});
  if(sources.length){runtimePortraits.set(id,sources);entry.expires=Date.now()+(current?15*60*1000:10000);return sources;}
  const trusted=monsterImageSources(id);if(trusted.length){entry.expires=Date.now()+10000;return trusted;}
  try{
   let unit;
   const response=await fetcher(`https://swarfarm.com/api/v2/monsters/?com2us_id=${id}`,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(6000)});if(response.ok){const data=await response.json();unit=Array.isArray(data.results)?data.results.find(m=>Number(m.com2us_id)===id):null;}
   const sources=portraitSources(unit?.image_filename,{community:false});if(sources.length){
    entry.expires=Date.now()+15*60*1000;
    runtimePortraits.set(id,sources);return sources;
   }
  }catch{}
  entry.expires=Date.now()+10000;return monsterImageSources(id);
 })();cache.set(id,entry);return entry.promise;
}

export function catalogMonster(master,label){
 return {master:Number(master)||null,name:completeCatalog[master]||label||'Escolher monstro',element:Number(master)%10};
}
