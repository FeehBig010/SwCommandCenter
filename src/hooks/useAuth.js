import {useEffect,useState} from 'react';
import {supabase,supabaseConfigured} from '../lib/supabase';
export default function useAuth(){
 const [state,setState]=useState({session:null,loading:supabaseConfigured,error:''});
 useEffect(()=>{
  if(!supabase)return;
  let live=true,observed=false;
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{observed=true;if(live)setState({session,loading:false,error:''});});
  supabase.auth.getSession().then(({data,error})=>{if(live&&!observed)setState({session:data.session,loading:false,error:error?'Não foi possível recuperar a sessão. Entre novamente.':''});}).catch(()=>{if(live)setState({session:null,loading:false,error:'Não foi possível recuperar a sessão.'});});
  return()=>{live=false;subscription.unsubscribe();};
 },[]);
 async function signOut(){const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw error;setState({session:null,loading:false,error:''});}
 return {...state,configured:supabaseConfigured,signOut};
}
