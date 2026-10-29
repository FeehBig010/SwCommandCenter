import {parseMotionDuration} from '../core/motion';
export const REDUCED_MOTION='(prefers-reduced-motion: reduce), (forced-colors: active)';
const running=new Set();let preference;
export function motionAllowed(){return typeof window!=='undefined'&&!window.matchMedia(REDUCED_MOTION).matches&&!document.hidden;}
export function motionDuration(node,token,fallback){return parseMotionDuration(getComputedStyle(node).getPropertyValue(token).trim(),fallback);}
function cancelOnPreference(){if(preference?.matches)for(const animation of [...running])animation.cancel();}
// Only one preference listener, and only while a finite animation is active.
export function animateMotion(node,frames,options){
 if(!node?.animate||!motionAllowed())return null;
 const animation=node.animate(frames,options);if(options.id)animation.id=options.id;
 if(!running.size){preference=window.matchMedia(REDUCED_MOTION);preference.addEventListener('change',cancelOnPreference);}
 running.add(animation);
 const cleanup=()=>{running.delete(animation);if(!running.size){preference?.removeEventListener('change',cancelOnPreference);preference=null;}};
 animation.addEventListener('finish',cleanup,{once:true});animation.addEventListener('cancel',cleanup,{once:true});return animation;
}
