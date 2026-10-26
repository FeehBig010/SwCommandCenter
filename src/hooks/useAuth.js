import {useEffect,useRef,useState} from 'react';
import {supabase,supabaseConfigured} from '../lib/supabase';
import {RECOVERY_SESSION_KEY,authErrorMessage} from '../lib/password-recovery';
const recoveryUser=()=>{try{return sessionStorage.getItem(RECOVERY_SESSION_KEY);}catch{return null;}};
function rememberRecovery(id){try{if(id)sessionStorage.setItem(RECOVERY_SESSION_KEY,id);else sessionStorage.removeItem(RECOVERY_SESSION_KEY);}catch{}}
function cleanRecoveryUrl(){const url=new URL(location.href);url.searchParams.delete('auth');url.searchParams.delete('code');url.searchParams.delete('error');url.searchParams.delete('error_code');url.searchParams.delete('error_description');if(/access_token|refresh_token|error=/.test(url.hash))url.hash='/portal';history.replaceState(null,'',url);}
export default function useAuth(){
 const recoveryIntent=useRef(false);
 const [state,setState]=useState({session:null,loading:supabaseConfigured,error:'',recovery:false});
 useEffect(()=>{
  if(!supabase)return;
  let live=true,observed=false;
  const url=new URL(location.href),callbackError=url.searchParams.get('error_code')||new URLSearchParams(url.hash.slice(1)).get('error_code');
  recoveryIntent.current=url.searchParams.get('auth')==='recovery'&&!callbackError;
  if(callbackError){cleanRecoveryUrl();setState(s=>({...s,error:authErrorMessage({code:callbackError},'update')}));}
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{observed=true;if(session&&(event==='PASSWORD_RECOVERY'||recoveryIntent.current&&['SIGNED_IN','INITIAL_SESSION'].includes(event))){rememberRecovery(session.user.id);recoveryIntent.current=false;}if(event==='SIGNED_OUT')rememberRecovery(null);if(live)setState(previous=>({session,loading:false,error:previous.error,recovery:!!session&&recoveryUser()===session.user.id}));});
  supabase.auth.getSession().then(({data,error})=>{if(data.session&&!error&&recoveryIntent.current){rememberRecovery(data.session.user.id);recoveryIntent.current=false;}if(live&&!observed)setState(previous=>({session:data.session,loading:false,error:error?'Não foi possível recuperar a sessão. Entre novamente.':previous.error,recovery:!!data.session&&recoveryUser()===data.session.user.id}));}).catch(()=>{if(live)setState({session:null,loading:false,error:'Não foi possível recuperar a sessão.',recovery:false});});
  return()=>{live=false;subscription.unsubscribe();};
 },[]);
 async function signOut(){const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw error;rememberRecovery(null);setState({session:null,loading:false,error:'',recovery:false});}
 function completeRecovery(){recoveryIntent.current=false;rememberRecovery(null);cleanRecoveryUrl();setState(s=>({...s,recovery:false,error:''}));}
 async function cancelRecovery(){await signOut();cleanRecoveryUrl();}
 // A recovery link cannot implicitly restore private cloud inventory before the
 // password flow completes. updateUser uses the authenticated SDK session.
 return {...state,session:state.recovery?null:state.session,passwordRecovery:state.recovery,completeRecovery,cancelRecovery,configured:supabaseConfigured,signOut};
}
