// Pure URL helpers shared by all portraits and exports. These paths mirror the
// sparse SWARFARM checkout served by Vite or the persistent Node service.
export const LOCAL_GAME_IMAGE_ROOT='/assets/imagens_sw/herders/static/herders/images/';
export const LOCAL_MONSTER_ROOT=`${LOCAL_GAME_IMAGE_ROOT}monsters/`;
export const LOCAL_MONSTER_MANIFEST='/assets/sw-monster-images.json';
export const safePortraitFilename=value=>typeof value==='string'&&/^[a-zA-Z0-9_-][\w.-]*\.(png|jpe?g|webp|gif)$/i.test(value)&&!value.includes('..');
export const localMonsterImage=filename=>safePortraitFilename(filename)?`${LOCAL_MONSTER_ROOT}${filename}`:null;

export const localGameImage=(category,filename)=>['monsters','skills','elements','runes'].includes(category)&&safePortraitFilename(filename)?`${LOCAL_GAME_IMAGE_ROOT}${category}/${filename}`:null;
