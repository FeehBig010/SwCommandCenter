export const PRIMARY_LABELS=Object.fromEntries([['portal','Início'],['siege','Siege Center'],['optimizer','Rune Optimizer'],['rune-intelligence','Rune Intelligence'],['quick','Calculadora de Velocidade']]);
export const PRIMARY_PAGES=Object.keys(PRIMARY_LABELS);
export const SECONDARY_GROUPS=[{id:'tools',label:'Outras ferramentas',pages:['dashboard','saved','workshop','guild-intelligence','updates','about']},{id:'modes',label:'Outros modos de jogo',pages:['arena','rta','cairos','dimensional','rift','toa']},{id:'account',label:'Conta e dados',pages:['swex','inventory']}];
export const SIDEBAR_PREFERENCE_KEY='swcc:sidebar:v1';
export const LAST_WORKSPACE_KEY='swcc:last-workspace:v1';
export const NAV_KEYS=new Set([...PRIMARY_PAGES,...SECONDARY_GROUPS.flatMap(g=>g.pages),'admin']);
export function sidebarCollapsed(storage){try{storage=storage===undefined?globalThis.localStorage:storage;return storage?.getItem(SIDEBAR_PREFERENCE_KEY)==='collapsed';}catch{return false;}}
export function saveSidebarPreference(collapsed,storage){try{storage=storage===undefined?globalThis.localStorage:storage;storage?.setItem(SIDEBAR_PREFERENCE_KEY,collapsed?'collapsed':'expanded');}catch{}}
export function readLastWorkspace(storage){try{storage=storage===undefined?globalThis.localStorage:storage;const key=storage?.getItem(LAST_WORKSPACE_KEY);return NAV_KEYS.has(key)&&!['portal','admin'].includes(key)?key:null;}catch{return null;}}
export function saveLastWorkspace(key,storage){try{storage=storage===undefined?globalThis.localStorage:storage;if(NAV_KEYS.has(key)&&!['portal','admin'].includes(key))storage?.setItem(LAST_WORKSPACE_KEY,key);}catch{}}
export function routePage({pathname='',hash=''}={}){let key=hash.replace(/^#\/?/,'').split(/[/?]/)[0];if(['guild','guild-center'].includes(key))key='siege';if(!key)key=/^\/admin(?:\/|$)/.test(pathname)?'admin':'portal';return NAV_KEYS.has(key)?key:'portal';}
export function pageUrl(page,current){const url=new URL(current);if(/^\/admin(?:\/|$)/.test(url.pathname)&&page!=='admin')url.pathname='/';url.hash='/'+(NAV_KEYS.has(page)?page:'portal');return url.pathname+url.search+url.hash;}
