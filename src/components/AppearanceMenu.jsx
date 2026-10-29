import {useLayoutEffect,useRef} from 'react';
import {BriefcaseBusiness,Palette,Swords} from 'lucide-react';
import useAppearance from '../hooks/useAppearance';
import {setAppearance} from '../lib/appearance';
export function AppearanceRoot(){
 const mode=useAppearance();
 useLayoutEffect(()=>{const root=document.documentElement,previous=root.getAttribute('data-appearance');root.dataset.appearance=mode;return()=>{if(previous===null)root.removeAttribute('data-appearance');else root.setAttribute('data-appearance',previous);};},[mode]);
 return null;
}
export default function AppearanceMenu(){
 const mode=useAppearance(),details=useRef(null);
 function close(){details.current.open=false;details.current.querySelector('summary').focus();}
 return <details ref={details} className="appearance-menu" data-export-ignore onKeyDown={event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();close();}}}><summary className="icon-button" aria-label={`Aparência: ${mode==='office'?'Office':'War'}`} title="Aparência da Central"><Palette size={17}/><span>{mode==='office'?'Office':'War'}</span></summary><div className="appearance-options" data-motion-skip role="group" aria-label="Modo visual"><button type="button" aria-pressed={mode==='office'} onClick={()=>{setAppearance('office');close();}}><BriefcaseBusiness size={17}/><span><strong>Office</strong><small>Luz discreta · foco nos dados</small></span></button><button type="button" aria-pressed={mode==='war'} onClick={()=>{setAppearance('war');close();}}><Swords size={17}/><span><strong>War</strong><small>Ouro e violeta · atmosfera de Siege</small></span></button></div></details>;
}
