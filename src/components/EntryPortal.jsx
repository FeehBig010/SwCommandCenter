import {useState} from 'react';
import {ArrowRight,Calculator,CheckCircle2,CloudUpload,Database,Gauge,Home,LockKeyhole,Sparkles,Swords,Compass} from 'lucide-react';
import {homeSummary} from '../core/home-summary';
import PortalLogin from './PortalLogin';
import CouponModule from './CouponModule';
import './EntryPortal.css';
const MODULES=[
 ['portal','Início','Resumo da conta e próximos passos',Home],
 ['siege','Siege Center','Ataques, defesas e preparação',Swords],
 ['optimizer','Rune Optimizer','Distribua runas para seus times',Compass],
 ['rune-intelligence','Rune Intelligence','Revise oportunidades nas runas',Sparkles],
 ['quick','Calculadora de Velocidade','Confira a ordem de ação do time',Gauge],
];
export default function EntryPortal({account,session,onQuick,onContinue,onUpload,onFile,onLoginIntent,onLoginCancel,busy,onNavigate,lastWorkspace=null}){
 const [dragging,setDragging]=useState(false),summary=homeSummary(account);
 const navigate=key=>onNavigate?.(key);
 return <section className={`entry-portal premium-home ${dragging?'is-dragging':''}`} aria-labelledby="portal-title" onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();}} onDrop={e=>{e.preventDefault();setDragging(false);if(!busy&&e.dataTransfer.files.length)onFile(e.dataTransfer.files[0]);}}>
  <header className="home-heading"><div><span className="home-eyebrow">Clã D8stino · Central do Invocador</span><h1 id="portal-title">Sua Central de Comando</h1><p>Prepare sua conta, retome seus planos e escolha a próxima ferramenta.</p></div><span className="home-local-badge"><LockKeyhole size={14}/>Processamento local</span></header>
  <section className="home-card home-summary" aria-label="Resumo da conta"><div className="home-card-heading"><div><span className="home-eyebrow">Snapshot da conta</span><h2 id="home-account-title">{summary?summary.name:'Seu inventário começa aqui'}</h2></div><span className={`home-state ${summary?'is-ready':''}`}><CheckCircle2 size={15}/>{summary?summary.isDemo?'Conta Demo · dados fictícios':'Inventário carregado':'SWEX pendente'}</span></div>
   {summary?<><div className="home-account-meta"><span>{summary.id?`ID ${summary.id}`:'ID não informado'}</span>{summary.guild&&<span>{summary.guild}</span>}<span>{summary.importedAt?<>Importado em <time dateTime={summary.importedAt}>{new Date(summary.importedAt).toLocaleString('pt-BR')}</time></>:'Data de importação não informada'}</span></div><dl className="home-inventory-counts"><div><dt>Monstros</dt><dd>{summary.units.toLocaleString('pt-BR')}</dd></div><div><dt>Runas</dt><dd>{summary.runes.toLocaleString('pt-BR')}</dd></div><div><dt>Artefatos</dt><dd>{summary.artifacts.toLocaleString('pt-BR')}</dd></div></dl><p className="home-note">Dados do último JSON importado. O inventário não acompanha alterações no jogo em tempo real.</p></>:<p>Importe seu JSON SWEX para consultar monstros, runas e artefatos neste dispositivo. A Calculadora Livre já está disponível.</p>}
  </section>
  <nav className="home-modules" aria-label="Módulos principais">{MODULES.map(([key,label,description,Icon])=><button type="button" key={key} aria-label={label} disabled={busy} className="home-module home-card" onClick={()=>navigate(key)}><Icon size={22}/><strong>{label}</strong><span>{description}</span><ArrowRight size={16} className="home-module-arrow"/></button>)}</nav>
  <div className="home-import-layout">
   <aside className="portal-guide home-card" aria-label="Boas-vindas da guia"><div className="portal-speech"><span className="home-eyebrow">Ciri · sua guia</span><h2>Saudações, Invocador!</h2><p>Solte seu arquivo SWEX aqui e eu prepararei a Central para você!</p></div><img src="/art/portal-ciri.png" alt="Ciri, guia de boas-vindas" width="1024" height="1536" decoding="async" onError={e=>{const img=e.currentTarget;if(!img.dataset.fallback){img.dataset.fallback='true';img.src='/guild-crest.png';}}}/></aside>
   <article className="portal-account home-card" aria-labelledby="home-sync-title"><div className="home-card-heading"><div><span className="home-eyebrow">Dados e nuvem</span><h2 id="home-sync-title">Sincronizar Conta Completa</h2></div><Database size={22}/></div><p>Seus monstros, runas e times em um só lugar.</p><button type="button" className="portal-dropzone" disabled={busy} onClick={onUpload} onDragEnter={e=>{e.preventDefault();setDragging(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragging(false);}} aria-label="Selecionar arquivo JSON SWEX"><CloudUpload size={28}/><strong>{account?'Atualizar JSON SWEX':'Solte seu JSON SWEX aqui'}</strong><span>ou selecionar arquivo</span></button><PortalLogin account={account} session={session} onIntent={onLoginIntent} onCancel={onLoginCancel}/></article>
  </div>
  <div className="home-work-grid"><article className="home-card home-continuity" aria-labelledby="home-continuity-title"><span className="home-eyebrow">Seu trabalho</span><h2 id="home-continuity-title">Continue de onde parou</h2><p>{lastWorkspace?`Seu último módulo foi ${lastWorkspace.label}.`:account?'Seu inventário está pronto para a próxima análise.':'Carregue sua conta para preparar seus próximos planos.'}</p>{lastWorkspace?<button type="button" className="portal-primary" disabled={busy} onClick={()=>navigate(lastWorkspace.key)}>Continuar em {lastWorkspace.label}<ArrowRight size={16}/></button>:account?<button type="button" className="portal-primary" disabled={busy} onClick={onContinue} title={account.name}>Continuar com {account.name}<ArrowRight size={16}/></button>:<span className="home-note">Seus planos ficam disponíveis nas ferramentas da Central.</span>}</article>
  <article className="portal-manual home-card" aria-labelledby="home-calculator-title"><span className="home-eyebrow">Acesso livre</span><h2 id="home-calculator-title"><Calculator size={20}/>Calculadora Livre</h2><p>Monte seu time e confira a velocidade, sem arquivo ou login.</p><button type="button" className="portal-primary" disabled={busy} onClick={onQuick}>Abrir Calculadora Livre<ArrowRight size={18}/></button></article></div>
  <CouponModule/>
  <footer className="portal-privacy"><LockKeyhole size={12}/>Inventário processado neste dispositivo · backup privado com login</footer>
 </section>;
}
