import {useEffect,useRef,useState} from 'react';
export default function AnimatedNumber({value}){
 const target=Number(value),previous=useRef(0),[display,setDisplay]=useState(0),[changed,setChanged]=useState(false);
 useEffect(()=>{const from=previous.current;previous.current=target;if(from===target)return;if(!Number.isFinite(target)||matchMedia('(prefers-reduced-motion: reduce)').matches){setDisplay(target);return;}let frame;const start=performance.now();setChanged(target>from);function tick(now){const ratio=Math.min(1,(now-start)/500);setDisplay(Math.round(from+(target-from)*(1-(1-ratio)**3)));if(ratio<1)frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[target]);
 return <span className={changed?'stat-level-up':''} aria-label={String(target)}>{Number(display).toLocaleString('pt-BR')}</span>;
}
