import {useState,useRef,useEffect} from 'react';
import {supabase} from '../lib/supabase';
import {saveAccountCloud,loadAccountCloud} from '../lib/account-cloud';
export default function AccountCloudControls({account,session,onAccount,onAuth}){
 const active=useRef(session?.user.id),live=useRef(true);active.current=session?.user.id;useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function act(save){const user=session?.user.id;if(!user){onAuth();return;}setBusy(true);setMessage('');try{if(save){await saveAccountCloud(supabase,user,account);if(live.current&&active.current===user)setMessage('Backup privado salvo.');}else{const loaded=await loadAccountCloud(supabase,user);if(live.current&&active.current===user){await onAccount(loaded);if(live.current&&active.current===user)setMessage('Conta carregada da nuvem.');}}}catch(e){if(live.current&&active.current===user)setMessage(e.message);}finally{if(live.current)setBusy(false);}}
 return <div className="account-cloud-controls"><p className="fineprint">Backup opcional do inventário normalizado, privado da sua conta.</p>{supabase?<div className="button-group"><button type="button" className="button" disabled={busy} onClick={()=>act(false)}>{busy?'Aguarde…':'Carregar conta da nuvem'}</button>{account&&<button type="button" className="button" disabled={busy} onClick={()=>act(true)}>Salvar conta na nuvem</button>}</div>:<p className="fineprint">Nuvem ainda não configurada. O upload local funciona normalmente.</p>}{message&&<p role="status" className="fineprint">{message}</p>}</div>;
}
