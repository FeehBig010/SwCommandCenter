import {useEffect,useRef,useState} from 'react';
const EMPTY=[];
export default function useAttackTradeoffs({account,team,options,reservedIds=EMPTY,allTeams=EMPTY,settings,onApply}){
 const [state,setState]=useState(null),worker=useRef(),generation=useRef(0),scope=useRef();
 const key=JSON.stringify([team,options,reservedIds,allTeams.map(t=>[t.id,t.mode,t.gameMode,t.siegeMode,t.sourceDeckId,t.sourceMeta,t.plannedRunes]),settings]);
 scope.current={account,key};
 useEffect(()=>()=>{generation.current++;worker.current?.terminate();worker.current=null;},[account,key]);
 const current=state?.account===account&&state?.key===key;
 function stop(){generation.current++;worker.current?.terminate();worker.current=null;setState({account,key,busy:false,message:'Busca cancelada. A build atual foi mantida.'});}
 function run(proposal){
  if(!account)return;
  worker.current?.terminate();const token=++generation.current,captured={account,key};let instance;
  setState({account,key,busy:true,validating:!!proposal,report:proposal&&current?state.report:null,progress:{percent:0,message:proposal?'Revalidando inventário, conjuntos e Ticks…':'Lendo as fichas do SWEX…'}});
  const live=()=>token===generation.current&&scope.current.account===captured.account&&scope.current.key===captured.key;
  const fail=message=>{if(live())setState({account,key,busy:false,error:message});instance?.terminate();if(worker.current===instance)worker.current=null;};
  try{
   instance=new Worker(new URL('../core/attack-tradeoffs.worker.js',import.meta.url),{type:'module'});worker.current=instance;
   instance.onmessage=({data})=>{
    if(!live())return;
    if(data.type==='progress'){setState(s=>({...s,progress:data}));return;}
    if(data.type==='result')setState({account,key,busy:false,report:data.report});
    else if(data.type==='validated'){try{onApply(data.plan);}catch{fail('Não foi possível aplicar a alternativa. Faça uma nova busca.');return;}setState({account,key,busy:false,message:'Plano aplicado localmente. Equipe as runas indicadas no jogo; o SWEX foi preservado.'});}
    else{fail(data.message||'Não foi possível concluir o diagnóstico. Tente novamente.');return;}
    instance.terminate();if(worker.current===instance)worker.current=null;
   };
   instance.onerror=()=>fail('A busca foi interrompida. A build atual foi mantida. Tente novamente.');
   instance.onmessageerror=()=>fail('Não foi possível receber o diagnóstico. Tente novamente.');
   instance.postMessage({type:proposal?'validate':'search',account,team,options,reservedIds,allTeams,settings,...(proposal?{signature:state.report.signature,proposal}:{})});
  }catch{fail('Não foi possível iniciar a busca em segundo plano. Tente novamente.');}
 }
 return {...(current?state:{}),search:()=>run(null),apply:proposal=>{if(current&&!state.busy&&state.report?.proposals.includes(proposal))run(proposal);},cancel:stop};
}
