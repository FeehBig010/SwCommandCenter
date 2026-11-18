import MotionValue from './MotionValue';
import {useId} from 'react';
import MonsterPortrait from './MonsterPortrait';
import {tickTimeline,tickCardsFromPreview} from '../core/tick-timeline';
import {COMBAT_EVENTS} from '../core/speedTuner';
import './TickTimeline.css';

export default function TurnTimeline({preview,showTickCards=true}){
 const id=useId();if(!preview?.complete)return null;
 const timeline=tickTimeline(preview);
 const peanuts=tickCardsFromPreview(preview);
 return <div className="tick-timeline" aria-label="Timeline de Ticks Real">
  {showTickCards&&peanuts.cards.length>0&&<div className={`peanuts-sync-banner ${peanuts.synced?'is-synced':'is-cut'}`} role="status">
   <strong>{peanuts.statusMessage}</strong>
  </div>}
  <div className="tick-timeline-legend"><span>Alocação temporal · Tick {timeline.start}{timeline.end!==timeline.start?` — Tick ${timeline.end}`:''}</span><span>Combat SPD</span></div>
  {timeline.cells.length>0?<div className="tick-ruler-scroll" tabIndex={0} role="region" aria-label="Régua horizontal de ticks"><ol className="tick-ruler" style={{'--tick-count':timeline.count}}>{timeline.cells.map(cell=><li key={cell.tick} className={`tick-block${cell.members.length?'':' tick-empty'}`} data-tick={cell.tick} style={{gridColumn:`${cell.tick-timeline.start+1} / span ${cell.span}`}} aria-labelledby={`${id}-tick-${cell.tick}`}>
   <h4 id={`${id}-tick-${cell.tick}`}>{cell.span===1?`Tick ${cell.tick}`:`Ticks ${cell.tick}–${cell.end}`}</h4>
   {cell.members.length?<div className="tick-members">{cell.members.map(member=><div className={`tick-member${member.enemy?' tick-enemy':''}${member.referenceOnly?' tick-reference':''}`} key={member.key} data-actor-key={member.key} title={`${member.name} · ${member.referenceOnly?'Referência esperada, sem SPD informada':member.forced?'Ação forçada':'Barra completa'}: Tick ${member.readyTick}${member.actionTick!=null?` · Primeira ação: Tick ${member.actionTick}`:''}`}>
    <MonsterPortrait master={member.master} name={member.name} element={member.master%10}/><strong className="tick-member-name">{member.name}</strong><MotionValue value={member.spd} className="tick-combat-spd" aria-label={`Combat SPD de ${member.name}`}>{member.spd??'—'}</MotionValue>{member.enemy&&<small>{member.referenceOnly?'Defesa · Tick esperado':'Defesa · cenário'}</small>}{member.forced&&<small>Ação forçada</small>}{member.disabled&&<small>Turno sem ação</small>}
   </div>)}</div>:<span className="tick-empty-mark" aria-label="Sem novos monstros com a barra completa">—</span>}
  </li>)}</ol></div>:<p className="tick-unavailable">Sem dados de prontidão neste cenário.</p>}
  {timeline.unallocated.length>0&&<div className="tick-unallocated">{timeline.unallocated.map(actor=><span key={actor.key}>{actor.name}: sem barra completa registrada</span>)}</div>}
  {showTickCards&&peanuts.cards.length>0&&<div className="peanuts-tick-cards-section" aria-label="Simulação detalhada de barra de ataque por tick">
   <div className="tick-timeline-legend"><span>Progressão da Barra de Ataque (ATB %) · Estilo 00peanuts</span><span>Verde = Aliados · Vermelho = Inimigo</span></div>
   <div className="peanuts-tick-cards-grid">
    {peanuts.cards.map(card=><div key={card.tick} className={`peanuts-tick-card ${card.actingEnemy?'enemy-turn':card.actingKey?'ally-turn':''}`}>
     <header className="peanuts-tick-card-header">
      <strong>ETAPA #{card.tick}</strong>
      {card.actingName&&<span className={`peanuts-turn-badge ${card.actingEnemy?'is-enemy':'is-ally'}`}>Turno: {card.actingName}</span>}
     </header>
     <ul className="peanuts-tick-bars-list">
      {card.bars.map(b=><li key={b.key} className={`peanuts-tick-bar-row ${b.enemy?'is-enemy':'is-ally'} ${b.acted?'is-acting':''}`}>
       <span className="peanuts-bar-name">{b.name} <small>({Number(b.spd.toFixed(2))} SPD{b.spdPost!==b.spd?` → ${Number(b.spdPost.toFixed(2))}`:''})</small></span>
       <span className="peanuts-bar-value">{b.atb.toFixed(1)}%</span>
       <div className="peanuts-bar-track"><div className="peanuts-bar-fill" style={{width:`${Math.min(100,Math.max(0,b.atb))}%`}}/></div>
      </li>)}
     </ul>
     {!!card.events?.length&&<div className="peanuts-tick-events"><strong>Eventos resolvidos</strong>{card.events.map((event,i)=><p key={i}>{preview.actors?.find(a=>a.key===event.source)?.name||'Cenário'} · {COMBAT_EVENTS[event.type]||event.type}{event.type==='buffs'?` · ${event.amount} buffs`:['boost','reduce','tiana','damage','heal','leo_attack'].includes(event.type)&&event.amount!=null?` · ${event.amount}%`:event.type==='speed_buff'?' · +30% antes dos ajustes de artefatos':event.type==='slow'?' · −30%':''}</p>)}</div>}
    </div>)}
   </div>
   {peanuts.truncated&&<p role="status">A captura alcançou o limite de ticks. Consulte a régua de primeiras ações; a lista não representa todo o combate.</p>}
  </div>}
 </div>;
}
