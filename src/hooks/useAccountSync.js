import {useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import {accountSyncController} from '../lib/account-sync';
export default function useAccountSync({userId,ready,onRestore,loginAccount=null}){
 const [status,setStatus]=useState('idle'),restore=useRef(onRestore);restore.current=onRestore;
 const controller=useRef(null);if(!controller.current)controller.current=accountSyncController({client:supabase,onRestore:(a,options)=>restore.current(a,options),onStatus:setStatus});
 const localLogin=useRef(null);localLogin.current=loginAccount;
 useEffect(()=>{if(!ready)return;void controller.current.login(userId||null,{account:localLogin.current});return()=>controller.current.cancel();},[userId,ready]);
 return {status,beginUpload:()=>controller.current.beginUpload(),save:account=>controller.current.upload(account)};
}
