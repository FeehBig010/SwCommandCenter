import {useMemo,useState} from 'react';
import SiegeAccountTimeline from './SiegeAccountTimeline';
import {siegeKillRanks,siegeCounterContext} from '../core/siege-search';
import {Copy,Plus,Shield,Swords,ChevronDown} from 'lucide-react';
import {siegeComparisonRows} from '../core/siege-central';
import {LABELS,SETS} from '../core/data';
import {orderRuneSets} from '../core/rune-sets';
import MonsterPortrait from './MonsterPortrait';
import {LeaderLabel} from './SiegeCounterComposer';

function Lineup({members,ranks=[]}){
 return <div className="siege-row-lineup">{members.map((m,i)=>{
  const tick=Number(m.maxTick);
  const speed=Number(m.bonusSpd)||Number(m.goals?.spd)||0;
  const bonus=Number(m.bonusSpd)>0||m.basis==='bonus';
  return <div className="siege-row-unit" key={i}>
   <span className="siege-focus-portrait"><MonsterPortrait unit_master_id={m.masterId} name={m.label}/>{ranks[i]!=null&&<b className="siege-focus-rank" aria-label={`${ranks[i]}º alvo: ${m.label}`}>{ranks[i]}</b>}</span><strong>{m.label}</strong>
   {(tick>0||speed>0||Number(m.combatSpd)>0)&&<span className="siege-row-speed">{tick>0?`Tick esperado ${tick}`:''}{speed?`${tick?' · ':''}Meta ${bonus?'+':''}${speed} SPD`:Number(m.combatSpd)>0?`${tick?' · ':''}Meta ${m.combatSpd} Combat SPD`:''}</span>}
   <small>{Object.entries(m.goals||{}).filter(([key,value])=>key!=='spd'&&Number(value)>0).map(([key,value])=>`${LABELS[key]} ${m.basis==='bonus'&&!['cr','cd','res','acc'].includes(key)?'+':''}${Number(value).toLocaleString('pt-BR')}`).join(' · ')}</small>
   <div className="siege-sets">{orderRuneSets(m.sets||[]).filter(id=>SETS[id]).map((id,j)=><img key={j} className="rune-set-icon" src={`/game-icons/runes/${SETS[id].toLowerCase()}.png`} alt={SETS[id]} title={SETS[id]}/>)}</div>
  </div>;
 })}</div>;
}

function CounterAttack({record,feedback,onCopy,onInspect,onReact,account,busy,feedbackBusy,active,onActivate,options,defenseMembers}){
 const f=record.counter?feedback(record):null,rate=f?.winRate??null;
 const contextual=useMemo(()=>siegeCounterContext(record,defenseMembers),[record,defenseMembers]);
 return <article className={`siege-row-attack${active?' active-counter':''}`} aria-label={`Ataque — ${record.name}`}>
  <header><div><span className="eyebrow"><Swords size={14}/>ATAQUE / COUNTER</span><h3>{record.name}</h3></div><span className={`siege-rate-badge ${rate===null?'unknown':rate===100?'perfect':rate>=80?'good':'low'}`} title={f?`${f.total} relato(s) de vitória ou derrota · ${f.scope==='guild'?'Guilda':'Registro local'}`:'Sem resultados registrados'}>{rate===null?'Sem partidas':`${rate}% win`}</span></header>
  <p className="siege-row-author">Registrado por {f?.author||'Membro da guilda'}{f?.scope==='device'?' · registro local':''}{record.cloud&&record.row?.moderation_status==='pending'?' · Pendente de aprovação':''}</p>
  <LeaderLabel leader={record.team.leader}/><Lineup members={record.team.configs}/>
  {record.counter&&<button type="button" className="button small siege-counter-focus" aria-pressed={active} onClick={onActivate}>Ver foco e ticks deste ataque</button>}
  <footer><button type="button" className="button primary" disabled={busy||!account} onClick={()=>onCopy(contextual)} title={!account?'Importe seu SWEX para sincronizar a composição':undefined}><Copy size={15}/>Copiar para Mim</button><button type="button" className="button small" onClick={()=>onInspect(contextual)}>Ver detalhes</button>
  {f&&<div className="siege-row-results" aria-label={`Meu resultado — ${record.name}`}>{[['win','Vitória'],['loss','Derrota']].map(([value,label])=><button key={value} type="button" className="button small" aria-pressed={f.outcome===value} disabled={feedbackBusy||!f.available} onClick={()=>onReact(record,'outcome',f.outcome===value?null:value)}>{label}</button>)}<small>{f.total} relato(s){f.scope==='device'?' · local':''}</small></div>}</footer>
 </article>;

}

