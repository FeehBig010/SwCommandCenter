export const HIVE_NEWS_URL='https://www.withhive.com/notice/game/313';
export const NEWS_API_PATH='/api/game-updates';
export const NEWS_FALLBACK='/game-icons/summoners-war-news.svg';
export const NEWS_CATEGORIES={update:'Atualização',event:'Evento',developer:'Nota do Desenvolvedor',notice:'Comunicado'};
export const NEWS_STALE_MS=6*60*60*1000;

export function officialNewsUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&['withhive.com','www.withhive.com','m.withhive.com'].includes(u.hostname)&&!u.username&&!u.password&&!u.port&&/^\/(?:notice|event)\/(?:313\/)?\d+\/?$/.test(u.pathname)?u.href:null;}catch{return null;}
}
export function newsThumbnail(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:null;}catch{return null;}
}
export function normalizeNewsFeed(input){
 if(input?.version!==1||!Array.isArray(input.items)||input.items.length>200||!Number.isFinite(Date.parse(input.fetchedAt)))throw new Error('Feed de notícias inválido.');
 const seen=new Set(),items=[];
 for(const row of input.items){
  const url=officialNewsUrl(row?.url),title=typeof row?.title==='string'?row.title.trim().slice(0,250):'';
  if(!url||!title||seen.has(url))continue;seen.add(url);
  items.push({id:url,url,title,category:Object.hasOwn(NEWS_CATEGORIES,row.category)?row.category:'notice',publishedAt:Number.isFinite(Date.parse(row.publishedAt))?new Date(row.publishedAt).toISOString():null,thumbnail:newsThumbnail(row.thumbnail)});
 }
 items.sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0));
 return {version:1,source:'WithHive / Com2uS',fetchedAt:new Date(input.fetchedAt).toISOString(),partial:input.partial===true,items:items.slice(0,60)};
}
