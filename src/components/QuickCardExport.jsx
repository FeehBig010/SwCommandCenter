import {useEffect,useRef,useState} from 'react';
import {ImageDown,LoaderCircle} from 'lucide-react';
export default function QuickCardExport({team,target,onBusyChange}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),request=useRef();
 useEffect(()=>()=>request.current?.abort(),[]);
 async function save(){
  const controller=new AbortController();request.current=controller;setBusy(true);onBusyChange(true);setMessage('');
  try{const {exportQuickCard}=await import('../core/quick-card-png');await exportQuickCard(target.current,team,controller.signal);if(!controller.signal.aborted)setMessage('PNG pronto para compartilhar.');}
  catch(e){if(!controller.signal.aborted)setMessage(e.message||'Não foi possível exportar. Tente novamente.');}
  finally{if(!controller.signal.aborted){setBusy(false);onBusyChange(false);}}
 }
 return <div className="quick-export-action"><button type="button" className="button primary export-card-primary" onClick={save} disabled={busy||team.configs.some(c=>!c.masterId)} aria-busy={busy} title="Baixar monstros e Speed Tune em PNG">{busy?<LoaderCircle size={18} className="spin"/>:<ImageDown size={18}/>} {busy?'Gerando PNG…':'Exportar Card'}</button>{message&&<span role="status" className="fineprint">{message}</span>}</div>;
}
