import {useEffect,useRef,useState} from 'react';
import {authErrorMessage,requestPasswordReset,recoveryRedirectUrl} from '../lib/password-recovery';
import {Cloud,LogIn,X} from 'lucide-react';
import {supabase,supabaseConfigured,authRedirectUrl} from '../lib/supabase';

export default function PortalLogin({session,account,onIntent,onCancel}){
 const [open,setOpen]=useState(false),[mode,setMode]=useState('login'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const live=useRef(true),emailRef=useRef();
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{if(open&&!session)emailRef.current?.focus();},[open,session]);
 async function submit(event){
  event.preventDefault();setError('');setMessage('');setBusy(true);
  const form=new FormData(event.currentTarget),email=String(form.get('email')).trim(),password=String(form.get('password'));
  try{
   if(mode==='reset'){const message=await requestPasswordReset(supabase,email,recoveryRedirectUrl());if(live.current)setMessage(message);return;}
   const result=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password,options:{emailRedirectTo:authRedirectUrl()}});
   if(result.error)throw result.error;
   if(live.current&&!result.data.session)setMessage('Confira seu e-mail para confirmar o cadastro.');
  }catch(error){if(live.current)setError(authErrorMessage(error,mode));}
  finally{if(live.current)setBusy(false);}
 }
 if(session)return <div className="portal-cloud-ready" role="status"><Cloud size={15}/><span>Nuvem conectada{account?' · backup privado ativo':''}</span></div>;
 return <div className="portal-login">
  {!open?<button type="button" className="portal-cloud-button" onClick={()=>{onIntent?.();setOpen(true);}}><Cloud size={17}/><span>Salvar dados na nuvem (Login/Criar Conta)</span></button>:<section className="portal-login-panel" aria-label="Entrar ou criar conta na nuvem">
   <header><div role="group" aria-label="Tipo de acesso">{[['login','Entrar'],['signup','Criar conta']].map(([key,label])=><button type="button" key={key} disabled={busy} aria-pressed={mode===key} onClick={()=>{setMode(key);setError('');setMessage('');}}>{label}</button>)}</div><button type="button" className="icon-button" title="Fechar login" aria-label="Fechar login" disabled={busy} onClick={()=>{setOpen(false);onCancel?.();}}><X size={15}/></button></header>
   {!supabaseConfigured?<p role="status">O login está indisponível. Você pode importar o JSON e usar a conta neste dispositivo.</p>:<form onSubmit={submit}><fieldset disabled={busy}><label><span>E-mail</span><input ref={emailRef} name="email" type="email" autoComplete="email" required maxLength={254}/></label>{mode!=='reset'&&<label><span>Senha</span><input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='signup'?8:1} maxLength={128} required/></label>}<button type="submit" className="portal-auth-submit"><LogIn size={15}/>{busy?'Aguarde…':mode==='reset'?'Enviar link de recuperação':mode==='login'?'Entrar':'Criar conta'}</button></fieldset></form>}
   {supabaseConfigured&&mode==='login'&&<button type="button" className="text-button" disabled={busy} onClick={()=>{setMode('reset');setError('');setMessage('');}}>Esqueci minha senha</button>}
   {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  </section>}
 </div>;
}
