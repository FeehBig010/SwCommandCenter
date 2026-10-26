import InfoTooltip from './InfoTooltip';
import TurnTimeline from './TurnTimeline';
import {Compass} from 'lucide-react';
import {teamTurnPreview} from '../core/optimizer';
import {siegeAccountTimeline} from '../core/siege-timeline';
export default function SpeedTuneCard({team,account,options,builds,manualPreview,manualError,sourceLabel}){
 let preview,error;
 try{if(manualError)throw new Error(manualError);preview=manualPreview||(team.gameMode==='siege'&&team.enemyDefense?.length?siegeAccountTimeline(account,team,options,builds):teamTurnPreview(account,team,options,builds));}catch(e){error=e.message;}
 return <aside className="speed-tune-widget raw-speed-tune" aria-label={`Speed Tune de ${team.name}`}><header><h3><Compass size={17}/>Timeline de Ticks</h3><InfoTooltip label="Como ler a Timeline de Ticks">Cada bloco marca o primeiro tick em que a barra fica completa, incluindo os eventos e passivas informados. Monstros prontos no mesmo tick ficam juntos; a fila de execução pode fazê-los agir depois. Passe o mouse sobre um avatar para consultar o tick da primeira ação. Ações forçadas aparecem identificadas. Tick 0 representa barra inicial completa. Marcadores de defesa com “Tick esperado” são referências salvas, sem SPD inferida; não participam da simulação.</InfoTooltip></header>
  <span className="speed-source-badge">{sourceLabel||(manualPreview?'Status manuais':builds?'Build selecionada':'Runas equipadas')}</span>
  {error?<p role="alert" className="tick-unavailable">{error}</p>:!preview?.complete?<div className="speed-pending"><strong>{manualPreview?'Selecione os monstros':'Aguardando equipamento completo'}</strong>{preview?.missing?.map((name,i)=><small key={i}>{name}: {manualPreview?'posição pendente':'build incompleta'}</small>)}</div>:<TurnTimeline preview={preview}/>}
  {preview?.unknownDefense?.length>0&&<p className="tick-unavailable">Defesa sem SPD/Tick informado: {preview.unknownDefense.join(', ')}.</p>}
  {preview?.complete&&preview.missing?.length>0&&<p className="tick-unavailable">Ausentes no SWEX: {preview.missing.join(', ')}.</p>}
 </aside>;
}
