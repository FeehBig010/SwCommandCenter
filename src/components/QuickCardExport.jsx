import {useEffect,useRef,useState} from 'react';
import {useAccount} from '../contexts/AccountContext';
import {ImageDown,LoaderCircle} from 'lucide-react';
export default function QuickCardExport({team,onBusyChange}){
 const account=useAccount()?.account;
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),request=useRef();
 useEffect(()=>()=>request.current?.abort(),[]);
 async function save(){
  if(request.current)return;
  const controller=new AbortController();request.current=controller;setBusy(true);onBusyChange(true);setMessage('');
  try{const {exportQuickCard}=await import('../core/quick-card-png');await exportQuickCard(team,account,controller.signal);if(!controller.signal.aborted)setMessage('Infográfico pronto para compartilhar.');}
  catch(e){if(!controller.signal.aborted)setMessage(e.message||'Não foi possível exportar. Tente novamente.');}
  finally{request.current=null;if(!controller.signal.aborted){setBusy(false);onBusyChange(false);}}
 }
 return <div className="quick-export-action"><button type="button" className="button primary export-card-primary" onClick={save} disabled={busy||team.configs.some(c=>!c.masterId)} aria-busy={busy} title="Baixar guia do time em PNG de alta resolução">{busy?<LoaderCircle size={18} className="spin"/>:<ImageDown size={18}/>} {busy?'Gerando infográfico…':'Exportar Card'}</button>{message&&<span role="status" className="fineprint">{message}</span>}</div>;
}
