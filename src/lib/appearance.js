export const APPEARANCE_KEY='swcc-appearance-mode-v1';
export const APPEARANCE_MODES=Object.freeze(['office','war']);
export function readAppearance(storage){try{const value=(storage||globalThis.localStorage)?.getItem(APPEARANCE_KEY);return APPEARANCE_MODES.includes(value)?value:'war';}catch{return 'war';}}
let current=readAppearance();const listeners=new Set();
export const getAppearance=()=>current;
function emit(){for(const listener of listeners)listener();}
function storageChanged(event){if(event.key!==APPEARANCE_KEY&&event.key!==null)return;const next=readAppearance();if(next!==current){current=next;emit();}}
export function subscribeAppearance(listener){listeners.add(listener);if(listeners.size===1&&typeof window!=='undefined')window.addEventListener('storage',storageChanged);return()=>{listeners.delete(listener);if(!listeners.size&&typeof window!=='undefined')window.removeEventListener('storage',storageChanged);};}
export function setAppearance(mode,storage){
 if(!APPEARANCE_MODES.includes(mode))return false;
 try{(storage||globalThis.localStorage)?.setItem(APPEARANCE_KEY,mode);}catch{/* A blocked preference store never prevents using the UI. */}
 if(mode!==current){current=mode;emit();}return true;
}
