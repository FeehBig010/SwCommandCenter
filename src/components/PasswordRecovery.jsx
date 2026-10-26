import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {supabase} from '../lib/supabase';
import {authErrorMessage,saveRecoveredPassword} from '../lib/password-recovery';
export default function PasswordRecovery({onComplete,onCancel}){
 const dialog=useRef(),live=useRef(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{live.current=true;dialog.current.showModal();return()=>{live.current=false;};},[]);
 async function submit(e){e.preventDefault();const data=new FormData(e.currentTarget),password=String(data.get('password')),confirm=String(data.get('confirm'));if(password!==confirm){setError('As senhas não coincidem.');return;}setBusy(true);setError('');try{await saveRecoveredPassword(supabase,password,confirm);if(live.current)onComplete();}catch(error){if(live.current)setError(authErrorMessage(error,'update'));}finally{if(live.current)setBusy(false);}}
 async function cancel(){setBusy(true);try{await onCancel();}catch{if(live.current){setError('Não foi possível encerrar a recuperação. Tente novamente.');setBusy(false);}}}
 return createPortal(<dialog ref={dialog} className="auth-modal" aria-labelledby="password-reset-title" onCancel={e=>{e.preventDefault();if(!busy)cancel();}}><div className="auth-modal-content"><h2 id="password-reset-title">Criar nova senha</h2><form onSubmit={submit}><fieldset disabled={busy}><label className="field"><span>Nova senha</span><input autoFocus name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128}/></label><label className="field"><span>Confirmar nova senha</span><input name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={128}/></label><button className="button primary" type="submit">{busy?'Salvando…':'Salvar nova senha'}</button><button className="text-button" type="button" onClick={cancel}>Cancelar recuperação</button></fieldset></form>{error&&<p role="alert" className="notice warning">{error}</p>}</div></dialog>,document.body);
}
