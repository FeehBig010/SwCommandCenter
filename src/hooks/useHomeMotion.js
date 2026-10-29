import {useLayoutEffect} from 'react';
import {MOTION_SPRING,stepSpring,springAtRest} from '../core/motion';
import {animateMotion,motionAllowed,motionDuration,REDUCED_MOTION} from '../lib/motion-runtime';
const CARDS='.portal-manual,.portal-account,.portal-coupons';
const EDITING='input,select,textarea,[role=listbox],.portal-login-panel';
export default function useHomeMotion(ref){
 useLayoutEffect(()=>{
  const root=ref.current;if(!root)return;
  const animations=[],duration=motionDuration(root,'--motion-home-duration',520),stagger=motionDuration(root,'--motion-stagger-duration',60);
  function enter(node,id,delay=0,distance=12,blur=false){if(!node)return;const frames=[{opacity:.35,translate:`0 ${distance}px`,...(blur?{filter:'blur(2px)'}:{})},{opacity:1,translate:'none',...(blur?{filter:'blur(0px)'}:{})}];const animation=animateMotion(node,frames,{duration,delay,easing:getComputedStyle(root).getPropertyValue('--motion-ease-spring').trim()||'ease-out',fill:'backwards',id:`swcc-home-${id}`});if(animation)animations.push(animation);}
  const desktop=window.matchMedia('(hover: hover) and (pointer: fine)'),reduced=window.matchMedia(REDUCED_MOTION);
  enter(root.querySelector('#portal-title'),'title',0,8);enter(root.querySelector('.portal-speech'),'speech',stagger,8);
  root.querySelectorAll(CARDS).forEach((node,index)=>enter(node,`card-${index}`,stagger*index,14,desktop.matches));
  enter(root.querySelector('.portal-ambient'),'ambient',0,0);
  const states=new Map();let frame=0,lastTime=0,pending=null,current=null;
  function clear(){cancelAnimationFrame(frame);frame=0;lastTime=0;pending=null;current=null;for(const node of states.keys()){node.removeAttribute('data-home-tilt');for(const key of ['--home-x','--home-y','--home-lift'])node.style.removeProperty(key);}states.clear();}
  function neutral(){pending=null;current=null;for(const state of states.values())state.tx=state.ty=state.liftTarget=0;if(states.size&&!frame)frame=requestAnimationFrame(tick);}
  function tick(time){
   frame=0;if(!motionAllowed()||!desktop.matches){clear();return;}
   const dt=lastTime?Math.min((time-lastTime)/1000,.032):1/60;lastTime=time;
   if(pending){const {card,x,y}=pending;pending=null;if(current!==card){for(const state of states.values())state.tx=state.ty=state.liftTarget=0;current=card;}
    if(!states.has(card))states.set(card,{x:{position:0,velocity:0},y:{position:0,velocity:0},lift:{position:0,velocity:0},tx:0,ty:0,liftTarget:1});
    const bounds=card.getBoundingClientRect(),state=states.get(card);state.tx=Math.max(-1,Math.min(1,(x-bounds.left)/bounds.width*2-1));state.ty=Math.max(-1,Math.min(1,1-(y-bounds.top)/bounds.height*2));state.liftTarget=1;card.dataset.homeTilt='true';
   }
   let moving=false;
   for(const [card,state]of states){state.x=stepSpring(state.x.position,state.x.velocity,state.tx,dt,MOTION_SPRING);state.y=stepSpring(state.y.position,state.y.velocity,state.ty,dt,MOTION_SPRING);state.lift=stepSpring(state.lift.position,state.lift.velocity,state.liftTarget,dt,MOTION_SPRING);
    const resting=springAtRest(state.x,state.tx)&&springAtRest(state.y,state.ty)&&springAtRest(state.lift,state.liftTarget);
    if(resting&&!state.liftTarget){card.removeAttribute('data-home-tilt');for(const key of ['--home-x','--home-y','--home-lift'])card.style.removeProperty(key);states.delete(card);continue;}
    card.style.setProperty('--home-x',String(resting?state.tx:state.x.position));card.style.setProperty('--home-y',String(resting?state.ty:state.y.position));card.style.setProperty('--home-lift',String(resting?state.liftTarget:state.lift.position));if(!resting)moving=true;
   }
   if(moving)frame=requestAnimationFrame(tick);else lastTime=0;
  }
  function move(event){if(!desktop.matches||!motionAllowed()||!(event.target instanceof Element))return;const card=event.target.closest(CARDS);if(!card||event.target.closest(EDITING)||card.contains(document.activeElement)&&document.activeElement.matches(EDITING)){neutral();return;}pending={card,x:event.clientX,y:event.clientY};if(!frame)frame=requestAnimationFrame(tick);}
  const preference=()=>{if(reduced.matches||!desktop.matches)clear();},focus=event=>{if(event.target.matches('input,select,textarea'))clear();};
  root.addEventListener('pointermove',move,{passive:true});root.addEventListener('pointerleave',neutral,{passive:true});root.addEventListener('focusin',focus);root.addEventListener('scroll',clear,{capture:true,passive:true});window.addEventListener('resize',clear,{passive:true});document.addEventListener('visibilitychange',clear);desktop.addEventListener('change',preference);reduced.addEventListener('change',preference);
  return()=>{clear();for(const animation of animations)animation.cancel();root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',neutral);root.removeEventListener('focusin',focus);root.removeEventListener('scroll',clear,true);window.removeEventListener('resize',clear);document.removeEventListener('visibilitychange',clear);desktop.removeEventListener('change',preference);reduced.removeEventListener('change',preference);};
 },[ref]);
}
