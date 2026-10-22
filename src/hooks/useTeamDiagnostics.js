import {useEffect,useState} from 'react';
export default function useTeamDiagnostics(account,teams,options,reservedIds=[],enabled=true,allTeams=teams){
 const [state,setState]=useState({key:'',reports:{},busy:false});
 const key=JSON.stringify([account?.id,account?.importedAt,teams,options,reservedIds,allTeams.map(t=>[t.id,t.plannedRunes])]);
 useEffect(()=>{
  if(!account||!enabled||!teams.length)return;
  let worker,live=true;const timer=setTimeout(()=>{worker=new Worker(new URL('../core/diagnostics.worker.js',import.meta.url),{type:'module'});setState({key,reports:{},busy:true});worker.onmessage=({data})=>{if(!live)return;if(data.type==='report')setState(s=>({...s,reports:{...s.reports,[data.teamId]:data.report}}));else{setState(s=>({...s,busy:false}));worker.terminate();}};worker.onerror=()=>{if(live)setState({key,reports:Object.fromEntries(teams.map(t=>[t.id,{status:'error',message:'Diagnóstico interrompido; build atual mantida.'}])),busy:false});worker.terminate();};worker.postMessage({account,teams,options,reservedIds,allTeams});},450);
  return()=>{live=false;clearTimeout(timer);worker?.terminate();};
 },[key,enabled]);
 return {reports:state.key===key&&enabled?state.reports:{},busy:enabled&&(state.key!==key||state.busy)};
}