export default function SiegeGuildRows({records=[],rows:providedRows,feedback,onCopy,onAdd,onInspect,onReact,account,busy,feedbackBusy,options}){
 const [activeKey,setActiveKey]=useState(null);
 const rows=providedRows||siegeComparisonRows(records);
 return <section className="siege-comparisons" aria-label="Counters da guilda — Defesa versus Ataque">
  <header className="siege-comparisons-heading"><div><h2>Counters e Compartilhamento</h2></div></header>
  {!rows.length&&<p className="siege-empty-list">Nenhuma composição corresponde aos filtros. Importe modelos ou conecte sua guilda.</p>}
  {rows.map(row=>{const active=row.attacks.find(r=>r.key===activeKey)||row.attacks[0],ranks=siegeKillRanks(row.members,active?.counter);return <article className="siege-comparison-row" key={row.key} aria-label={`Defesa versus Ataque — ${row.name}`}>
   <section className="siege-row-defense" aria-label="Defesa inimiga">
    <header><span className="eyebrow"><Shield size={14}/>DEFESA</span><h3>{row.members.length?row.name:'Defesa não informada'}</h3></header>
    {row.members.length?<><LeaderLabel leader={row.leader}/><Lineup members={row.members} ranks={ranks}/></>:<p className="fineprint">{row.record.row?.target_defense||'Ataque compartilhado sem uma defesa vinculada.'}</p>}
    <div className="button-group">{row.members.length>0&&<button type="button" className="button small" disabled={busy} onClick={()=>onAdd(row)}><Plus size={14}/>Adicionar Counter</button>}{row.record.team.mode==='defense'&&<button type="button" className="button small" onClick={()=>onInspect(row.record)}>Ver metas da defesa</button>}</div>
   </section>
   <section className="siege-row-attacks" aria-label="Ataques recomendados">
    {!row.attacks.length&&<div className="siege-row-no-counter"><Swords size={24}/><p>Nenhum counter registrado para esta defesa.</p></div>}
    {row.attacks.length>1?<details className="siege-counters-accordion">
     <summary className="button primary siege-counter-toggle"><span>Ver {row.attacks.length} Counters Disponíveis</span><ChevronDown size={18} aria-hidden="true"/></summary>
     <div className="siege-counters-stack" role="region" tabIndex={0} aria-label="Counters disponíveis">{row.attacks.map(record=><CounterAttack key={record.key} record={record} feedback={feedback} onCopy={onCopy} onInspect={onInspect} onReact={onReact} account={account} busy={busy} feedbackBusy={feedbackBusy} active={active===record} onActivate={()=>setActiveKey(record.key)} options={options} defenseMembers={row.members}/>)}</div>
    </details>:row.attacks.map(record=><CounterAttack key={record.key} record={record} feedback={feedback} onCopy={onCopy} onInspect={onInspect} onReact={onReact} account={account} busy={busy} feedbackBusy={feedbackBusy} active={active===record} onActivate={()=>setActiveKey(record.key)} options={options} defenseMembers={row.members}/>)}
   </section>
   {active&&<section className="siege-comparison-timeline" aria-label={`Ticks da minha conta — ${active.name}`}><h3>{active.name} · Minha conta</h3><SiegeAccountTimeline record={active} defenseMembers={row.members} account={account} options={options}/></section>}
  </article>;})}
 </section>;
}
