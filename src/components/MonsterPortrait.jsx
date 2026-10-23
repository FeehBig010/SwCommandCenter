import {useEffect,useState} from 'react';
import {MONSTER_FALLBACK,monsterImageSources,resolveMonsterImageSources} from '../core/monsters';
function Portrait({master,name,element}){
 const [sources,setSources]=useState(()=>monsterImageSources(master)),[attempt,setAttempt]=useState(0),[loaded,setLoaded]=useState(false);
 const src=sources[attempt];
 useEffect(()=>{let live=true;resolveMonsterImageSources(master).then(next=>{if(live&&next.length&&JSON.stringify(next)!==JSON.stringify(sources)){setSources(next);setAttempt(0);setLoaded(false);}});return()=>{live=false;};},[master]);
 return <span className={`avatar monster-portrait element-${element||0} ${loaded?'':'portrait-fallback'}`}>
  <img className="portrait-silhouette" src={MONSTER_FALLBACK} alt={src?'':`Retrato indisponível: ${name||'monstro'}`}  width="48" height="48"/>
  {src&&<img key={src} className={`portrait-photo ${loaded?'is-loaded':''}`} src={src} alt={`Retrato de ${name}`} width="48" height="48" loading="lazy" referrerPolicy="no-referrer" onLoad={()=>setLoaded(true)} onError={()=>{setLoaded(false);setAttempt(n=>n+1);}}/>}
 </span>;
}
export default function MonsterPortrait(props){return <Portrait key={props.master||props.name} {...props}/>;}
