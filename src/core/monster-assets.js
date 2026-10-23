// Pure URL helpers shared by all portraits and exports. These paths mirror the
// sparse SWARFARM checkout served by Vite or the persistent Node service.
export const LOCAL_GAME_IMAGE_ROOT='/assets/imagens_sw/herders/static/herders/images/';
export const LOCAL_MONSTER_ROOT=`${LOCAL_GAME_IMAGE_ROOT}monsters/`;
export const LOCAL_MONSTER_MANIFEST='/assets/sw-monster-images.json';
export const safePortraitFilename=value=>typeof value==='string'&&/^[a-zA-Z0-9_-][\w.-]*\.(png|jpe?g|webp|gif)$/i.test(value)&&!value.includes('..');
export const localMonsterImage=filename=>safePortraitFilename(filename)?`${LOCAL_MONSTER_ROOT}${filename}`:null;

export const localGameImage=(category,filename)=>['monsters','skills','elements','runes'].includes(category)&&safePortraitFilename(filename)?`${LOCAL_GAME_IMAGE_ROOT}${category}/${filename}`:null;

const ELEMENT_TRANSLATIONS={agua:'water',fogo:'fire',vento:'wind',luz:'light',escuridao:'dark',trevas:'dark',water:'water',fire:'fire',wind:'wind',light:'light',dark:'dark'};
const withoutAccents=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
// Translate before slugifying so localized JSON names match English asset names.
export function translatePortraitElements(value){return String(value||'').replace(/\(\s*([^()]*)\s*\)/g,(match,element)=>ELEMENT_TRANSLATIONS[withoutAccents(element.trim()).toLowerCase()]?` ${ELEMENT_TRANSLATIONS[withoutAccents(element.trim()).toLowerCase()]}`:match);}
export function monsterSlug(value){return withoutAccents(translatePortraitElements(value)).toLowerCase().replace(/[()]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');}
export function portraitNameKeys(name,element){const slug=monsterSlug(name);if(!slug)return [];const suffix={1:'water',2:'fire',3:'wind',4:'light',5:'dark'}[Number(element)],bare=slug.replace(/_(water|fire|wind|light|dark)$/,'');return [...new Set([slug,...(suffix?[`${bare}_${suffix}`]:[])])];}
