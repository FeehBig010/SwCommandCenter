import {siegeBattleContextKey} from '../core/siege-battle-journal';
import {useMemo,useState} from 'react';
import SiegeAccountTimeline from './SiegeAccountTimeline';
import SiegeBattleJournal from './SiegeBattleJournal';
import './SiegeTactical.css';
import {siegeKillRanks,siegeCounterContext} from '../core/siege-search';
import {Copy,Plus,Shield,Swords,ChevronDown,ChevronLeft,ChevronRight,Pencil,Crown} from 'lucide-react';
import {siegeComparisonRows} from '../core/siege-central';
import {LABELS,SETS} from '../core/data';
import {orderRuneSets} from '../core/rune-sets';
import MonsterPortrait from './MonsterPortrait';
import {LeaderLabel} from './SiegeCounterComposer';

function Lineup({members,ranks=[],compact=false,leaderIndex=null}){
 return <div className={`siege-row-lineup${compact?' siege-lineup-compact':''}`}>{members.map((m,i)=>{
  const tick=Number(m.maxTick);
  const speed=Number(m.bonusSpd)||Number(m.goals?.spd)||0;
  const bonus=Number(m.bonusSpd)>0||m.basis==='bonus';
  return <div className="siege-row-unit" key={i}>
   <span className="siege-focus-portrait"><MonsterPortrait unit_master_id={m.masterId} name={m.label}/>{leaderIndex===i&&<span className="siege-defense-crown" title={`Líder: ${m.label}`} aria-label={`Líder da defesa: ${m.label}`}><Crown size={13}/></span>}{ranks[i]!=null&&<b className="siege-focus-rank" aria-label={`${ranks[i]}º alvo: ${m.label}`}>{ranks[i]}</b>}</span><strong>{m.label}</strong>
   {!compact&&(tick>0||speed>0||Number(m.combatSpd)>0)&&<span className="siege-row-speed">{tick>0?`Tick esperado ${tick}`:''}{speed?`${tick?' · ':''}Meta ${bonus?'+':''}${speed} SPD`:Number(m.combatSpd)>0?`${tick?' · ':''}Meta ${m.combatSpd} Combat SPD`:''}</span>}
   {!compact&&<><small>{Object.entries(m.goals||{}).filter(([key,value])=>key!=='spd'&&Number(value)>0).map(([key,value])=>`${LABELS[key]} ${m.basis==='bonus'&&!['cr','cd','res','acc'].includes(key)?'+':''}${Number(value).toLocaleString('pt-BR')}`).join(' · ')}</small>
   <div className="siege-sets">{orderRuneSets(m.sets||[]).filter(id=>SETS[id]).map((id,j)=><img key={j} className="rune-set-icon" src={`/game-icons/runes/${SETS[id].toLowerCase()}.png`} alt={SETS[id]} title={SETS[id]}/>)}</div></>}
  </div>;
 })}</div>;
}

function CounterNotes({record,onSave}){
 const [editing,setEditing]=useState(false),[text,setText]=useState(record.description||''),[error,setError]=useState('');
 return <div className="siege-inline-notes">{editing?<form onSubmit={async e=>{e.preventDefault();try{await onSave(record,text);setEditing(false);setError('');}catch(e){setError(e.message);}}}><label className="field"><span>Comentários / Estratégia</span><textarea aria-label={`Comentários / Estratégia — ${record.name}`} maxLength={1000} rows={3} value={text} onChange={e=>setText(e.target.value)}/></label><div className="button-group"><button type="submit" className="button small">Salvar comentário</button><button type="button" className="button small" onClick={()=>{setEditing(false);setError('');}}>Cancelar</button></div>{error&&<p role="alert">{error}</p>}</form>:<>{record.description&&<p className="siege-counter-notes">{record.description}</p>}<button type="button" className="button small siege-note-edit" onClick={()=>{setText(record.description||'');setEditing(true);}}><Pencil size={12}/>{record.description?'Editar comentário':'Adicionar comentário'}</button></>}</div>;
}

