import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {NEWS_API_PATH,normalizeNewsFeed} from '../src/core/game-updates.js';
import {fetchHiveNews} from './hive-news.js';

export function createNewsService({root,collect=fetchHiveNews,logger=console,now=Date.now}={}){
 let cached=null,checked=0,pending=null;
 async function update(){
  try{
   const feed=normalizeNewsFeed(await collect({previous:cached,logger}));if(!feed.items.length)throw new Error('Feed em sincronização.');
   cached=feed;
  }catch(error){
   logger.error(`[Notícias] Não foi possível consultar o feed: ${error.message}`);
   if(!cached&&root)for(const folder of ['dist','public'])try{cached=normalizeNewsFeed(JSON.parse(await readFile(path.join(root,folder,'game-updates.json'),'utf8')));break;}catch{}
  }finally{checked=now();}
  if(!cached?.items.length)throw new Error('Feed temporariamente indisponível.');
  return cached;
 }
 return {get(){if(cached&&now()-checked<300000)return Promise.resolve(cached);if(!pending)pending=update().finally(()=>{pending=null;});return pending;}};
}
export function newsMiddleware(service,{allowedOrigin=process.env.NEWS_ALLOWED_ORIGIN}={}){
 return async(req,res,next)=>{
  if((req.url||'').split('?')[0]!==NEWS_API_PATH)return next();
  if(allowedOrigin){res.setHeader('Vary','Origin');if(req.headers.origin===allowedOrigin)res.setHeader('Access-Control-Allow-Origin',allowedOrigin);}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
  try{const feed=await service.get();res.setHeader('Cache-Control','public, max-age=60');res.writeHead(200);res.end(req.method==='HEAD'?undefined:JSON.stringify(feed));}
  catch{res.setHeader('Cache-Control','no-store');res.writeHead(503);res.end(req.method==='HEAD'?undefined:JSON.stringify({error:'Notícias indisponíveis. Tente novamente em instantes.'}));}
 };
}
export function gameUpdatesPlugin(){
 let root;const attach=server=>server.middlewares.use(newsMiddleware(createNewsService({root})));
 return {name:'official-game-updates',configResolved(config){root=config.root;},configureServer:attach,configurePreviewServer:attach};
}
