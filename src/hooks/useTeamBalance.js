import {useEffect,useRef,useState} from 'react';
const EMPTY=[];
// A result belongs to exactly one inventory and one set of rules. Editing either
// terminates its worker; a late response can never replace a newer team.
export default function useTeamBalance({account,team,options,reservedIds=EMPTY,allTeams=EMPTY,onApply}){
 const [state,setState]=useState(null),[notice,setNotice]=useState(''),worker=useRef(),generation=useRef(0),scope=useRef();
 const key=JSON.stringify([team,options,reservedIds,allTeams.map(t=>[t.id,t.sourceDeckId,t.priority,t.priorityFocus,t.active,t.configs,t.plannedRunes])]);
 scope.current={account,key};
 useEffect(()=>()=>{generation.current++;worker.current?.terminate();worker.current=null;},[account,key]);
 const current=state?.account===account&&state?.key===key;
 function cancel(){generation.current++;worker.current?.terminate();worker.current=null;setState({account,key,message:'Busca cancelada. A build atual foi mantida.'});}
 function run(proposal){
  if(!account)return;setNotice('');worker.current?.terminate();const token=++generation.current,captured={account,key};let instance;
  setState({account,key,busy:true,validating:!!proposal,report:proposal&&current?state.report:null,selected:proposal&&current?state.selected:null,progress:{percent:0}});
  const live=()=>token===generation.current&&scope.current.account===captured.account&&scope.current.key===captured.key;
  const finish=()=>{instance?.terminate();if(worker.current===instance)worker.current=null;};
  const fail=error=>{if(live())setState({account,key,error});finish();};
  try{
   instance=new Worker(new URL('../core/optimizer.worker.js',import.meta.url),{type:'module'});worker.current=instance;
   instance.onmessage=({data})=>{
    if(!live()){finish();return;}
    if(data.type==='progress'){setState(s=>({...s,progress:data}));return;}
    if(data.type==='result')setState({account,key,report:data.report,selected:null});
    else if(data.type==='validated'){setNotice('Build aplicada nesta calculadora. Equipe as peças indicadas no jogo; seu JSON foi preservado.');onApply(data.plan);setState({account,key,message:'Build aplicada nesta calculadora. Equipe as peças indicadas no jogo; seu JSON foi preservado.'});}
    else {fail(data.message||'Não foi possível concluir a busca.');return;}finish();
   };
   instance.onerror=()=>fail('A busca foi interrompida. Sua build foi preservada. Tente novamente.');
   instance.onmessageerror=()=>fail('Não foi possível receber as alternativas. Tente novamente.');
   instance.postMessage({mode:'balance',type:proposal?'validate':'search',account,team,options,reservedIds,allTeams,...(proposal?{signature:state.report.signature,proposal}:{})});
  }catch{fail('Não foi possível iniciar o motor em segundo plano.');}
 }
 const visible=current?state:{};
 return {message:notice,...visible,search:()=>run(null),cancel,select:index=>{if(current&&!state.busy)setState(s=>({...s,selected:index}));},apply:()=>{const p=visible.report?.alternatives[visible.selected];if(p?.eligible&&!visible.busy)run(p);}};
}
