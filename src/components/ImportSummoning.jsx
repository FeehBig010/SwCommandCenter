import './ImportSummoning.css';
import {useEffect,useRef} from 'react';
export default function ImportSummoning({progress,phase,cinematic=false}){
 const dialog=useRef();
 useEffect(()=>{const before=document.activeElement;dialog.current?.focus();return()=>{if(before?.isConnected)before.focus();};},[]);
 return <div ref={dialog} tabIndex={-1} className={`swex-loading-overlay ${cinematic?'summoning-overlay':''}`} role="dialog" aria-modal="true" aria-label="Processando inventário" onKeyDown={event=>{if(event.key==='Tab')event.preventDefault();}}>
  <div className="swex-loading-rune" aria-hidden="true"><span>✦</span></div>
  <div className="swex-loading-progress"><h2>{cinematic?'Invocando sua Central':'Extraindo dados do SWEX'}</h2><progress aria-label={cinematic?'Progresso da preparação da Central':'Progresso da extração SWEX'} value={progress} max="100"/><strong className="summoning-percent">{progress}%</strong><p aria-live="polite" aria-atomic="true">{phase}</p></div>
 </div>;
}
