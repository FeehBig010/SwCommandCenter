import {load} from 'cheerio';
import {normalizeNewsFeed,officialNewsUrl,newsThumbnail} from '../src/core/game-updates.js';

export async function fetchHiveNews({previous=null,logger=console,launch}={}){
 const openBrowser=launch||(async options=>(await import('playwright')).chromium.launch(options));
 const browser=await openBrowser({headless:true,...(process.env.NEWS_BROWSER_PATH?{executablePath:process.env.NEWS_BROWSER_PATH}:{})});
 const deadline=Date.now()+45000;
 try{const feed=await collectHiveNews({previous,logger,loadPage:async source=>{
  const page=await browser.newPage({locale:'en-US'});
  try{
   await page.route?.('**/*',route=>['image','font','media'].includes(route.request().resourceType())?route.abort():route.fallback());
   const response=await page.goto(source.url,{waitUntil:'domcontentloaded',timeout:30000});
   if(!response?.ok())throw new Error(`Hive ${source.kind}: HTTP ${response?.status()}`);
   await page.locator(source.selector).first().waitFor({state:'attached',timeout:20000});
   return await page.content();
  }finally{await page.close();}
 }});
 // Event tiles sometimes omit the publication date. Read the original article's
 // metadata rather than treating the event period or image upload as publication.
 const missing=feed.items.filter(item=>!item.publishedAt);let cursor=0;
 await Promise.all(Array.from({length:Math.min(3,missing.length)},async()=>{
  while(cursor<missing.length&&Date.now()<deadline-1000){
   const item=missing[cursor++],page=await browser.newPage({locale:'en-US'});
   try{
    await page.route?.('**/*',route=>['image','font','media'].includes(route.request().resourceType())?route.abort():route.fallback());
    const response=await page.goto(item.url,{waitUntil:'domcontentloaded',timeout:Math.min(8000,deadline-Date.now())});
    if(!response?.ok())continue;
    await page.locator('time[datetime], .date, .regdate, .notice_date, meta[property="article:published_time"]').first().waitFor({state:'attached',timeout:Math.min(2000,Math.max(1,deadline-Date.now()))}).catch(()=>{});
    item.publishedAt=hiveArticleDate(await page.content());
   }catch{/* Date metadata is optional; a slow article must not discard the feed. */}finally{await page.close();}
  }
 }));
 return normalizeNewsFeed(feed);
 }finally{await browser.close();}
}

export const HIVE_SOURCES=[
 {kind:'notice',url:'https://www.withhive.com/notice/game/313?lang=en',selector:'#notice_list_ul li.row'},
 {kind:'event',url:'https://www.withhive.com/event/game/313?lang=en',selector:'li.event'},
];
export function newsCategory(title,type=''){
 const text=`${type} ${title}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/developer|dev.?note|desenvolvedor|desenvolvimento/.test(text))return 'developer';
 if(/update|patch|balance|atualiza|balanceamento/.test(text))return 'update';
 if(/event|evento/.test(text))return 'event';
 return 'notice';
}
export function hiveDate(text,now=new Date()){
 // Hive's date-only values have no time zone; do not shift their calendar day.
 const iso=String(text||'').match(/(?<!\d)(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})(?!\d)/);
 if(!iso){
  const value=String(text||'').trim(),relative=value.match(/\b(\d+)\s*(day|hour|minute|second)s?\s+ago\b/i);
  if(relative||/^(today|yesterday)$/i.test(value)){
   const days=relative&&relative[2].toLowerCase()==='day'?Number(relative[1]):/^yesterday$/i.test(value)?1:0;
   const date=new Date(now);date.setUTCDate(date.getUTCDate()-days);date.setUTCHours(0,0,0,0);return date.toISOString();
  }
  const english=value.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+20\d{2}\b/i)?.[0];
  return english&&Number.isFinite(Date.parse(english))?new Date(Date.parse(english)).toISOString():null;
 }
 const value=`${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}T00:00:00.000Z`,date=new Date(value);
 return Number.isFinite(+date)&&date.toISOString()===value?value:null;
}
export function hiveArticleDate(html){
 const $=load(html),meta=$('meta[property="article:published_time"],meta[name="date"],meta[itemprop="datePublished"]').first().attr('content');
 return hiveDate(meta)||hiveDate($('time[datetime]').first().attr('datetime'))||hiveDate($('.date, .regdate, .notice_date, .view_date').first().text());
}
export function parseHiveListing(html,{kind,selector}){
 const $=load(html),items=[];
 const absolute=value=>{try{return new URL(value,'https://www.withhive.com').href;}catch{return null;}};
 $(selector).each((_,node)=>{
  const row=$(node),links=row.find('a'),link=links.filter('[onclick]').first().length?links.filter('[onclick]').first():links.first();
  const onclick=link.attr('onclick')||'',id=onclick.match(/\$notice\.goDetailUrlView\(\s*['"]?(\d+)/)?.[1];
  const href=link.attr('href'),url=officialNewsUrl(id?`https://www.withhive.com/${kind}/313/${id}`:href?absolute(href):'');
  const title=(row.find('.title').first().text()||link.attr('title')||link.text()).replace(/\s+/g,' ').trim();
  const dateText=row.find('time').attr('datetime')||row.find('.date, .regdate, .time, .period').text()||row.text();
  const style=row.find('[style*="background"]').first().attr('style')||'';
  const image=row.find('img').first().attr('data-src')||row.find('img').first().attr('src')||style.match(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/)?.[1];
  if(url&&title)items.push({url,title,publishedAt:hiveDate(dateText),category:kind==='event'?'event':newsCategory(title,row.find('.type, .category').text()),thumbnail:image?newsThumbnail(absolute(image)):null});
 });
 return items;
}
export async function collectHiveNews({loadPage,previous=null,now=()=>new Date(),logger=console}){
 const results=await Promise.allSettled(HIVE_SOURCES.map(async source=>{
  const items=parseHiveListing(await loadPage(source),source);
  if(!items.length)throw new Error(`Listagem ${source.kind} sem notícias reconhecidas.`);
  return items;
 }));
 const failures=results.filter(r=>r.status==='rejected');
 for(const result of failures)logger.error(`[Notícias Hive] ${result.reason.message}`);
 if(failures.length===results.length)throw new Error('Nenhuma listagem oficial disponível; o feed anterior foi preservado.');
 const fresh=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
 const feed=normalizeNewsFeed({version:1,fetchedAt:now().toISOString(),partial:failures.length>0,items:[...fresh,...(previous?.items||[])].slice(0,200)});
 logger.info(`[Notícias Hive] ${feed.items.length} notícias sincronizadas${feed.partial?' (fonte parcialmente indisponível)':''}.`);
 return feed;
}
