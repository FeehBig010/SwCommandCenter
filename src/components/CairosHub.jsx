import InfoTooltip from './InfoTooltip';
import {presetsForArea} from '../core/deckManager';
import {MonsterEditor} from './TeamEditor';
import TeamDiagnosis from './TeamDiagnosis';
import AutomaticCairosReport from './AutomaticCairosReport';
import useTeamDiagnostics from '../hooks/useTeamDiagnostics';
import {applyDiagnosticPlan,plannedReservations} from '../core/loadouts';
import {teamFromGameDeck} from '../core/account-teams';
import {reorderTeam,updateAutomaticName} from '../core/team-ux';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Castle,FlaskConical,LoaderCircle,Square} from 'lucide-react';
import {CAIROS_PROFILES as ALL_CAIROS_PROFILES,makeCairosTeam} from '../core/cairos';
import TeamCardExport from './TeamCardExport';

export default function CairosHub({account,options,reservedIds=[],plans={},onPlansChange,allTeams=[]}){
 const [dungeon,setDungeon]=useState(()=>account?.accountPresets?.find(p=>p.gameMode==='cairos'&&['gbah','dbah','nbah','sf10','pc10'].includes(p.dungeon))?.dungeon||'gbah'),[result,setResult]=useState(null),[resultSignature,setResultSignature]=useState(''),[running,setRunning]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const workerRef=useRef(),profile=ALL_CAIROS_PROFILES.find(p=>p.id===dungeon);
 const fallback=useMemo(()=>makeCairosTeam(profile,account),[profile,account]);
 const storedTeam=plans[dungeon]||fallback,team=useMemo(()=>({...storedTeam,towerSpd:15,guildSpd:5}),[storedTeam]);
 function setTeam(update){onPlansChange(all=>{const previous=all[dungeon]||fallback,next=typeof update==='function'?update(previous):update;return {...all,[dungeon]:{...updateAutomaticName(previous,next),towerSpd:15,guildSpd:5}};});}
 const diagnosis=useTeamDiagnostics(account,[team],options,reservedIds,!running,allTeams);
 function applyDiagnosis(){try{const blocked=[...new Set([...reservedIds,...plannedReservations(allTeams,account,team.id)])];setTeam(applyDiagnosticPlan(account,team,diagnosis.reports[team.id],options,blocked));setError('');}catch(e){setError(e.message);}}
 const signature=JSON.stringify({team,options,reservedIds,importedAt:account?.importedAt});
 useEffect(()=>()=>workerRef.current?.terminate(),[]);
 useEffect(()=>{workerRef.current?.terminate();workerRef.current=null;setRunning(false);setResult(null);setError('');},[account,dungeon]);
 function test(){
  workerRef.current?.terminate();setError('');setResult(null);setRunning(true);setMessage('Comparando metas com o inventário…');
  const worker=new Worker(new URL('../core/cairos.worker.js',import.meta.url),{type:'module'});workerRef.current=worker;const sig=signature;
  worker.onmessage=({data})=>{if(workerRef.current!==worker)return;if(data.type==='progress'){setMessage(data.message);return;}worker.terminate();workerRef.current=null;setRunning(false);if(data.type==='error')setError(data.message);else {setResult(data.result);setResultSignature(sig);}};
  worker.onerror=()=>{if(workerRef.current!==worker)return;worker.terminate();workerRef.current=null;setRunning(false);setError('Falha na busca. Reduza a profundidade e tente novamente.');};
  worker.postMessage({account,team,options:{...options,strictMode:false},reservedIds});
 }
 const stale=!!result&&signature!==resultSignature;
 return <div className="cairos-reactive" data-dungeon={dungeon}><div className="page-intro"><h1><Castle size={29}/> Cairos Abissal</h1><p>Prepare cinco monstros. Confira metas de equipamento e o dano das waves.</p></div>
  <div className="dungeon-tabs" aria-label="Masmorras">{ALL_CAIROS_PROFILES.map(p=><button type="button" className={`button ${p.id===dungeon?'primary':''}`} aria-pressed={p.id===dungeon} key={p.id} disabled={running} onClick={()=>setDungeon(p.id)}>{p.name}</button>)}</div>
  <section className="cairos-panel"><div className="section-toolbar"><div><h2>{profile.title}</h2><p className="fineprint">Composição inicial editável · metas de SPD total da ficha · Meta ACC do perfil: {profile.accuracy}%</p></div><input className="team-name" aria-label="Nome do time Cairos" value={team.autoName?team.configs.map(c=>c.label).join(' - '):team.name} onChange={e=>setTeam({...team,name:e.target.value,autoName:false})}/><TeamCardExport team={team} account={account}/></div>
   <InfoTooltip label="Informações técnicas">Templates de partida para planejar velocidade; ajuste à estratégia. O checklist usa o cenário informado; não valida mecânicas especiais do chefe, IA ou recargas. ACC considera resistência − 15%, com teto de 85%; alguns inimigos podem exigir ajustes.</InfoTooltip>
   {team.sourceDeckId&&<p className="imported-deck-note">Deck do jogo: {team.sourceDeckName} · runas equipadas do SWEX</p>}
   {!!presetsForArea(account?.accountPresets,'cairos',dungeon).length&&<label className="field"><span>Meus decks de {profile.name}</span><select aria-label="Deck da masmorra" value={team.sourceDeckId||''} onChange={e=>{const p=presetsForArea(account.accountPresets,'cairos',dungeon).find(p=>p.id===e.target.value);if(p)setTeam(teamFromGameDeck({...p,gameMode:'cairos',dungeon},account,team));}}><option value="">Composição editada</option>{presetsForArea(account.accountPresets,'cairos',dungeon).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
   <TeamDiagnosis report={diagnosis.reports[team.id]} account={account} busy={diagnosis.busy} planned={team.plannedRunes} onApply={applyDiagnosis} onUndo={()=>setTeam({...team,plannedRunes:null})}/>
   <fieldset disabled={running} className="editor-fieldset"><div className="cairos-team-grid">{team.configs.map((c,i)=><article className="cairos-member" key={c.key}><MonsterEditor config={c} index={i} slotCount={5} account={account} team={team} options={options} onChange={next=>setTeam(t=>({...t,configs:t.configs.map(x=>x.key===c.key?next:x),...(next.masterId!==c.masterId&&t.leaderKey===c.key?{leader:null,leaderKey:null}:{})}))} onMove={direction=>setTeam(t=>reorderTeam(t,i,i+direction))} onLeader={leader=>setTeam(t=>({...t,leader,leaderIndex:i,leaderKey:leader?c.key:null,leaderSpd:0}))} leaderActive={!!team.leader&&team.leaderKey===c.key}/><label className="check-label"><input type="checkbox" checked={c.requireAccuracy!==false} onChange={e=>setTeam(t=>({...t,configs:t.configs.map(x=>x.key===c.key?{...x,requireAccuracy:e.target.checked}:x)}))}/>Exigir cap ACC</label><label className="check-label"><input type="checkbox" checked={c.requireCritical!==false} onChange={e=>setTeam(t=>({...t,configs:t.configs.map(x=>x.key===c.key?{...x,requireCritical:e.target.checked}:x)}))}/>Exigir 100% TC</label></article>)}</div>
</fieldset>
   <AutomaticCairosReport account={account} team={team} profile={profile} builds={!stale?result?.builds:null} options={options}/>
   <div className="button-group">{running?<button className="button" onClick={()=>{workerRef.current?.terminate();workerRef.current=null;setRunning(false);setMessage('Busca cancelada.');}}><Square size={15}/>Cancelar</button>:<button className="button primary" disabled={!account||team.configs.some(c=>!c.unitId)} onClick={test}><FlaskConical size={17}/>Test on My JSON</button>}<span className="fineprint">{running&&<LoaderCircle size={14} className="spin"/>} {running?message:!account?'Importe seu SWEX em Dados SWEX.':'Distribuição conjunta: nenhuma runa é repetida entre os cinco monstros.'}</span></div>
   <p className="fineprint">Este teste retorna déficits mesmo com Strict Mode ativo. {options.maxGrindsGems?'Simulação de grinds/gems máximos ativada.':'Usando os valores atuais das runas.'}</p>
   {error&&<p role="alert" className="inline-warning">{error}</p>}{stale&&<p role="status" className="inline-warning">A composição ou o inventário mudou. Execute novamente o teste.</p>}
   {result&&!stale&&<div className="cairos-results" aria-live="polite"><h3>{result.status==='met'?'Metas de equipamento atingidas':result.builds.length?'Déficits da composição':'Sem distribuição disponível'}</h3>{result.failures.map((f,i)=><p className="inline-warning" key={i}>{f.name}: {f.reason}</p>)}{result.builds.map(b=><div className="cairos-deficit" key={b.key}><strong>{b.name}</strong><span>SPD combate: {b.stats.combat.spd}</span>{b.goals.filter(g=>!g.met).map(g=><span className="deficit" key={g.key}>−{Math.ceil(g.missing).toLocaleString('pt-BR')} {g.key.toUpperCase()} para a meta</span>)}{b.goals.every(g=>g.met)&&<span className="met">Metas atingidas</span>}</div>)}</div>}
  </section>
 </div>;
}
