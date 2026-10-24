import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {NEWS_API_PATH,normalizeNewsFeed,officialNewsUrl} from '../src/core/game-updates.js';
import {cachedGameUpdates,fetchGameUpdates} from '../src/lib/game-updates.js';
import {HIVE_SOURCES,parseHiveListing,collectHiveNews,hiveDate,fetchHiveNews} from '../server/hive-news.js';
import {createNewsService,newsMiddleware} from '../server/game-updates.js';
import {requiresLogin} from '../src/core/navigation-access.js';
import {pageFromLocation} from '../src/lib/auth.js';

const feed=()=>({version:1,fetchedAt:'2026-10-24T15:00:00Z',items:[{url:'https://www.withhive.com/notice/313/100',title:'v9.0.0 Update Notice',category:'update',publishedAt:'2026-10-23T00:00:00Z',thumbnail:'https://image-glb.qpyou.cn/news.jpg'}]});
const noticeHTML=`<ul id="notice_list_ul">
 <li class="row"><div class="type">Update</div><div class="col"><a onclick="$notice.goDetailUrlView(100)">v9.0.0 Update &amp; improvements</a></div><div class="date">2026.10.23</div></li>
 <li class="row"><div class="col"><a onclick="$notice.goDetailUrlView('101')">Developer Note: Monsters</a></div><div>2026-10-22</div></li>
 <li class="row"><div class="col"><a href="https://evil.test/notice/123">Other game / spam</a></div></li>
</ul>`;
const eventHTML=`<ul><li class="event"><div class="background" style="background-image:url('//image-glb.qpyou.cn/2026/event.jpg')"></div><a onclick="$notice.goDetailUrlView(200)"><span class="title">Halloween Event</span></a><span class="period">2026/10/24 ~ 2026/11/01</span></li></ul>`;
const logger={info(){},error(){}};
function storage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};}

