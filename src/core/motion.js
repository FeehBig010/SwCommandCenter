// UI physics only. No game attributes, timers or optimizer progress are derived here.
export const MOTION_SPRING=Object.freeze({stiffness:280,damping:30,mass:1});
export const MOTION_REST=Object.freeze({distance:.001,velocity:.01});
export function stepSpring(position,velocity,target,seconds,settings=MOTION_SPRING){
 const dt=Math.min(.032,Math.max(0,Number(seconds)||0));
 if(!dt)return {position,velocity};
 const acceleration=(settings.stiffness*(target-position)-settings.damping*velocity)/settings.mass;
 const nextVelocity=velocity+acceleration*dt;
 return {position:position+nextVelocity*dt,velocity:nextVelocity};
}
export function springAtRest(state,target){return Math.abs(state.position-target)<MOTION_REST.distance&&Math.abs(state.velocity)<MOTION_REST.velocity;}
export function parseMotionDuration(value,fallback=180){const number=parseFloat(value);return Number.isFinite(number)&&number>=0?number*(String(value).trim().endsWith('ms')?1:1000):fallback;}
