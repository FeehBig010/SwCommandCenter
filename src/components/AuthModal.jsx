import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {LogIn,X} from 'lucide-react';
import {supabase,supabaseConfigured,authRedirectUrl} from '../lib/supabase';
export default function AuthModal({onClose}){
 const [mode,setMode]=useState('login'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const dialog=useRef(),live=useRef(true);
 useEffect(()=>{live.current=true;const previous=document.activeElement;dialog.current?.showModal();return()=>{live.current=false;previous?.focus();};},[]);
 async function submit(event){
  event.preventDefault();setError('');setMessage('');setBusy(true);
  const data=new FormData(event.currentTarget),email=String(data.get('email')).trim(),password=String(data.get('password'));
  try{const response=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password,options:{emailRedirectTo:authRedirectUrl()}});if(response.error)throw response.error;if(!live.current)return;if(response.data.session)onClose();else setMessage('Confira seu e-mail para confirmar o cadastro.');}
  catch{if(live.current)setError(mode==='login'?'Não foi possível entrar. Confira os dados ou tente novamente.':'Não foi possível criar a conta. Confira os dados e a configuração do projeto.');}
  finally{if(live.current)setBusy(false);}
 }
 async function discord(){setError('');setBusy(true);try{const {error}=await supabase.auth.signInWithOAuth({provider:'discord',options:{redirectTo:authRedirectUrl(),scopes:'identify email'}});if(error)throw error;}catch{if(live.current)setError('Não foi possível abrir o Discord. Confira se o provedor está habilitado no Supabase.');}finally{if(live.current)setBusy(false);}}
 return createPortal(<dialog ref={dialog} className="auth-modal" aria-labelledby="auth-title" onCancel={event=>{event.preventDefault();onClose();}} onClick={e=>{if(e.target===dialog.current)onClose();}}><div className="auth-modal-content"><header><h2 id="auth-title"><LogIn size={21}/> {mode==='login'?'Entrar na central':'Criar conta'}</h2><button type="button" className="icon-button" aria-label="Fechar autenticação" onClick={onClose}><X size={20}/></button></header>
 {!supabaseConfigured?<p className="notice">A nuvem ainda não está configurada. O otimizador local continua disponível. Peça à liderança para ativar a nuvem.</p>:<><p className="fineprint">Sincronize composições e recomendações. Seu arquivo SWEX permanece neste dispositivo.</p><form onSubmit={submit}><fieldset disabled={busy}><label className="field"><span>E-mail</span><input autoFocus name="email" type="email" autoComplete="email" required maxLength={254}/></label><label className="field"><span>Senha</span><input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='signup'?8:1} maxLength={128}/></label><button type="submit" className="button primary">{busy?'Aguarde…':mode==='login'?'Entrar com e-mail':'Criar conta'}</button></fieldset></form><button className="button discord-login" type="button" disabled={busy} onClick={discord}>Entrar com Discord</button><button className="text-button" type="button" disabled={busy} onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');setMessage('');}}>{mode==='login'?'Ainda não tenho conta':'Já tenho conta'}</button></>}
 {error&&<p role="alert" className="notice warning">{error}</p>}{message&&<p role="status" className="notice">{message}</p>}</div></dialog>,document.body);
}
