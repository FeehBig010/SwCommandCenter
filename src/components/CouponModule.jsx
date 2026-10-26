import {useEffect,useRef,useState} from 'react';
import {Check,Coins,Copy,ExternalLink,Gift,Gem,ScrollText,Zap,RefreshCw} from 'lucide-react';
import {activeCoupons,fetchCouponHistory,COUPON_SOURCE_PAGE,COUPON_REDEEM_URL,COUPON_EVENTS_URL} from '../core/game-coupons';
import snapshot from '../core/coupon-snapshot.json';
import './CouponModule.css';

const REWARD_ICONS={mana:Coins,energy:Zap,crystal:Gem};
function Reward({reward}){
 const Icon=REWARD_ICONS[reward.type]||ScrollText;
 return <span className="coupon-reward">{reward.type==='wind'?<img src="/game-icons/rewards/wind-scroll.png" alt="" width="40" height="40"/>:<Icon size={25} aria-hidden="true"/>}<span><b>{reward.amount.toLocaleString('pt-BR')}</b> {reward.label}</span></span>;
}
function Coupon({coupon}){
 const [copied,setCopied]=useState(false),[error,setError]=useState(''),[copying,setCopying]=useState(false),timer=useRef(),codeRef=useRef(),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;clearTimeout(timer.current);};},[]);
 async function copy(){
  setError('');setCopying(true);clearTimeout(timer.current);
  try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(coupon.code);if(live.current){setCopied(true);timer.current=setTimeout(()=>setCopied(false),2500);}}
  catch{if(live.current){setCopied(false);setError('Selecione o código acima para copiar.');codeRef.current?.focus();codeRef.current?.select();}}
  finally{if(live.current)setCopying(false);}
 }
 return <article className="coupon-entry" aria-label={`Cupom ${coupon.code}`}>
  <label className="coupon-code-label"><span>Código</span><input ref={codeRef} className="coupon-code" aria-label={`Código ${coupon.code}`} value={coupon.code} readOnly onFocus={e=>e.target.select()}/></label>
  <div className="coupon-rewards" aria-label="Recompensas">{coupon.rewards.length?coupon.rewards.map(reward=><Reward key={reward.type} reward={reward}/>):<span className="coupon-reward"><Gift size={24}/>Recompensas no resgate</span>}</div>
  <button type="button" className={`coupon-copy${copied?' copied':''}`} disabled={copying} onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>}<span>{copied?'Copiado! ✓':copying?'Copiando…':'Copiar Código'}</span></button>
  <a className="coupon-redeem" href={COUPON_REDEEM_URL} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>Resgatar no Jogo</a>
  <span className={`coupon-feedback${error?' copy-error':''}`} role="status">{error|| (copied?`${coupon.code} copiado!`:'')}</span>
 </article>;
}

export default function CouponModule(){
 const [history,setHistory]=useState(snapshot),[now,setNow]=useState(Date.now),[status,setStatus]=useState('loading'),[refresh,setRefresh]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let live=true;
  setStatus('loading');fetchCouponHistory({signal:controller.signal}).then(data=>{if(live){setHistory(data);setNow(Date.now());setStatus('ready');}}).catch(()=>{if(live){setStatus('offline');setNow(Date.now());}});
  const timer=setTimeout(()=>controller.abort(),10000);return()=>{live=false;clearTimeout(timer);controller.abort();};
 },[refresh]);
 useEffect(()=>{const clock=setInterval(()=>setNow(Date.now()),60000),poll=setInterval(()=>setRefresh(n=>n+1),15*60000);return()=>{clearInterval(clock);clearInterval(poll);};},[]);
 const coupons=activeCoupons(history,now),checkedAt=coupons.reduce((latest,c)=>c.checkedAt>latest?c.checkedAt:latest,'');
 const monthParts=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).formatToParts(now),month=`${monthParts.find(p=>p.type==='month').value} · ${monthParts.find(p=>p.type==='year').value}`;
 return <aside className="portal-coupons" aria-labelledby="portal-coupon-title">
  <header><h2 id="portal-coupon-title">CÓDIGOS &amp; EVENTOS ATIVOS <span aria-hidden="true">🎁</span></h2><p className="coupon-month">{month}</p></header>
  <div className="coupon-list" aria-busy={status==='loading'}>
   {coupons.map(coupon=><Coupon key={coupon.code} coupon={coupon}/>)}
   {!coupons.length&&<div className="coupon-empty" role="status"><Gift size={35} aria-hidden="true"/><p>{status==='loading'?'Consultando os códigos vigentes…':status==='offline'?'Não foi possível consultar os códigos agora.':'Nenhum cupom ativo confirmado no momento.'}</p></div>}
  </div>
  <div className="coupon-source"><span>{status==='loading'?'Atualizando…':checkedAt?<>Verificado em <time dateTime={checkedAt}>{new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(new Date(checkedAt))}</time>{status==='offline'?' · última consulta disponível':''}</>:null}</span><a href={COUPON_SOURCE_PAGE} target="_blank" rel="noopener noreferrer">Fonte da comunidade</a><button type="button" className="coupon-refresh" disabled={status==='loading'} onClick={()=>setRefresh(n=>n+1)} aria-label="Atualizar cupons" title="Atualizar cupons"><RefreshCw size={14}/></button></div>
  <a className="coupon-events" href={COUPON_EVENTS_URL} target="_blank" rel="noopener noreferrer">Eventos oficiais Com2uS<ExternalLink size={14}/></a>
 </aside>;
}
