import {useEffect,useState} from 'react';
import {MONSTER_FALLBACK,monsterImageSources,resolveMonsterImageSources} from '../core/monsters';
function Portrait({master,name,element}){
 const [sources,setSources]=useState(()=>monsterImageSources(master,{name,element})),[loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false);
 const src=sources[0];
 useEffect(()=>{let live=true;resolveMonsterImageSources(master,{name,element}).then(next=>{if(live&&next.length&&JSON.stringify(next)!==JSON.stringify(sources)){setSources(next);setFailed(false);setLoaded(false);}});return()=>{live=false;};},[master,name,element]);
 return <span className={`avatar monster-portrait element-${element||0} ${loaded&&!failed?'':'portrait-fallback'}`}>
  <img className="portrait-silhouette" src={MONSTER_FALLBACK} alt={src&&!failed?'':`Retrato indisponível: ${name||'monstro'}`} width="48" height="48"/>
  {src&&!failed&&<img key={src} className={`portrait-photo ${loaded?'is-loaded':''}`} src={src} alt={`Retrato de ${name}`} width="48" height="48" loading="lazy" referrerPolicy="no-referrer" onLoad={()=>setLoaded(true)} onError={event=>{event.currentTarget.src=MONSTER_FALLBACK;setLoaded(false);setFailed(true);}}/>}
 </span>;
}
export default function MonsterPortrait(props){return <Portrait key={`${props.master||''}:${props.name||''}`} {...props}/>;}
