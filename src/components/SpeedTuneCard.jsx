import InfoTooltip from './InfoTooltip';
import TurnTimeline from './TurnTimeline';
import {Compass} from 'lucide-react';
import {teamTurnPreview} from '../core/optimizer';
export default function SpeedTuneCard({team,account,options,builds,manualPreview,manualError}){
 let preview,error;
 try{if(manualError)throw new Error(manualError);preview=manualPreview||teamTurnPreview(account,team,options,builds);}catch(e){error=e.message;}
 return <aside className="speed-tune-widget raw-speed-tune" aria-label={`Speed Tune de ${team.name}`}><header><h3><Compass size={17}/>Timeline de Ticks</h3><InfoTooltip label="Como ler a Timeline de Ticks">Cada bloco marca o primeiro tick em que a barra fica completa, incluindo os eventos e passivas informados. Monstros prontos no mesmo tick ficam juntos; a fila de execução pode fazê-los agir depois. Passe o mouse sobre um avatar para consultar o tick da primeira ação. Ações forçadas aparecem identificadas. Tick 0 representa barra inicial completa.</InfoTooltip></header>
  <span className="speed-source-badge">{manualPreview?'Status manuais':builds?'Build selecionada':'Runas equipadas'}</span>
  {error?<p role="alert" className="tick-unavailable">{error}</p>:!preview?.complete?<div className="speed-pending"><strong>{manualPreview?'Selecione os monstros':'Aguardando equipamento completo'}</strong>{preview?.missing?.map((name,i)=><small key={i}>{name}: {manualPreview?'posição pendente':'build incompleta'}</small>)}</div>:<TurnTimeline preview={preview}/>}
 </aside>;
}
