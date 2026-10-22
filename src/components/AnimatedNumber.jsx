import {useEffect,useRef,useState} from 'react';
export default function AnimatedNumber({value}){
 const target=Number(value),current=useRef(target),[display,setDisplay]=useState(target),[changed,setChanged]=useState(false);
 useEffect(()=>{const from=current.current;if(from===target)return;if(!Number.isFinite(target)||matchMedia('(prefers-reduced-motion: reduce)').matches){current.current=target;setDisplay(target);return;}let frame;const start=performance.now();setChanged(target>from);function tick(now){const ratio=Math.min(1,(now-start)/500),next=Math.round(from+(target-from)*(1-(1-ratio)**3));current.current=next;setDisplay(next);if(ratio<1)frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[target]);
 return <span className={changed?'stat-level-up':''} aria-label={String(target)}>{Number(display).toLocaleString('pt-BR')}</span>;
}
