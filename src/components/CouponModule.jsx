import {useEffect,useRef,useState} from 'react';
import {Check,Copy,ExternalLink,Gift,RefreshCw} from 'lucide-react';
import {activeCoupons,COUPON_SOURCE_PAGE,COUPON_EVENTS_URL,COUPON_MAX_AGE} from '../core/game-coupons';
import {fetchActiveCoupons,visibleCoupons,copyCouponCode,couponRedeemUrl,COUPON_COPY_DURATION} from '../lib/coupons.js';
import {supabase} from '../lib/supabase';
import InfoTooltip from './InfoTooltip';
import CouponReward from './CouponReward';
import snapshot from '../core/coupon-snapshot.json';
import './CouponModule.css';

function Coupon({coupon}){
 const [copied,setCopied]=useState(false),[error,setError]=useState(''),[copying,setCopying]=useState(false),timer=useRef(),codeRef=useRef(),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;clearTimeout(timer.current);};},[]);
 async function copy(){
  setError('');setCopying(true);clearTimeout(timer.current);
  try{await copyCouponCode(coupon.code);if(live.current){setCopied(true);timer.current=setTimeout(()=>setCopied(false),COUPON_COPY_DURATION);}}
  catch{if(live.current){setCopied(false);setError('Selecione o código acima para copiar.');codeRef.current?.focus();codeRef.current?.select();}}
  finally{if(live.current)setCopying(false);}
 }
 return <article className="coupon-entry" aria-label={`Cupom ${coupon.code}`}>
  <div className="coupon-provenance"><span>{coupon.origin==='community'?'Comunidade':'Curadoria da Central'}</span><time dateTime={coupon.checkedAt} title="Última consulta da fonte">{new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(coupon.checkedAt))}</time></div>
  <label className="coupon-code-label"><span>Código</span><input ref={codeRef} className="coupon-code" aria-label={`Código ${coupon.code}`} value={coupon.code} readOnly onFocus={e=>e.target.select()}/></label>
  <div className="coupon-rewards" aria-label="Recompensas">{coupon.rewards.length?coupon.rewards.map(reward=><CouponReward key={reward.type} reward={reward}/>):<span className="coupon-reward"><Gift size={24}/>Recompensas no resgate</span>}</div>
  <div className="coupon-actions"><button type="button" className={`coupon-copy${copied?' copied':''}`} disabled={copying} onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>}<span>{copied?'Copiado! ✓':copying?'Copiando…':'Copiar Código'}</span></button>
  <div className="coupon-redeem-row"><a className="coupon-redeem" href={couponRedeemUrl()} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>Resgatar no Jogo</a><InfoTooltip label="Resgate no iPhone e iOS">O resgate é feito pela Com2uS. No iPhone ou iPad, utilize este portal Web da Hive para informar sua conta e inserir o código. Este site não solicita sua senha Hive nem confirma o resgate.</InfoTooltip></div>
  <a className="coupon-app-link coupon-redeem" href={couponRedeemUrl(coupon.code,{inGame:true})} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>Abrir no app<small>Link Hive · requer o jogo instalado</small></a></div>
  <span className={`coupon-feedback${error?' copy-error':''}`} role="status">{error|| (copied?`${coupon.code} copiado!`:'')}</span>
 </article>;
}

export default function CouponModule(){
 const [feed,setFeed]=useState(()=>({coupons:activeCoupons(snapshot).map(c=>({...c,origin:'community'})),source:'snapshot',stale:true})),[now,setNow]=useState(Date.now),[status,setStatus]=useState('loading'),[refresh,setRefresh]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let live=true;
  setStatus('loading');fetchActiveCoupons({client:supabase,signal:controller.signal}).then(data=>{if(live){setFeed(data);setNow(Date.now());setStatus(data.stale?'offline':'ready');}}).catch(()=>{if(live){setFeed({coupons:[],source:'snapshot',stale:true});setStatus('offline');setNow(Date.now());}});
  const timer=setTimeout(()=>controller.abort(),12000);return()=>{live=false;clearTimeout(timer);controller.abort();};
 },[refresh]);
 useEffect(()=>{const clock=setInterval(()=>setNow(Date.now()),60000),poll=setInterval(()=>setRefresh(n=>n+1),15*60000);return()=>{clearInterval(clock);clearInterval(poll);};},[]);
 useEffect(()=>{
  const deadline=Math.min(...feed.coupons.map(c=>c.expiresAt?Date.parse(c.expiresAt):Date.parse(c.checkedAt)+COUPON_MAX_AGE).filter(t=>t>now));
  const timer=Number.isFinite(deadline)?setTimeout(()=>setNow(Date.now()),Math.min(2147483647,Math.max(1,deadline-Date.now()+1))):null;
  const focus=()=>setNow(Date.now());window.addEventListener('focus',focus);return()=>{clearTimeout(timer);window.removeEventListener('focus',focus);};
 },[feed,now]);
 const coupons=visibleCoupons(feed.coupons,now),checkedAt=coupons.reduce((latest,c)=>c.checkedAt>latest?c.checkedAt:latest,'');
 const monthParts=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).formatToParts(now),month=`${monthParts.find(p=>p.type==='month').value} · ${monthParts.find(p=>p.type==='year').value}`;
 return <aside className="portal-coupons" aria-labelledby="portal-coupon-title">
  <header><h2 id="portal-coupon-title">CÓDIGOS &amp; EVENTOS ATIVOS <span aria-hidden="true">🎁</span></h2><p className="coupon-month">{month}<InfoTooltip label="Origem e confirmação dos cupons">Os códigos vêm da comunidade ou da curadoria da Central. Essas fontes não registram confirmação oficial por código; a última consulta não garante validade no jogo. Os links de resgate e de eventos são oficiais da Com2uS.</InfoTooltip></p></header>
  <div className="coupon-list" aria-busy={status==='loading'}>
   {coupons.map(coupon=><Coupon key={coupon.code} coupon={coupon}/>)}
   {!coupons.length&&<div className="coupon-empty" role="status"><Gift size={35} aria-hidden="true"/><p>{status==='loading'?'Consultando os códigos vigentes…':status==='offline'?'Não foi possível consultar os códigos agora.':'Não há cupons ativos nas fontes consultadas.'}</p></div>}
  </div>
  <div className="coupon-source"><span>{status==='loading'?'Atualizando…':checkedAt?<>Última consulta em <time dateTime={checkedAt}>{new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(checkedAt))}</time>{status==='offline'?' · última consulta disponível':''}</>:null}</span>{feed.source==='supabase'?<span>Cupons da Central · Supabase</span>:<a href={COUPON_SOURCE_PAGE} target="_blank" rel="noopener noreferrer">{feed.source==='mixed'?'Supabase + comunidade':'Fonte da comunidade'}</a>}<button type="button" className="coupon-refresh" disabled={status==='loading'} onClick={()=>setRefresh(n=>n+1)} aria-label="Atualizar cupons" title="Atualizar cupons"><RefreshCw size={14}/></button></div>
  <a className="coupon-events" href={COUPON_EVENTS_URL} target="_blank" rel="noopener noreferrer">Eventos oficiais Com2uS<ExternalLink size={14}/></a>
 </aside>;
}
