import {teamTurnPreview} from '../core/optimizer';
import TurnTimeline from './TurnTimeline';
import InfoTooltip from './InfoTooltip';
export default function PveTeamTimeline({account,team,options,builds}){let preview;try{if(account)preview=teamTurnPreview(account,team,options,builds);}catch{}return preview?.complete?<div className="energy-timeline-panel pve-timeline"><header><strong>Ordem de turnos</strong><InfoTooltip label="Regras dos ticks PvE">Primeira rotação do cenário de equipamento. Não modela as mecânicas específicas de cada chefe nem garante o clear.</InfoTooltip></header><TurnTimeline preview={preview}/></div>:null;}
