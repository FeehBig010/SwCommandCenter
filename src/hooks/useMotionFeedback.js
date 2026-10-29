import {useEffect,useRef} from 'react';
import {animateMotion,motionDuration} from '../lib/motion-runtime';
// Render the new value first. Never count between or postpone real statistics.
export default function useMotionFeedback(ref,value){
 const previous=useRef(value),animation=useRef(null);
 useEffect(()=>{if(Object.is(previous.current,value)||!ref.current)return;previous.current=value;if(animation.current?.playState==='running')return;animation.current=animateMotion(ref.current,[{opacity:.62},{opacity:1}],{duration:motionDuration(ref.current,'--motion-feedback-duration',160),easing:'ease-out',id:'swcc-value-feedback'});},[ref,value]);
 useEffect(()=>()=>animation.current?.cancel(),[]);
}
