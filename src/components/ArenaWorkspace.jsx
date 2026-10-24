import {useState} from 'react';
import {ARENA_CONTEXTS,arenaCloudRows,arenaMatchups,isArenaContext} from '../core/arena-context';
import GuildCloudPanel from './GuildCloudPanel';
import MatchupCard from './MatchupCard';
import CounterComposer from './CounterComposer';
import './ArenaWorkspace.css';

export default function ArenaWorkspace({context,onContextChange,space,onSpaceChange,running,teams,matchups,onMatchupsChange,cloud,session,account,onAuth,onCopy,children}){
 const [composing,setComposing]=useState(false),[query,setQuery]=useState('');
 const unclassified=matchups.filter(m=>m.offense?.gameMode==='arena'&&m.offense.arenaContext==='unknown').length;
 const ownTeams=teams.filter(t=>isArenaContext(t,context));
 const counters=arenaMatchups(matchups,context).filter(m=>`${m.name} ${m.enemyDefense.map(c=>c.label).join(' ')} ${m.offense.configs.map(c=>c.label).join(' ')}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
 const scopedCloud={...cloud,rows:arenaCloudRows(cloud.rows,context).filter(r=>`${r.name} ${JSON.stringify(r.payload)}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))),save:(input,previous)=>{if(!arenaCloudRows([input],context).length)throw new Error('Composição fora do contexto de Arena selecionado.');return cloud.save(input,previous);}};
 return <section className="arena-workspace" aria-label={ARENA_CONTEXTS[context]}>
  <header className="arena-context-bar"><h1>Arena</h1><div role="group" aria-label="Contexto de Arena">{Object.entries(ARENA_CONTEXTS).map(([key,label])=><button key={key} className={`button ${context===key?'primary':''}`} disabled={running} aria-pressed={context===key} onClick={()=>{setComposing(false);setQuery('');onContextChange(key);}}>{label}</button>)}</div><span className="template-badge">{ARENA_CONTEXTS[context]} · 4 slots</span></header>
  <div className="arena-space-tabs" role="tablist" aria-label="Espaços da Arena">{[['personal','Meu Espaço'],['guild','Espaço da Guilda']].map(([key,label])=><button key={key} className={`button ${space===key?'primary':''}`} role="tab" aria-selected={space===key} disabled={running} aria-controls="arena-space-panel" id={`arena-space-${key}`} onClick={()=>{setComposing(false);setQuery('');onSpaceChange(key);}}>{label}</button>)}</div>
  {unclassified>0&&<p role="status" className="notice">{unclassified} confronto(s) antigo(s) sem contexto identificado foram ocultados. Registre-os novamente na Arena correspondente.</p>}
  <div id="arena-space-panel" role="tabpanel" aria-labelledby={`arena-space-${space}`}>
   {space==='personal'?<>{children}<section aria-label="Confrontos pessoais de Arena"><header className="section-toolbar"><h2>Defesa × Ataque · {ARENA_CONTEXTS[context]}</h2><button className="button" disabled={running||!ownTeams.some(t=>t.mode==='attack')} onClick={()=>setComposing(true)}>Registrar confronto</button></header><label className="field"><span>Buscar defesa ou counter</span><input aria-label="Buscar counters pessoais de Arena" value={query} onChange={e=>setQuery(e.target.value)}/></label>{counters.length?counters.map(m=><MatchupCard key={m.id} matchup={m}/>):<p role="status">Nenhum confronto registrado neste contexto.</p>}{composing&&<CounterComposer key={context} teams={ownTeams.filter(t=>t.mode==='attack')} account={account} slots={4} onCancel={()=>setComposing(false)} onSave={payload=>{onMatchupsChange([...matchups,{...payload,id:crypto.randomUUID()}]);setComposing(false);}}/>}</section></>:<><label className="field"><span>Buscar defesa ou counter da guilda</span><input aria-label="Buscar counters da guilda de Arena" value={query} onChange={e=>setQuery(e.target.value)}/></label><GuildCloudPanel key={`${context}:${cloud.guildId||''}`} cloud={scopedCloud} session={session} onAuth={onAuth} teams={ownTeams} account={account} onCopy={onCopy}/></>}
  </div>
 </section>;
}
