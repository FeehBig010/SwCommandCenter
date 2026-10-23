import {cp,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {CHECKOUT_RELATIVE,IMAGE_TREE,PROJECT_ROOT,assetPaths,IMAGE_URL} from './asset-paths.js';

export function isPublicAsset(relative){
 const normalized=relative.split(path.sep).join('/');
 if(normalized.split('/').some(part=>part.startsWith('.')))return false;
 if(normalized!==CHECKOUT_RELATIVE&&!normalized.startsWith(`${CHECKOUT_RELATIVE}/`))return true;
 const images=`${CHECKOUT_RELATIVE}/${IMAGE_TREE}`;
 return images===normalized||images.startsWith(`${normalized}/`)||normalized.startsWith(`${images}/`);
}
export async function copyPublicAssets(root=PROJECT_ROOT,outDir=path.join(root,'dist')){
 const {publicDir}=assetPaths(root);await mkdir(outDir,{recursive:true});
 await cp(publicDir,outDir,{recursive:true,filter:source=>isPublicAsset(path.relative(publicDir,source))});
}
export function assetPublicPlugin(){
 let root,outDir;
 function protect(req,res,next){
  let pathname;try{pathname=decodeURIComponent((req.url||'/').split('?')[0]);}catch{res.statusCode=400;res.end();return;}
  if(pathname.startsWith(`/${CHECKOUT_RELATIVE}/`)&&!pathname.startsWith(IMAGE_URL)||pathname.split('/').some(part=>part==='.git'||part==='..'||part==='.'||part.startsWith('.env'))){res.statusCode=404;res.end();return;}
  next();
 }
 return {name:'public-game-artwork',
  configResolved(config){root=config.root;outDir=path.resolve(root,config.build.outDir);},
  configureServer(server){server.middlewares.use(protect);},
  configurePreviewServer(server){server.middlewares.use(protect);},
  async writeBundle(){await copyPublicAssets(root,outDir);}
 };
}
