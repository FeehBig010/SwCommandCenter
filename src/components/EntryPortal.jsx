import {useState} from 'react';
import {ArrowRight,CheckCircle2,CloudUpload,LockKeyhole,Swords} from 'lucide-react';
import PortalLogin from './PortalLogin';
import CouponModule from './CouponModule';
import './EntryPortal.css';

function WelcomeGuide({embedded}){
 return <aside className="portal-guide" aria-label="Boas-vindas da guia"><div className="portal-speech">Saudações, Invocador!<br/>Solte seu arquivo SWEX aqui e eu prepararei a Central para você!</div><img src={embedded?'/art/home/ciri.webp':'/art/portal-ciri.png'} loading={embedded?'lazy':'eager'} alt="Ciri, guia de boas-vindas" width="1024" height="1536" decoding="async" onError={e=>{const img=e.currentTarget;if(!img.dataset.fallback){img.dataset.fallback='true';img.src='/guild-crest.png';}}}/></aside>;
}

export default function EntryPortal({account,session,onQuick,onContinue,onUpload,onFile,onLoginIntent,onLoginCancel,busy,embedded=false}){
 const [dragging,setDragging]=useState(false);
 return <section className={`entry-portal immersive-portal ${embedded?'portal-embedded':''} ${dragging?'is-dragging':''}`}  aria-labelledby={embedded?'home-services-title':'portal-title'} onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();}} onDrop={e=>{e.preventDefault();setDragging(false);if(!busy&&e.dataTransfer.files.length)onFile(e.dataTransfer.files[0]);}}>
  {!embedded&&<><div className="portal-castle" aria-hidden="true"/><div className="portal-shade" aria-hidden="true"/><div className="portal-mist" aria-hidden="true"/><div className="portal-motes" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{'--mote':i}}/>)}</div>
  <header className="portal-brand"><img src="/guild-crest.png" alt="" width="54" height="54"/><span>Clã D8stino · Euro</span></header></>}
  {embedded&&<header className="portal-service-heading"><h2 id="home-services-title">Sua Central de Comando</h2><span>Acesso rápido</span></header>}
  <div className="portal-grid">
  {!embedded&&<WelcomeGuide/>}
  <div className="portal-glass">{!embedded&&<><h1 id="portal-title">Sua Central de Comando</h1><div className="portal-title-rule" aria-hidden="true"><span/></div></>}<div className="portal-paths">
   <article className="portal-manual"><div className="portal-swords" aria-hidden="true"><Swords/></div><h2>Calculadora Livre</h2><p>Monte seu time, sem arquivo ou login.</p><button type="button" className="portal-primary" disabled={busy} onClick={onQuick}>Abrir Calculadora Livre<ArrowRight size={18}/></button></article>
   <article className="portal-account"><h2>Sincronizar Conta Completa</h2><p>Seus monstros, runas e times em um só lugar.</p><div className="portal-sync-content">{embedded&&<WelcomeGuide embedded/>}<div className="portal-sync-controls">{account?<div className="portal-account-confirmed"><CheckCircle2 size={25}/><strong>{account.name}</strong><span>Inventário carregado neste dispositivo</span><button type="button" className="icon-button" title="Atualizar JSON SWEX" aria-label="Atualizar JSON SWEX" disabled={busy} onClick={onUpload}><CloudUpload size={18}/></button></div>:<button type="button" className="portal-dropzone" disabled={busy} onClick={onUpload} onDragEnter={e=>{e.preventDefault();setDragging(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragging(false);}} aria-label="Selecionar arquivo JSON SWEX"><CloudUpload size={39}/><strong>Solte seu JSON SWEX aqui</strong><span>ou selecionar arquivo</span></button>}
    <PortalLogin account={account} session={session} onIntent={onLoginIntent} onCancel={onLoginCancel}/>{account&&<button type="button" className="portal-continue" disabled={busy} onClick={onContinue} title={account.name}>Continuar com {account.name}<ArrowRight size={14}/></button>}
   </div></div></article>
  </div></div>
  <CouponModule/>
  </div>
  <footer className="portal-privacy"><LockKeyhole size={12}/>Inventário processado neste dispositivo</footer>
 </section>;
}