function CounterAttack({record,feedback,onCopy,onInspect,onReact,account,busy,feedbackBusy,active,onActivate,options,defenseMembers,personal=false,onSaveNote,onClose}){
 const f=record.counter?feedback(record):null,rate=f?.winRate??null;
 const contextual=useMemo(()=>siegeCounterContext(record,defenseMembers),[record,defenseMembers]);
 return <article className={`siege-row-attack${personal?' siege-compact-attack':''}${active?' active-counter':''}`} aria-label={`Ataque — ${record.name}`}>
  <header className="siege-tactical-counter-heading"><div><span className="eyebrow"><Swords size={14}/>{personal?'ATAQUE SALVO':'COUNTER DA GUILDA'}</span><h3>{record.name}</h3></div><span className="siege-counter-trio">{record.team.configs.map((c,i)=><span key={i} title={c.label}><MonsterPortrait unit_master_id={c.masterId} name={c.label}/></span>)}</span></header>
  <p className="siege-tactical-counter-names">{record.team.configs.map(c=>c.label).join(' · ')}</p>
  <div className="button-group siege-tactical-direct"><button type="button" className="button primary" disabled={busy||!account} onClick={()=>onCopy(contextual)} title={!account?'Importe seu SWEX para sincronizar a composição':undefined}><Copy size={15}/>{personal&&!record.sharedSource?(record.personalTeamId?'Abrir meu time':'Carregar no acervo'):'Copiar para Mim'}</button><button type="button" className="button small" onClick={()=>onInspect(contextual)}>{personal&&!record.fromPersonalTeam&&!record.sharedSource?'Editar vínculo':'Ver detalhes'}</button></div>
  {personal&&record.counter&&<SiegeBattleJournal key={`${account?.id}:${siegeBattleContextKey(contextual)}`} record={contextual} accountId={account?.id} disabled={busy}/>}
  <details className="siege-counter-disclosure" onToggle={e=>{if(e.target===e.currentTarget&&!e.currentTarget.open)onClose?.();}}>
  <summary className="siege-counter-portraits" aria-label={`Ver counter: ${record.team.configs.map(c=>c.label).join(', ')}`}>Estratégia, atributos e relatos anteriores <ChevronDown size={15} aria-hidden="true"/></summary><div className="siege-counter-expanded">
  <p className="siege-row-author">Registrado por {f?.author||'Membro da guilda'}{f?.scope==='device'?' · registro local':''}{record.cloud&&record.row?.moderation_status==='pending'?' · Pendente de aprovação':''}</p>
  <LeaderLabel leader={record.team.leader}/><Lineup members={record.team.configs} compact={personal}/>{personal&&<details className="siege-attack-sheet"><summary>Ver atributos e conjuntos</summary><Lineup members={record.team.configs}/></details>}{personal&&!record.sharedSource&&onSaveNote?<CounterNotes record={record} onSave={onSaveNote}/>:record.description&&<p className="siege-counter-notes">{record.description}</p>}
  {record.counter&&<button type="button" className="button small siege-counter-focus" aria-pressed={active} onClick={onActivate}>Ver foco e ticks deste ataque</button>}
  {f&&<section className="siege-legacy-reports"><h4>Relatos anteriores</h4><p className="fineprint">{f.scope==='guild'?'Um resultado por membro da guilda.':'Um resultado por usuário neste navegador.'} Estes relatos não são partidas do histórico local.</p><div className="siege-row-results" aria-label={`Meu resultado — ${record.name}`}>{[['win','Vitória'],['loss','Derrota']].map(([value,label])=><button key={value} type="button" className="button small" aria-pressed={f.outcome===value} disabled={feedbackBusy||!f.available} onClick={()=>onReact(record,'outcome',f.outcome===value?null:value)}>{label}</button>)}<span className={`siege-rate-badge ${rate===null?'unknown':'good'}`}>{rate===null?'Sem relatos':`${rate}% · ${f.total} relato(s)`}</span></div></section>}
 </div></details></article>;

}

function CounterList({records,render,onPage}){
 const [requested,setRequested]=useState(0),pages=Math.ceil(records.length/3),page=Math.min(requested,Math.max(0,pages-1)),many=records.length>3;
 function change(next){setRequested(next);onPage();}
 return <div className={`siege-counter-list ${many?'is-paginated':'is-roomy'}`}>
  {many&&<nav className="siege-counter-pagination" aria-label="Páginas de counters"><span role="status">{page*3+1}–{Math.min((page+1)*3,records.length)} de {records.length} counters</span><div><button type="button" className="icon-button" aria-label="Counters anteriores" disabled={page===0} onClick={()=>change(page-1)}><ChevronLeft size={17}/></button><span>{page+1} / {pages}</span><button type="button" className="icon-button" aria-label="Próximos counters" disabled={page===pages-1} onClick={()=>change(page+1)}><ChevronRight size={17}/></button></div></nav>}
  <div className="siege-counter-page" role="region" aria-label="Counters disponíveis">{records.map((record,index)=><div key={record.key} className="siege-counter-page-item" hidden={many&&Math.floor(index/3)!==page}>{render(record)}</div>)}</div>
 </div>;
}

