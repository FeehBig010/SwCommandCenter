import {useEffect,useRef,useState} from 'react';
export default function useDashboardAnalysis(account,teams,options,reservedIds=[]){
 const [state,setState]=useState(null),[attempt,setAttempt]=useState(0),generation=useRef(0),reservedKey=JSON.stringify(reservedIds);
 useEffect(()=>{
  if(!account)return;
  const request=++generation.current;let worker,live=true;
  const timer=setTimeout(()=>{
   try{
    worker=new Worker(new URL('../core/dashboard.worker.js',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{if(live&&request===generation.current)setState({account,teams,options,reservedKey,attempt,report:data.type==='result'?data.report:null,error:data.type!=='result'});worker.terminate();};
    worker.onerror=()=>{if(live&&request===generation.current)setState({account,teams,options,reservedKey,attempt,error:true});worker.terminate();};
    worker.postMessage({account,context:{teams,options,reservedIds}});
   }catch{if(live)setState({account,teams,options,reservedKey,attempt,error:true});}
  },0);
  return()=>{live=false;generation.current++;clearTimeout(timer);worker?.terminate();};
 },[account,teams,options,reservedKey,attempt]);
 const current=state?.account===account&&state?.teams===teams&&state?.options===options&&state?.reservedKey===reservedKey&&state?.attempt===attempt;
 return {report:current?state.report:null,busy:!!account&&!current,error:current&&state.error,retry:()=>setAttempt(n=>n+1)};
}
