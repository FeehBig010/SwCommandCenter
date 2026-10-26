import {useId} from 'react';
import MonsterPortrait from './MonsterPortrait';
import {tickTimeline} from '../core/tick-timeline';
import './TickTimeline.css';
export default function TurnTimeline({preview}){
 const id=useId();if(!preview?.complete)return null;
 const timeline=tickTimeline(preview);
 return <div className="tick-timeline" aria-label="Timeline de Ticks Real">
  <div className="tick-timeline-legend"><span>Alocação temporal · Tick {timeline.start}{timeline.end!==timeline.start?` — Tick ${timeline.end}`:''}</span><span>Combat SPD</span></div>
  {timeline.cells.length>0?<div className="tick-ruler-scroll" tabIndex={0} role="region" aria-label="Régua horizontal de ticks"><ol className="tick-ruler" style={{'--tick-count':timeline.count}}>{timeline.cells.map(cell=><li key={cell.tick} className={`tick-block${cell.members.length?'':' tick-empty'}`} data-tick={cell.tick} style={{gridColumn:`${cell.tick-timeline.start+1} / span ${cell.span}`}} aria-labelledby={`${id}-tick-${cell.tick}`}>
   <h4 id={`${id}-tick-${cell.tick}`}>{cell.span===1?`Tick ${cell.tick}`:`Ticks ${cell.tick}–${cell.end}`}</h4>
   {cell.members.length?<div className="tick-members">{cell.members.map(member=><div className="tick-member" key={member.key} data-actor-key={member.key} title={`${member.name} · ${member.forced?'Ação forçada':'Barra completa'}: Tick ${member.readyTick}${member.actionTick!=null?` · Primeira ação: Tick ${member.actionTick}`:''}`}>
    <MonsterPortrait master={member.master} name={member.name} element={member.master%10}/><strong className="tick-member-name">{member.name}</strong><output className="tick-combat-spd" aria-label={`Combat SPD de ${member.name}`}>{member.spd}</output>{member.enemy&&<small>Inimigo</small>}{member.forced&&<small>Ação forçada</small>}{member.disabled&&<small>Turno sem ação</small>}
   </div>)}</div>:<span className="tick-empty-mark" aria-label="Sem novos monstros com a barra completa">—</span>}
  </li>)}</ol></div>:<p className="tick-unavailable">Sem dados de prontidão neste cenário.</p>}
  {timeline.unallocated.length>0&&<div className="tick-unallocated">{timeline.unallocated.map(actor=><span key={actor.key}>{actor.name}: sem barra completa registrada</span>)}</div>}
 </div>;
}
