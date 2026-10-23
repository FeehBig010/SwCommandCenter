import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {PROJECT_ROOT,IMAGE_URL,MANIFEST_URL,assetPaths,CHECKOUT_RELATIVE} from './asset-paths.js';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.wasm':'application/wasm','.ico':'image/x-icon'};
const inside=(target,base)=>target===base||target.startsWith(`${base}${path.sep}`);
export function createAppServer({root=PROJECT_ROOT,logger=console}={}){
 const dist=path.join(root,'dist'),assets=assetPaths(root);
 return createServer(async(req,res)=>{
  try{
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
   let urlPath;try{urlPath=decodeURIComponent((req.url||'/').split('?')[0]);}catch{res.writeHead(400);res.end();return;}
   if(urlPath.includes('\\')||urlPath.includes('\0')||urlPath.split('/').some(part=>part.startsWith('.'))){res.writeHead(404);res.end();return;}
   const liveImage=urlPath.startsWith(IMAGE_URL),manifest=urlPath===MANIFEST_URL;
   if((urlPath===`/${CHECKOUT_RELATIVE}`||urlPath.startsWith(`/${CHECKOUT_RELATIVE}/`))&&!liveImage){res.writeHead(404);res.end();return;}
   const base=liveImage?assets.imageRoot:manifest?assets.publicDir:dist;
   let filename=urlPath==='/'?path.join(dist,'index.html'):liveImage?path.resolve(base,urlPath.slice(IMAGE_URL.length)):path.resolve(base,`.${urlPath}`);
   if(!inside(filename,base)){res.writeHead(404);res.end();return;}
   let info;
   try{info=await stat(filename);if(!info.isFile())throw Object.assign(new Error('Not a file'),{code:'ENOENT'});}
   catch(error){
    if(error.code!=='ENOENT'&&error.code!=='ENOTDIR')throw error;
    if(liveImage||manifest||path.extname(urlPath)||!req.headers.accept?.includes('text/html')){res.writeHead(404);res.end();return;}
    filename=path.join(dist,'index.html');info=await stat(filename);
   }
   if(!inside(await realpath(filename),await realpath(base))){res.writeHead(404);res.end();return;}
   const etag=`W/"${info.size}-${info.mtimeMs}"`,cache=manifest?'no-store':liveImage?'public, max-age=0, must-revalidate':urlPath.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache';
   res.setHeader('Cache-Control',cache);res.setHeader('ETag',etag);res.setHeader('X-Content-Type-Options','nosniff');
   if(!manifest&&req.headers['if-none-match']===etag){res.writeHead(304);res.end();return;}
   res.writeHead(200,{'Content-Type':types[path.extname(filename).toLowerCase()]||'application/octet-stream','Content-Length':info.size});
   if(req.method==='HEAD'){res.end();return;}
   createReadStream(filename).on('error',error=>{logger.error(`[HTTP] ${error.message}`);res.destroy();}).pipe(res);
  }catch(error){logger.error(`[HTTP] ${error.message}`);if(!res.headersSent)res.writeHead(error.code==='ENOENT'?503:500);res.end('Site indisponível. Execute npm run build antes de iniciar o servidor.');}
 });
}