test('official Hive listings extract JS navigation IDs, dates, categories and event thumbnails',()=>{
 const notices=parseHiveListing(noticeHTML,HIVE_SOURCES[0]),events=parseHiveListing(eventHTML,HIVE_SOURCES[1]);
 assert.equal(notices.length,2);assert.equal(notices[0].title,'v9.0.0 Update & improvements');assert.equal(notices[0].url,'https://www.withhive.com/notice/313/100');assert.equal(notices[0].category,'update');assert.equal(notices[1].category,'developer');assert.equal(notices[0].publishedAt,'2026-10-23T00:00:00.000Z');
 assert.equal(events[0].url,'https://www.withhive.com/event/313/200');assert.equal(events[0].thumbnail,'https://image-glb.qpyou.cn/2026/event.jpg');assert.equal(events[0].category,'event');assert.equal(events[0].publishedAt,'2026-10-24T00:00:00.000Z');
 assert.equal(hiveDate('2026-02-30'),null);assert.equal(hiveDate('No date supplied'),null);
});
test('feed validation rejects forged URLs, duplicates, invalid images and dates without inventing content',()=>{
 const raw=feed();raw.items.push({...raw.items[0]},...['javascript:alert(1)','https://withhive.com.evil.test/notice/100','https://evil@www.withhive.com/notice/100','https://www.withhive.com:3000/notice/100','https://www.withhive.com/notice/999/100'].map(url=>({...raw.items[0],url})),{url:'https://m.withhive.com/notice/101',title:'Missing data',category:'unknown',thumbnail:'data:image/svg+xml,test',publishedAt:'invalid'});
 const normalized=normalizeNewsFeed(raw);assert.equal(normalized.items.length,2);assert.equal(normalized.items[1].thumbnail,null);assert.equal(normalized.items[1].publishedAt,null);assert.equal(normalized.items[1].category,'notice');assert.equal(officialNewsUrl('http://withhive.com/notice/1'),null);assert.throws(()=>normalizeNewsFeed({items:[]}),/inválido/);
});
test('collector merges live pages with earlier entries, sorts and tolerates one failed source',async()=>{
 const previous=feed(),before=structuredClone(previous),complete=await collectHiveNews({loadPage:async source=>source.kind==='notice'?noticeHTML:eventHTML,previous,logger});
 assert.equal(complete.items.length,3);assert.equal(complete.items[0].title,'Halloween Event');assert.equal(complete.partial,false);assert.deepEqual(previous,before);
 const partial=await collectHiveNews({loadPage:async source=>{if(source.kind==='notice')throw new Error('network');return eventHTML;},previous,logger});assert.equal(partial.partial,true);assert.equal(partial.items.length,2);
 await assert.rejects(collectHiveNews({loadPage:async()=>'<html>No recognized list</html>',previous,logger}),/preservado/);assert.deepEqual(previous,before);
});
test('browser collector waits for Hive JavaScript lists and closes all pages and the browser',async()=>{
 let pagesClosed=0,browserClosed=false;const urls=[];
 const collected=await fetchHiveNews({logger,launch:async()=>({newPage:async()=>{let source;return {goto:async url=>{urls.push(url);source=HIVE_SOURCES.find(s=>s.url===url);return {ok:()=>true};},locator:selector=>{assert.equal(selector,source.selector);return {first:()=>({waitFor:async()=>{}})};},content:async()=>source.kind==='notice'?noticeHTML:eventHTML,close:async()=>{pagesClosed++;}};},close:async()=>{browserClosed=true;}})});
 assert.equal(collected.items.length,3);assert.deepEqual(urls,HIVE_SOURCES.map(s=>s.url));assert.equal(pagesClosed,2);assert.equal(browserClosed,true);
});
test('browser uses same-origin API, then the published snapshot, and never replaces good cache with an error',async()=>{
 const cache=storage(),calls=[];
 const result=await fetchGameUpdates({storage:cache,fetcher:async(url,options)=>{calls.push(url);assert.equal(options.credentials,'omit');return url===NEWS_API_PATH?new Response('<html>Static SPA</html>'):Response.json(feed());}});
 assert.deepEqual(calls,[NEWS_API_PATH,'/game-updates.json']);assert.equal(cachedGameUpdates(cache).items[0].title,result.items[0].title);
 await assert.rejects(fetchGameUpdates({storage:cache,fetcher:async()=>new Response('offline',{status:503})}),/Não foi possível/);assert.equal(cachedGameUpdates(cache).items.length,1);
 assert.equal(cachedGameUpdates({getItem(){throw new Error('private mode');}}),null);
 const unavailableStorage={setItem(){throw new Error('quota');}};assert.equal((await fetchGameUpdates({storage:unavailableStorage,fetcher:async()=>Response.json(feed())})).items.length,1);
});
test('leaving the module aborts a pending fetch without falling through to more sources',async()=>{
 const controller=new AbortController(),calls=[];controller.abort();await assert.rejects(fetchGameUpdates({signal:controller.signal,fetcher:async url=>{calls.push(url);return Response.json(feed());}}));assert.deepEqual(calls,[]);
});
test('Node service deduplicates requests, caches and retains last good news on upstream failure',async()=>{
 let time=1000,count=0,offline=false;const service=createNewsService({now:()=>time,logger,collect:async()=>{count++;if(offline)throw new Error('network unavailable');return feed();}});
 const a=service.get(),b=service.get();assert.equal(a,b);await a;await service.get();assert.equal(count,1);time+=300001;offline=true;const stale=await service.get();assert.equal(stale.items.length,1);assert.equal(count,2);await service.get();assert.equal(count,2);
});
test('same-origin news route returns JSON, supports HEAD, refuses POST and has a recoverable 503',async t=>{
 let offline=false;const middleware=newsMiddleware({get:async()=>{if(offline)throw new Error('network');return feed();}},{allowedOrigin:'https://site.example.test'}),server=createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404);res.end();}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));const base=`http://127.0.0.1:${server.address().port}`;
 let response=await fetch(base+NEWS_API_PATH);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/json/);assert.equal((await response.json()).items.length,1);assert.equal((await fetch(base+NEWS_API_PATH,{method:'HEAD'})).status,200);assert.equal((await fetch(base+NEWS_API_PATH,{method:'POST'})).status,405);assert.equal((await fetch(`${base}${NEWS_API_PATH}/anything`)).status,404);
 assert.equal((await fetch(base+NEWS_API_PATH,{headers:{Origin:'https://site.example.test'}})).headers.get('access-control-allow-origin'),'https://site.example.test');assert.equal((await fetch(base+NEWS_API_PATH,{headers:{Origin:'https://other.test'}})).headers.get('access-control-allow-origin'),null);
 offline=true;response=await fetch(base+NEWS_API_PATH);assert.equal(response.status,503);assert.match((await response.json()).error,/indisponíveis/);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('game updates have a public direct route without account requirements',()=>{
 assert.equal(pageFromLocation({hash:'#/updates'}),'updates');assert.equal(requiresLogin('updates'),false);
});
