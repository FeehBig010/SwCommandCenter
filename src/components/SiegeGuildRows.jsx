import {Copy,Plus,Shield,Swords} from 'lucide-react';
import {siegeComparisonRows} from '../core/siege-central';
import {requiredTurnPlan} from '../core/siege';
import {LABELS,SETS} from '../core/data';
import {orderRuneSets} from '../core/rune-sets';
import MonsterPortrait from './MonsterPortrait';
import {LeaderLabel} from './SiegeCounterComposer';

function Lineup({members,turns=[]}){
 return <div className="siege-row-lineup">{members.map((m,i)=>{
  const tick=Number(m.maxTick)||turns.find(t=>t.key===String(i))?.tick;
  const speed=Number(m.bonusSpd)||Number(m.goals?.spd)||0;
  const bonus=Number(m.bonusSpd)>0||m.basis==='bonus';
  return <div className="siege-row-unit" key={i}>
   <MonsterPortrait master={m.masterId} name={m.label}/><strong>{m.label}</strong>
   <span className="siege-row-speed">{tick?`Tick ${tick}`:'Tick —'}{speed?` · ${bonus?'+':''}${speed} SPD`:Number(m.combatSpd)>0?` · ${m.combatSpd} SPD combate`:''}</span>
   <small>{Object.entries(m.goals||{}).filter(([key,value])=>key!=='spd'&&Number(value)>0).map(([key,value])=>`${LABELS[key]} ${m.basis==='bonus'&&!['cr','cd','res','acc'].includes(key)?'+':''}${Number(value).toLocaleString('pt-BR')}`).join(' · ')}</small>
   <div className="siege-sets">{orderRuneSets(m.sets||[]).filter(id=>SETS[id]).map((id,j)=><img key={j} className="rune-set-icon" src={`/game-icons/runes/${SETS[id].toLowerCase()}.png`} alt={SETS[id]} title={SETS[id]}/>)}</div>
  </div>;
 })}</div>;
}

export default function SiegeGuildRows({records,feedback,onCopy,onAdd,onInspect,onReact,account,busy,feedbackBusy}){
 const rows=siegeComparisonRows(records);
 return <section className="siege-comparisons" aria-label="Counters da guilda — Defesa versus Ataque">
  <header className="siege-comparisons-heading"><div><h2>Counters e Compartilhamento</h2><p>{rows.length} defesas e composições · {records.filter(r=>r.team.mode==='attack').length} ataques</p></div></header>
  {!rows.length&&<p className="siege-empty-list">Nenhuma composição corresponde aos filtros. Importe modelos ou conecte sua guilda.</p>}
  {rows.map(row=><article className="siege-comparison-row" key={row.key} aria-label={`Defesa versus Ataque — ${row.name}`}>
   <section className="siege-row-defense" aria-label="Defesa inimiga">
    <header><span className="eyebrow"><Shield size={14}/>DEFESA</span><h3>{row.members.length?row.name:'Defesa não informada'}</h3></header>
    {row.members.length?<><LeaderLabel leader={row.leader}/><Lineup members={row.members}/></>:<p className="fineprint">{row.record.row?.target_defense||'Ataque compartilhado sem uma defesa vinculada.'}</p>}
    <div className="button-group">{row.members.length>0&&<button type="button" className="button small" disabled={busy} onClick={()=>onAdd(row)}><Plus size={14}/>Adicionar Counter</button>}{row.record.team.mode==='defense'&&<button type="button" className="button small" onClick={()=>onInspect(row.record)}>Ver metas da defesa</button>}</div>
   </section>
   <section className="siege-row-attacks" aria-label="Ataques recomendados">
    {!row.attacks.length&&<div className="siege-row-no-counter"><Swords size={24}/><p>Nenhum counter registrado para esta defesa.</p></div>}
    {row.attacks.map(record=>{
     const f=record.counter?feedback(record):null,rate=f?.winRate??null;
     return <article className="siege-row-attack" key={record.key} aria-label={`Ataque — ${record.name}`}>
      <header><div><span className="eyebrow"><Swords size={14}/>ATAQUE / COUNTER</span><h3>{record.name}</h3></div><span className={`siege-rate-badge ${rate===null?'unknown':rate===100?'perfect':rate>=80?'good':'low'}`} title={f?`${f.total} relato(s) de vitória ou derrota · ${f.scope==='guild'?'Guilda':'Registro local'}`:'Sem resultados registrados'}>{rate===null?'Sem partidas':`${rate}% win`}</span></header>
      <p className="siege-row-author">Registrado por {f?.author||'Membro da guilda'}{f?.scope==='device'?' · registro local':''}{record.cloud&&record.row?.moderation_status==='pending'?' · Pendente de aprovação':''}</p>
      <LeaderLabel leader={record.team.leader}/><Lineup members={record.team.configs} turns={record.counter?requiredTurnPlan(record.counter):[]}/>
      <footer><button type="button" className="button primary" disabled={busy||!account} onClick={()=>onCopy(record)} title={!account?'Importe seu SWEX para sincronizar a composição':undefined}><Copy size={15}/>Copiar para Mim</button><button type="button" className="button small" onClick={()=>onInspect(record)}>Ver detalhes</button>
      {f&&<div className="siege-row-results" aria-label={`Meu resultado — ${record.name}`}>{[['win','Vitória'],['loss','Derrota']].map(([value,label])=><button key={value} type="button" className="button small" aria-pressed={f.outcome===value} disabled={feedbackBusy||!f.available} onClick={()=>onReact(record,'outcome',f.outcome===value?null:value)}>{label}</button>)}<small>{f.total} relato(s){f.scope==='device'?' · local':''}</small></div>}</footer>
     </article>;
    })}
   </section>
  </article>)}
 </section>;
}
