import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const PROJECT_ROOT=fileURLToPath(new URL('../',import.meta.url));
export const ASSET_REPOSITORY='https://github.com/swarfarm/swarfarm.git';
export const ASSET_BRANCH='master';
export const CHECKOUT_RELATIVE='assets/imagens_sw';
export const IMAGE_TREE='herders/static/herders/images';
export const FIXTURE='bestiary/fixtures/bestiary_data.json';
export const MANIFEST_RELATIVE='assets/sw-monster-images.json';
export const IMAGE_URL=`/${CHECKOUT_RELATIVE}/${IMAGE_TREE}/`;
export const MANIFEST_URL=`/${MANIFEST_RELATIVE}`;
export const ASSET_CRON='59 23 * * 2';
export const ASSET_TIMEZONE='America/Sao_Paulo';
export const safeImageFilename=value=>typeof value==='string'&&/^[a-zA-Z0-9_-][\w.-]*\.(png|jpe?g|webp|gif)$/i.test(value)&&!value.includes('..');
export function assetPaths(root=PROJECT_ROOT){
 const publicDir=path.join(root,'public'),checkout=path.join(publicDir,CHECKOUT_RELATIVE);
 return {publicDir,checkout,imageRoot:path.join(checkout,IMAGE_TREE),fixture:path.join(checkout,FIXTURE),manifest:path.join(publicDir,MANIFEST_RELATIVE)};
}
