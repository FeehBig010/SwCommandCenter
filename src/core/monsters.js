import {monsterAliases} from './monster-aliases.js';
import {collabPortraitTarget} from './collab-mapping.js';
import {MONSTER_IMAGE_INDEX_URL,COMMUNITY_MONSTER_CDN,SWARFARM_MONSTER_CDN,readPortraitIndex,parseCommunityPortraitIndex} from './monster-image-index.js';
import {LOCAL_MONSTER_MANIFEST,safePortraitFilename,localMonsterImage,monsterSlug,portraitNameKeys} from './monster-assets.js';
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
const portraitNames=new Map();
for(const [id,entry] of Object.entries(metadata.monsters))if(entry.obtainable){const key=monsterSlug(entry.name),ids=portraitNames.get(key)||[];ids.push(Number(id));portraitNames.set(key,ids);}
for(const [id,name] of Object.entries(catalog)){const key=monsterSlug(name),ids=portraitNames.get(key)||[];if(!ids.includes(Number(id)))ids.push(Number(id));portraitNames.set(key,ids);}
function portraitIdentity(master,name,element){
 const target=collabPortraitTarget(master,name,element);
 if(target==null)return {id:Number(master),name,element:element||Number(master)%10};
 if(typeof target==='number'){
  // Some recent original families are catalogued only with their 0x IDs.
  const alternate=target%100>=10?target-10:target+10,id=completeCatalog[target]||metadata.monsters[target]||images[target]?target:completeCatalog[alternate]||metadata.monsters[alternate]||images[alternate]?alternate:target;
  return {id,name:completeCatalog[id]||metadata.monsters[id]?.name||'',element:id%10};
 }
 const slug=monsterSlug(target),suffix=slug.match(/_(water|fire|wind|light|dark)$/)?.[1],targetElement=suffix?['water','fire','wind','light','dark'].indexOf(suffix)+1:Number(element)||Number(master)%10;
 const candidates=portraitNames.get(slug.replace(/_(water|fire|wind|light|dark)$/,''))||[],id=candidates.find(id=>!targetElement||id%10===targetElement);
 return {id:id||0,name:target,element:targetElement};
}
function portraitSources(filename,{preferLocal=false,community=true}={}){
 if(!safePortraitFilename(filename))return [];
 const local=[localMonsterImage(filename),...(portraitCache.includes(filename)?[`/game-icons/monsters/${filename}`]:[])],remote=[...(community?[`${COMMUNITY_MONSTER_CDN}${filename}`]:[]),`${SWARFARM_MONSTER_CDN}${filename}`,`https://raw.githubusercontent.com/swarfarm/swarfarm/master/herders/static/herders/images/monsters/${filename}`];
 return preferLocal?[...local,...remote]:[...remote,...local];
}
export function monsterImageSources(master,{name='',element}={}){
 const identity=portraitIdentity(master,name,element),known=runtimePortraits.get(identity.id)||portraitSources(images[String(identity.id)],{preferLocal:!!metadata.monsters[identity.id]});if(known.length)return known;
 const keys=portraitNameKeys(identity.name,identity.element),alias=keys.map(k=>monsterAliases[k]).find(Boolean);
 if(typeof alias==='number')return monsterImageSources(alias);
 return keys.map(key=>localMonsterImage(`${key}.png`)).filter(Boolean);
}
async function localPortraitManifest(fetcher){
 return await readPortraitIndex(fetcher,LOCAL_MONSTER_MANIFEST,data=>data?.version===1&&data.monsters&&typeof data.monsters==='object'&&!Array.isArray(data.monsters)?{monsters:data.monsters,names:data.names||{}}:null)||{};
}
// Refresh the entire public image index before trusting a static/local mapping.
// Newer units absent from that index resolve by their exact ID in the live API.
export function resolveMonsterImageSources(master,{fetcher=globalThis.fetch,name='',element}={}){
 const identity=portraitIdentity(master,name,element),id=identity.id;
 name=identity.name;element=identity.element;
 const validId=Number.isSafeInteger(id)&&id>=10000,keys=portraitNameKeys(name,element),key=validId?id:`name:${keys.join('|')}`;
 if(!validId&&!keys.length)return Promise.resolve([]);
 if(typeof fetcher!=='function')return Promise.resolve(monsterImageSources(master,{name,element}));
 let cache=resolvedPortraits.get(fetcher);if(!cache){cache=new Map();resolvedPortraits.set(fetcher,cache);}
 const previous=cache.get(key);if(previous&&previous.expires>Date.now())return previous.promise;
 const entry={expires:Infinity};entry.promise=(async()=>{
  const [manifest,current]=await Promise.all([localPortraitManifest(fetcher),readPortraitIndex(fetcher,MONSTER_IMAGE_INDEX_URL,parseCommunityPortraitIndex)]);
  const currentFilename=current?.[id],filename=currentFilename||manifest.monsters?.[id]||keys.map(k=>manifest.names?.[k]).find(Boolean),sources=portraitSources(filename,{preferLocal:filename===manifest.monsters?.[id]||!currentFilename,community:!!currentFilename});
  if(sources.length){if(validId)runtimePortraits.set(id,sources);entry.expires=Date.now()+(current?15*60*1000:10000);return sources;}
  const trusted=runtimePortraits.get(id)||portraitSources(images[String(id)],{preferLocal:!!metadata.monsters[id]});if(trusted.length){entry.expires=Date.now()+10000;return trusted;}
  const alias=keys.map(k=>monsterAliases[k]).find(Boolean);
  if(typeof alias==='number'){entry.expires=Date.now()+10000;return monsterImageSources(alias);}
  try{
   let unit;
   if(validId){const response=await fetcher(`https://swarfarm.com/api/v2/monsters/?com2us_id=${id}`,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(6000)});if(response.ok){const data=await response.json();unit=data.results?.find(m=>Number(m.com2us_id)===id);}}
   // A name lookup is only authoritative when no instance/master ID was supplied.
   if(!unit&&!validId&&name){const canonical=alias?.searchName||name.replace(/\([^)]*\)/g,'').trim(),response=await fetcher(`https://swarfarm.com/api/v2/monsters/?name=${encodeURIComponent(canonical)}`,{credentials:'omit',signal:AbortSignal.timeout(6000)});if(response.ok){const data=await response.json(),matches=(data.results||[]).filter(m=>monsterSlug(m.name)===monsterSlug(canonical)&&(!element&&!alias?.element||Number(m.com2us_id)%10===Number(element||alias.element)));if(matches.length===1)unit=matches[0];}}
   const sources=portraitSources(unit?.image_filename,{community:false});if(sources.length){
    entry.expires=Date.now()+15*60*1000;
    if(validId)runtimePortraits.set(id,sources);return sources;
   }
  }catch{}
  entry.expires=Date.now()+10000;return monsterImageSources(id,{name,element});
 })();cache.set(key,entry);return entry.promise;
}

export function catalogMonster(master,label){
 return {master:Number(master)||null,name:completeCatalog[master]||label||'Escolher monstro',element:Number(master)%10};
}
