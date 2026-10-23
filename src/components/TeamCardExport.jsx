import TeamShare from './TeamShare';
import {useEffect,useRef,useState} from 'react';
import {ImageDown,LoaderCircle} from 'lucide-react';
import {createTeamCard} from '../core/team-card';

// All team-image buttons share the same print template and capture pipeline.
// QR/link sharing retains its independent compact composition payload.
export default function TeamCardExport({team,account,builds=null,options={}}){
 const [heading,setHeading]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),request=useRef();
 useEffect(()=>setHeading(''),[team.id,team.gameMode,team.dungeon,team.sourceDungeon]);
 useEffect(()=>()=>request.current?.abort(),[]);
 const exportTeam=heading?{...team,exportContext:{...team.exportContext,title:heading}}:team,card=createTeamCard(exportTeam,account);
 async function exportCard(){
  if(!card||request.current)return;
  const controller=new AbortController();request.current=controller;setBusy(true);setMessage('');
  try{const {exportTeamInfographic}=await import('../core/quick-card-png');await exportTeamInfographic(exportTeam,account,controller.signal,{builds,options});if(!controller.signal.aborted)setMessage('Infográfico pronto para compartilhar.');}
  catch(error){if(!controller.signal.aborted)setMessage(error.message||'Não foi possível gerar o infográfico. Tente novamente.');}
  finally{if(!controller.signal.aborted){request.current=null;setBusy(false);}}
 }
 return <div className="team-png-export">{card&&<TeamShare team={team} account={account}/>}
  <details className="export-context"><summary>Contexto do card</summary><label className="field"><span>Objetivo/chefe PvE ou uso/counter PvP</span><input maxLength={200} disabled={busy} aria-label={`Título de exportação de ${team.name}`} placeholder={card?.heading.title||'Título automático'} value={heading} onChange={e=>setHeading(e.target.value)}/></label></details>
  <button type="button" className="button small" aria-label={`Exportar card PNG de ${team.name}`} aria-busy={busy} disabled={!card||busy} title={card?'Baixar infográfico do time em alta resolução':'Selecione todos os monstros incluídos para exportar'} onClick={exportCard}>{busy?<LoaderCircle className="spin" size={15}/>:<ImageDown size={15}/>} {busy?'Gerando infográfico…':'Exportar card (PNG)'}</button>
  {!card&&<span className="fineprint">Selecione todos os monstros incluídos.</span>}
  {message&&<span className="png-export-message" role="status">{message}</span>}
 </div>;
}
