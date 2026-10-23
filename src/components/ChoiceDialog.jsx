import {useEffect,useRef} from 'react';
export default function ChoiceDialog({message,onYes,onNo,children}){
 const ref=useRef();
 useEffect(()=>{const previous=document.activeElement;ref.current?.querySelector('button')?.focus();return()=>previous?.focus();},[]);
 return <div className="choice-backdrop"><section ref={ref} className="choice-dialog" role="dialog" aria-modal="true" aria-labelledby="choice-message" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();onNo();}if(e.key==='Tab'){const nodes=[...ref.current.querySelectorAll('button:not(:disabled),input,textarea')],index=nodes.indexOf(document.activeElement);if(e.shiftKey&&index===0||!e.shiftKey&&index===nodes.length-1){e.preventDefault();nodes[e.shiftKey?nodes.length-1:0]?.focus();}}}}><h2 id="choice-message">{message}</h2>{children}<div className="button-group"><button className="button primary" type="button" onClick={onYes}>Sim</button><button className="button" type="button" onClick={onNo}>Não</button></div></section></div>;
}
