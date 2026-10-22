import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import {getMyProfile} from '../lib/auth';
export default function useProfile(session){
 const id=session?.user.id||null,active=useRef(id),generation=useRef(0);active.current=id;
 const [state,setState]=useState({id:null,profile:null,loading:!!id,error:''});
 const refresh=useCallback(async()=>{
  const token=++generation.current;if(!id||!supabase){setState({id,profile:null,loading:false,error:''});return;}
  // Session changes and failed checks clear access; the database checks every operation.
  setState(s=>({id,profile:s.id===id?s.profile:null,loading:true,error:''}));
  try{const profile=await getMyProfile(supabase,id);if(token===generation.current&&active.current===id)setState({id,profile,loading:false,error:''});}
  catch(e){if(token===generation.current&&active.current===id)setState({id,profile:null,loading:false,error:e.message});}
 },[id]);
 useEffect(()=>{refresh();if(!id)return;const focus=()=>refresh(),timer=setInterval(refresh,30000);window.addEventListener('focus',focus);supabase?.rpc('touch_my_profile').then(()=>{}).catch(()=>{});return()=>{generation.current++;clearInterval(timer);window.removeEventListener('focus',focus);};},[id,refresh]);
 return {...(state.id===id?state:{profile:null,loading:!!id,error:''}),refresh};
}