export default function SiegeGuildRows({records=[],rows:providedRows,feedback,onCopy,onAdd,onInspect,onReact,account,busy,feedbackBusy,options,personal=false,onEditDefense,onSaveNote}){
 const [activeKey,setActiveKey]=useState(null);
 const rows=providedRows||siegeComparisonRows(records);
 return <section className={`siege-comparisons${personal?' siege-personal-comparisons':''}`} aria-label={personal?'Meus confrontos — Defesa versus Ataque':'Counters da guilda — Defesa versus Ataque'}>
  <header className="siege-comparisons-heading"><div><h2>{personal?'Defesa e ataques salvos':'Counters e Compartilhamento'}</h2></div></header>
  {!rows.length&&<p className="siege-empty-list">Nenhuma composição corresponde aos filtros. Importe modelos ou conecte sua guilda.</p>}
  {rows.map(row=>{const active=row.attacks.find(r=>r.key===activeKey)||row.attacks[0],ranks=siegeKillRanks(row.members,active?.counter);return <article className="siege-comparison-row" key={row.key} aria-label={`Defesa versus Ataque — ${row.name}`}>
   <section className="siege-row-defense" aria-label="Defesa inimiga">
    <header><span className="eyebrow"><Shield size={14}/>DEFESA</span><h3>{personal?'Defesa que vou enfrentar':row.members.length?row.name:'Defesa não informada'}</h3></header>
    {row.members.length?<><LeaderLabel leader={row.leader}/><Lineup members={row.members} ranks={ranks} leaderIndex={row.leaderIndex??row.record.counter?.siege.defenseLeaderIndex??row.record.team.leaderIndex??0}/></>:<p className="fineprint">{row.record.row?.target_defense||'Ataque compartilhado sem uma defesa vinculada.'}</p>}
    <div className="button-group">{personal&&row.sources?.includes('Meu acervo')&&onEditDefense&&<button type="button" className="button small siege-edit-defense" disabled={busy} onClick={()=>onEditDefense(row)}><Pencil size={13}/>Editar defesa</button>}{row.members.length>0&&<button type="button" className={`button small${personal?' primary':''}`} disabled={busy} onClick={()=>onAdd(row,personal?'preset':undefined)}><Plus size={14}/>{personal?'Usar um preset definido':'Adicionar Counter'}</button>}{personal&&row.members.length>0&&<button type="button" className="button small" disabled={busy} onClick={()=>onAdd(row,'manual')}><Plus size={14}/>Cadastrar ataque que ganha deles</button>}{!personal&&row.record.team.mode==='defense'&&<button type="button" className="button small" onClick={()=>onInspect(row.record)}>Ver metas da defesa</button>}</div>
   </section>
   <section className="siege-row-attacks" aria-label="Ataques recomendados">
    {personal&&<div className="siege-tactical-section-label"><h3>Ataques para esta defesa</h3><span>{row.attacks.length} salvo(s)</span></div>}
    {!row.attacks.length&&<div className="siege-row-no-counter"><Swords size={24}/><p>{personal?'Vincule um preset ou selecione seu trio.':'Nenhum counter registrado para esta defesa.'}</p></div>}
    <CounterList records={row.attacks} onPage={()=>setActiveKey(null)} render={record=><CounterAttack key={record.key} record={record} feedback={feedback} onCopy={onCopy} onInspect={onInspect} onReact={onReact} account={account} busy={busy} feedbackBusy={feedbackBusy} active={active===record} onActivate={()=>setActiveKey(key=>key===record.key?null:record.key)} options={options} defenseMembers={row.members} personal={personal} onSaveNote={onSaveNote} onClose={()=>setActiveKey(key=>key===record.key?null:key)}/>}/>

   </section>
   {active&&activeKey===active.key&&<section className="siege-comparison-timeline" aria-label={`Ticks da minha conta — ${active.name}`}><h3>{active.name} · Minha conta</h3><SiegeAccountTimeline record={active} defenseMembers={row.members} account={account} options={options}/></section>}
  </article>;})}
 </section>;
}
