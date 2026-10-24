import {NEWS_API_PATH,normalizeNewsFeed} from '../core/game-updates.js';
function browserStorage(){try{return globalThis.localStorage;}catch{return null;}}
const CACHE_KEY='sw-game-updates-v1';
export function cachedGameUpdates(storage=browserStorage()){
 try{const raw=storage?.getItem(CACHE_KEY);return raw&&raw.length<500000?normalizeNewsFeed(JSON.parse(raw)):null;}catch{return null;}
}
export async function fetchGameUpdates({signal,fetcher=fetch,storage=browserStorage()}={}){
 for(const url of [import.meta.env?.VITE_GAME_UPDATES_API_URL||NEWS_API_PATH,'/game-updates.json']){
  if(signal?.aborted)throw signal.reason;
  try{
   const response=await fetcher(url,{signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(55000)]),credentials:'omit',cache:'no-cache',headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const feed=normalizeNewsFeed(await response.json());
   if(!feed.items.length)throw new Error('Feed em sincronização.');
   try{storage?.setItem(CACHE_KEY,JSON.stringify(feed));}catch{/* Private mode or a full cache must not prevent reading. */}
   return feed;
  }catch(error){if(signal?.aborted)throw error;}
 }
 throw new Error('Não foi possível atualizar as notícias. Tente novamente ou consulte a Hive.');
}
