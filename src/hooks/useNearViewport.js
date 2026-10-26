import {useEffect,useRef,useState} from 'react';
export default function useNearViewport(){
 const ref=useRef(null),[near,setNear]=useState(false);
 useEffect(()=>{if(near)return;if(typeof IntersectionObserver==='undefined'){setNear(true);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setNear(true);observer.disconnect();}},{rootMargin:'200px'});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[near]);
 return [ref,near];
}
