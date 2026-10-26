import {teamTurnPreview} from '../core/optimizer';
import TurnTimeline from './TurnTimeline';
import InfoTooltip from './InfoTooltip';
export default function PveTeamTimeline({account,team,options,builds}){let preview;try{if(account)preview=teamTurnPreview(account,team,options,builds);}catch{}return preview?.complete?<div className="energy-timeline-panel pve-timeline"><header><strong>Timeline de Ticks</strong><InfoTooltip label="Regras dos ticks PvE">Primeiro tick de barra completa no cenário de equipamento, incluindo os eventos informados. Avatares no mesmo bloco ficaram prontos juntos; a execução dos turnos pode ocorrer depois.</InfoTooltip></header><TurnTimeline preview={preview}/></div>:null;}
