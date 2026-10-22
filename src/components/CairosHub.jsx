import {presetsForArea} from '../core/deckManager';
import {MonsterEditor} from './TeamEditor';
import TeamDiagnosis from './TeamDiagnosis';
import CairosChecklist from './CairosChecklist';
import useTeamDiagnostics from '../hooks/useTeamDiagnostics';
import {applyDiagnosticPlan,plannedReservations} from '../core/loadouts';
import {teamFromGameDeck} from '../core/account-teams';
import {reorderTeam,updateAutomaticName} from '../core/team-ux';
import {leaderApplies} from '../core/leaders';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Castle,FlaskConical,LoaderCircle,Square} from 'lucide-react';
import {ALL_CAIROS_PROFILES,WAVE_SKILLS,makeCairosTeam,cairosWaveReport} from '../core/cairos';
import TeamCardExport from './TeamCardExport';

export default function CairosHub({account,options,reservedIds=[],plans={},onPlansChange,allTeams=[]}){
 const [dungeon,setDungeon]=useState(()=>account?.accountPresets?.find(p=>p.gameMode==='cairos'&&p.dungeon)?.dungeon||'gbah'),[result,setResult]=useState(null),[resultSignature,setResultSignature]=useState(''),[running,setRunning]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[attacker,setAttacker]=useState(''),[settings,setSettings]=useState({towerAtk:0,leaderAtk:0,towerCd:0,skillUps:0,attackBuff:0,variance:.9,skillReady:false,fullHp:true});
 const workerRef=useRef(),profile=ALL_CAIROS_PROFILES.find(p=>p.id===dungeon);
 const fallback=useMemo(()=>makeCairosTeam(profile,account),[profile,account]);
 const team=plans[dungeon]||fallback;
 function setTeam(update){onPlansChange(all=>{const previous=all[dungeon]||fallback,next=typeof update==='function'?update(previous):update;return {...all,[dungeon]:updateAutomaticName(previous,next)};});}
 const diagnosis=useTeamDiagnostics(account,[team],options,reservedIds,!running,allTeams);
 function applyDiagnosis(){try{const blocked=[...new Set([...reservedIds,...plannedReservations(allTeams,account,team.id)])];setTeam(applyDiagnosticPlan(account,team,diagnosis.reports[team.id],options,blocked));setError('');}catch(e){setError(e.message);}}
 const signature=JSON.stringify({team,options,reservedIds,importedAt:account?.importedAt});
 useEffect(()=>()=>workerRef.current?.terminate(),[]);
 useEffect(()=>{workerRef.current?.terminate();workerRef.current=null;setRunning(false);setResult(null);setAttacker('');setError('');},[account,dungeon]);
 function changeSetting(key,value){setSettings(s=>({...s,[key]:value}));}
 function test(){
  workerRef.current?.terminate();setError('');setResult(null);setRunning(true);setMessage('Comparando metas com o inventário…');
  const worker=new Worker(new URL('../core/cairos.worker.js',import.meta.url),{type:'module'});workerRef.current=worker;const sig=signature;
  worker.onmessage=({data})=>{if(workerRef.current!==worker)return;if(data.type==='progress'){setMessage(data.message);return;}worker.terminate();workerRef.current=null;setRunning(false);if(data.type==='error')setError(data.message);else {setResult(data.result);setResultSignature(sig);}};
  worker.onerror=()=>{if(workerRef.current!==worker)return;worker.terminate();workerRef.current=null;setRunning(false);setError('Falha na busca. Reduza a profundidade e tente novamente.');};
  worker.postMessage({account,team,options:{...options,strictMode:false},reservedIds});
 }
 const stale=!!result&&signature!==resultSignature;
 let waveReport=null,waveError='';
 if(result?.builds.length&&!stale&&attacker){try{waveReport=cairosWaveReport(account,result.builds,attacker,profile,{...settings,...(team.leader?.stat==='atk'&&leaderApplies(team.leader,account.units.find(u=>u.id===team.configs.find(c=>c.key===attacker)?.unitId)||{},'cairos')?{leaderAtk:team.leader.value}:{})});}catch(e){waveError=e.message;}}
 const attackingUnit=account?.units.find(u=>u.id===team.configs.find(c=>c.key===attacker)?.unitId);
 const skill=WAVE_SKILLS[attackingUnit?.master];
 return <><div className="page-intro"><h1><Castle size={29}/> Cairos · B12 & Abissal</h1><p>Prepare cinco monstros. Confira metas de equipamento e o dano das waves.</p></div>
  <div className="dungeon-tabs" aria-label="Masmorras">{ALL_CAIROS_PROFILES.map(p=><button type="button" className={`button ${p.id===dungeon?'primary':''}`} aria-pressed={p.id===dungeon} key={p.id} disabled={running} onClick={()=>setDungeon(p.id)}>{p.name}</button>)}</div>
  <section className="cairos-panel"><div className="section-toolbar"><div><h2>{profile.title}</h2><p className="fineprint">Composição inicial editável · metas de SPD total da ficha · Meta ACC do perfil: {profile.accuracy}%</p></div><input className="team-name" aria-label="Nome do time Cairos" value={team.autoName?team.configs.map(c=>c.label).join(' - '):team.name} onChange={e=>setTeam({...team,name:e.target.value,autoName:false})}/><TeamCardExport team={team} account={account}/></div>
   <p className="fineprint">Templates de partida para planejar velocidade; ajuste à estratégia. O checklist usa o cenário informado; não valida mecânicas especiais do chefe, IA ou recargas. ACC considera resistência − 15%, com teto de 85%; alguns inimigos podem exigir ajustes.</p>
   {team.sourceDeckId&&<p className="imported-deck-note">Deck do jogo: {team.sourceDeckName} · runas equipadas do SWEX</p>}
   {!!presetsForArea(account?.accountPresets,'cairos',dungeon).length&&<label className="field"><span>Meus decks de {profile.name}</span><select aria-label="Deck da masmorra" value={team.sourceDeckId||''} onChange={e=>{const p=presetsForArea(account.accountPresets,'cairos',dungeon).find(p=>p.id===e.target.value);if(p)setTeam(teamFromGameDeck({...p,gameMode:'cairos',dungeon},account,team));}}><option value="">Composição editada</option>{presetsForArea(account.accountPresets,'cairos',dungeon).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
   <TeamDiagnosis report={diagnosis.reports[team.id]} account={account} busy={diagnosis.busy} planned={team.plannedRunes} onApply={applyDiagnosis} onUndo={()=>setTeam({...team,plannedRunes:null})}/>
   <fieldset disabled={running} className="editor-fieldset"><div className="cairos-team-grid">{team.configs.map((c,i)=><article className="cairos-member" key={c.key}><MonsterEditor config={c} index={i} slotCount={5} account={account} team={team} options={options} onChange={next=>setTeam(t=>({...t,configs:t.configs.map(x=>x.key===c.key?next:x),...(next.masterId!==c.masterId&&t.leaderKey===c.key?{leader:null,leaderKey:null}:{})}))} onMove={direction=>setTeam(t=>reorderTeam(t,i,i+direction))} onLeader={leader=>setTeam(t=>({...t,leader,leaderIndex:i,leaderKey:leader?c.key:null,leaderSpd:0}))} leaderActive={!!team.leader&&team.leaderKey===c.key}/><label className="check-label"><input type="checkbox" checked={c.requireAccuracy!==false} onChange={e=>setTeam(t=>({...t,configs:t.configs.map(x=>x.key===c.key?{...x,requireAccuracy:e.target.checked}:x)}))}/>Exigir cap ACC</label><label className="check-label"><input type="checkbox" checked={c.requireCritical!==false} onChange={e=>setTeam(t=>({...t,configs:t.configs.map(x=>x.key===c.key?{...x,requireCritical:e.target.checked}:x)}))}/>Exigir 100% TC</label></article>)}</div>
   <div className="cairos-bonuses">{[['towerSpd','Torre SPD (%)'],['leaderSpd','Líder SPD (%)']].map(([key,label])=><label className="field" key={key}><span>{label}</span><input type="number" min="0" max="100" value={team[key]??0} onChange={e=>setTeam({...team,[key]:e.target.value,...(key==='leaderSpd'?{leader:null}:{})})}/></label>)}</div></fieldset>
   <CairosChecklist account={account} team={team} profile={profile} options={options} onChange={boss=>setTeam({...team,boss})}/>
   <div className="button-group">{running?<button className="button" onClick={()=>{workerRef.current?.terminate();workerRef.current=null;setRunning(false);setMessage('Busca cancelada.');}}><Square size={15}/>Cancelar</button>:<button className="button primary" disabled={!account||team.configs.some(c=>!c.unitId)} onClick={test}><FlaskConical size={17}/>Test on My JSON</button>}<span className="fineprint">{running&&<LoaderCircle size={14} className="spin"/>} {running?message:!account?'Importe seu SWEX em Dados SWEX.':'Distribuição conjunta: nenhuma runa é repetida entre os cinco monstros.'}</span></div>
   <p className="fineprint">Este teste retorna déficits mesmo com Strict Mode ativo. {options.maxGrindsGems?'Simulação de grinds/gems máximos ativada.':'Usando os valores atuais das runas.'}</p>
   {error&&<p role="alert" className="inline-warning">{error}</p>}{stale&&<p role="status" className="inline-warning">A composição ou o inventário mudou. Execute novamente o teste.</p>}
   {result&&!stale&&<div className="cairos-results" aria-live="polite"><h3>{result.status==='met'?'Metas de equipamento atingidas':result.builds.length?'Déficits da composição':'Sem distribuição disponível'}</h3>{result.failures.map((f,i)=><p className="inline-warning" key={i}>{f.name}: {f.reason}</p>)}{result.builds.map(b=><div className="cairos-deficit" key={b.key}><strong>{b.name}</strong><span>SPD combate: {b.stats.combat.spd}</span>{b.goals.filter(g=>!g.met).map(g=><span className="deficit" key={g.key}>−{Math.ceil(g.missing).toLocaleString('pt-BR')} {g.key.toUpperCase()} para a meta</span>)}{b.goals.every(g=>g.met)&&<span className="met">Metas atingidas</span>}</div>)}</div>}
  </section>
  {profile.waves&&<section className="cairos-panel wave-panel"><h2>Wave Clear · waves 1 e 3</h2><p className="fineprint">Dados públicos SWARFARM: HP/DEF individuais de cada inimigo. Modelo conservador de dano ATK: sem crítico garantido usa dano normal; desvantagem elemental usa glancing. Inclui subatributos suportados dos artefatos considerados na build. Não inclui passivas, buffs inimigos ou quebra de defesa.</p>
   <label className="field"><span>Atacante em área da composição</span><select value={attacker} onChange={e=>setAttacker(e.target.value)}><option value="">Escolha Lushen ou Julie</option>{team.configs.map(c=><option value={c.key} key={c.key}>{c.label}</option>)}</select></label>
   <p className="fineprint">{skill?`${skill.name} · ${skill.hits} golpes × ${skill.multiplier} ATK${skill.ignoreDefense?' · ignora DEF':''}`:'Modelos disponíveis: Lushen S3 e Julie S3. Outros monstros podem testar SPD/ACC.'}</p>
   <div className="wave-settings">{[['towerAtk','Torre ATK (%)',100],['leaderAtk','Líder ATK (%)',100],['towerCd','Torre CD (%)',100],['skillUps','Skill-ups de dano (%)',skill?.maxSkillUps||30]].map(([key,label,max])=><label className="field" key={key}><span>{label}</span><input type="number" min="0" max={max} value={settings[key]} onChange={e=>changeSetting(key,e.target.value)}/></label>)}<label className="field"><span>Buff ATK</span><select value={settings.attackBuff} onChange={e=>changeSetting('attackBuff',Number(e.target.value))}><option value={0}>Sem buff</option><option value={50}>Buff +50%</option></select></label></div>
   <label className="check-label"><input type="checkbox" checked={settings.fullHp} onChange={e=>changeSetting('fullHp',e.target.checked)}/>Julie com HP cheio (seis golpes)</label><label className="check-label"><input type="checkbox" checked={settings.skillReady} onChange={e=>changeSetting('skillReady',e.target.checked)}/>Assumir habilidade disponível e usada nas waves 1 e 3</label>
   <p className="fineprint">Torres/líder ATK incidem sobre ATK base; SPD do líder não aumenta dano. Variação mínima: 90%. Skill-ups não são inferidos do JSON. A disponibilidade da habilidade deve ser conferida na rotação do jogo.</p>
   {!result?.builds.length&&<p className="inline-notice">Execute “Test on My JSON” para calcular com a build encontrada.</p>}{waveError&&<p role="alert" className="inline-warning">{waveError}</p>}
   {waveReport&&<div className="wave-results">{waveReport.waves.map(w=><article key={w.number}><h3>Wave {w.number}</h3><p className={w.enemies.every(e=>e.clearInOneTurn)?'met':'fineprint'}>{w.enemies.every(e=>e.clearInOneTurn)?'Dano suficiente em um turno, sob as premissas selecionadas':w.enemies.every(e=>!e.missing)?'Dano suficiente; disponibilidade da habilidade não confirmada':'Dano insuficiente para limpar em um turno'}</p><ul>{w.enemies.map((e,i)=><li key={i}><strong>{e.name}</strong><span>HP {e.hp.toLocaleString('pt-BR')} · DEF {e.def} · dano {e.damage.toLocaleString('pt-BR')}{e.additionalDamage>0?` (+${e.additionalDamage.toLocaleString('pt-BR')} adicional)`:null}</span><span className={e.missing?'deficit':'met'}>{e.missing?`Faltam ${e.missing.toLocaleString('pt-BR')} de dano`:'Dano atingido'}{!e.guaranteedCrit?' · sem crítico garantido':''}</span></li>)}</ul></article>)}</div>}
  </section>}
 </>;
}
