import {createNewsService,newsMiddleware} from '../server/game-updates.js';
import {fetchHiveNews} from '../server/hive-news.js';

// Vercel functions cannot use a browser installed on a persistent Node host.
// Bundle a Lambda Chromium binary and unpack it into temporary space.
export async function launchNewsBrowser(options){
 const [{default:chromium},{chromium:playwright}]=await Promise.all([import('@sparticuz/chromium'),import('playwright')]);
 return playwright.launch({...options,args:chromium.args,executablePath:await chromium.executablePath()});
}
export function createVercelNewsHandler({collect=options=>fetchHiveNews({...options,launch:launchNewsBrowser}),logger=console}={}){
 const service=createNewsService({collect,logger});
 return newsMiddleware(service);
}
export default createVercelNewsHandler();
