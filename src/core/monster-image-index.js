import {safePortraitFilename} from './monster-assets.js';

// Community mirror of the public SWARFARM image index; one request serves all cards.
export const MONSTER_IMAGE_INDEX_URL='https://cdn.jsdelivr.net/gh/Millet0217/summonerswar-tool@main/work/icon_map.json';
export const COMMUNITY_MONSTER_CDN='https://cdn.jsdelivr.net/gh/Millet0217/summonerswar-tool@main/icons/';
export const SWARFARM_MONSTER_CDN='https://swarfarm.com/static/herders/images/monsters/';
const requests=new WeakMap();
export function readPortraitIndex(fetcher,url,parse){
 if(typeof fetcher!=='function')return Promise.resolve(null);
 let cache=requests.get(fetcher);if(!cache){cache=new Map();requests.set(fetcher,cache);}
 const existing=cache.get(url);if(existing&&existing.expires>Date.now())return existing.promise;
 const entry={expires:Infinity};
 entry.promise=(async()=>{
  try{const response=await fetcher(url,{credentials:'omit',cache:'no-cache',signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Image index unavailable');const result=parse(await response.json());if(!result)throw new Error('Invalid image index');entry.expires=Date.now()+15*60*1000;return result;}
  catch{entry.expires=Date.now()+10000;return null;}
 })();cache.set(url,entry);return entry.promise;
}
export function parseCommunityPortraitIndex(data){
 if(!data||typeof data!=='object'||Array.isArray(data))return null;
 const entries=Object.entries(data);if(entries.length>50000)return null;
 const valid=entries.filter(([id,filename])=>/^\d+$/.test(id)&&Number.isSafeInteger(Number(id))&&Number(id)>=10000&&safePortraitFilename(filename));
 return valid.length?Object.fromEntries(valid):null;
}
