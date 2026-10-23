// Pure URL helpers shared by all portraits and exports. These paths mirror the
// sparse SWARFARM checkout served by Vite or the persistent Node service.
export const LOCAL_GAME_IMAGE_ROOT='/assets/imagens_sw/herders/static/herders/images/';
export const LOCAL_MONSTER_ROOT=`${LOCAL_GAME_IMAGE_ROOT}monsters/`;
export const LOCAL_MONSTER_MANIFEST='/assets/sw-monster-images.json';
export const safePortraitFilename=value=>typeof value==='string'&&/^[a-zA-Z0-9_-][\w.-]*\.(png|jpe?g|webp|gif)$/i.test(value)&&!value.includes('..');
export const localMonsterImage=filename=>safePortraitFilename(filename)?`${LOCAL_MONSTER_ROOT}${filename}`:null;

export const localGameImage=(category,filename)=>['monsters','skills','elements','runes'].includes(category)&&safePortraitFilename(filename)?`${LOCAL_GAME_IMAGE_ROOT}${category}/${filename}`:null;

export function monsterSlug(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[()]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
export function portraitNameKeys(name,element){const slug=monsterSlug(name);if(!slug)return [];const suffix={1:['agua','water'],2:['fogo','fire'],3:['vento','wind'],4:['luz','light'],5:['trevas','dark']}[Number(element)]||[];const bare=slug.replace(/_(agua|water|fogo|fire|vento|wind|luz|light|trevas|dark)$/,'');return [...new Set([slug,...suffix.map(s=>`${bare}_${s}`)].filter(Boolean))];}
