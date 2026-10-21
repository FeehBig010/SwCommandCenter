import { useState } from 'react';
import { monsterImageSources } from '../core/monsters';

function Portrait({master,name,element}){
 const [attempt,setAttempt]=useState(0);
 const sources=monsterImageSources(master);
 return <span className={`avatar monster-portrait element-${element||0} ${sources[attempt]?'':'portrait-fallback'}`}>
  {sources[attempt]?<img src={sources[attempt]} alt={`Retrato de ${name}`} width="48" height="48" loading="lazy" referrerPolicy="no-referrer" onError={()=>setAttempt(n=>n+1)}/>:<span role="img" aria-label={`Retrato indisponível: ${name}`}>{name?.[0]||'?'}</span>}
 </span>;
}
export default function MonsterPortrait(props){
 return <Portrait key={props.master||props.name} {...props}/>;
}
