import {useEffect,useRef,useState} from 'react';
import './BuildLabConversation.css';
import {parseBuildLabRequest,prepareBuildLabTeam,resolveBuildLabProtection,resultProtectionConflicts} from '../core/build-lab-request.js';

const example='Monte Adriana, Mihyang líder e Rigna para Siege. Quero maior dano sem corte. Alvo 230 SPD e 1200 DEF.';
const format=n=>Math.round(Number(n)||0).toLocaleString('pt-BR');
const range=r=>Array.isArray(r)&&r.every(Number.isFinite)?r.map(format).join('–'):'Não calculado';
const titles={damage:'Maior dano encontrado',robust:'Alternativa robusta',current:'Equipamento atual'};

export default function BuildLabConversation({account,teams=[],options={},reservedIds=[],allTeams=[],enabled=true}){
 const [message,setMessage]=useState(example);
 const [history,setHistory]=useState([]);
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState('');
 const [report,setReport]=useState(null);
 const [error,setError]=useState('');
 const worker=useRef(null);
 const lastAccount=useRef(account);
 const cancel=()=>{worker.current?.terminate();worker.current=null;};
 useEffect(()=>()=>cancel(),[]);
 useEffect(()=>{if(lastAccount.current!==account){lastAccount.current=account;cancel();setBusy(false);setReport(null);setHistory([]);setError('');}},[account]);
 function submit(event){
  event.preventDefault();
  if(!account||!enabled||busy)return;
  cancel();setError('');setProgress('');setReport(null);
  const request=message.trim();
  let parsed,selected,protection;
  try{
   parsed=parseBuildLabRequest(request);
   selected=prepareBuildLabTeam(account,teams,parsed);
   protection=resolveBuildLabProtection(account,selected.team,parsed.protectDeck);
   if(parsed.targetSpd===null||parsed.targetDef===null)throw new Error('Informe SPD e DEF do alvo no pedido. Exemplo: alvo 230 SPD e 1200 DEF.');
   if(parsed.targetSpd<1||parsed.targetSpd>10000||parsed.targetDef<0||parsed.targetDef>100000)throw new Error('Informe SPD de 1 a 10.000 e DEF de 0 a 100.000.');
  }catch(err){setHistory(v=>[...v.slice(-5),{role:'Você',content:request}]);setError(err.message);return;}
  setHistory(v=>[...v.slice(-5),{role:'Você',content:request}]);
  const job=new Worker(new URL('../core/optimizer.worker.js',import.meta.url),{type:'module'});
  worker.current=job;setBusy(true);setProgress('Verificando runas, sincronização e dano…');
  job.onmessage=({data})=>{
   if(worker.current!==job)return;
   if(data.type==='progress'){setProgress(data.message||'Avaliando builds…');return;}
   cancel();setBusy(false);setProgress('');
   if(data.type==='error'){setError(data.message||'Não foi possível completar a busca.');return;}
   const result=data.result;
   setReport({result,conflicts:resultProtectionConflicts(result,protection),selected,protection,parsed});
   setHistory(v=>[...v.slice(-5),{role:'Build Lab',content:result.status==='complete'?
    'Encontrei configurações calculadas. Confira as condições e os equipamentos antes de usá-las no jogo.':
    'A busca limitada não encontrou uma configuração válida. Isso não comprova impossibilidade.'}]);
  };
  job.onerror=()=>{if(worker.current===job){cancel();setBusy(false);setProgress('');setError('A busca foi interrompida.');}};
  job.postMessage({mode:'siege-rotation',account,team:selected.team,
   target:{spd:parsed.targetSpd,def:parsed.targetDef,element:0,defenseBuff:parsed.defenseBuff,stripAfterHit:1,ignorePercent:''},
   options:{...options,depth:'fast',artifacts:true,maxGrindsGems:false,respectLocks:true},
   reservedIds:[...new Set([...reservedIds,...protection.runeIds])],allTeams});
 }
 return <section className="build-lab-conversation optimizer-calculation-summary" aria-label="Assistente do Build Lab">
  <h2>Assistente do Build Lab</h2>
  <p>Descreva sua estratégia em português. Este MVP guiado interpreta o trio Adriana, Mihyang e Rigna e executa os motores do site. Não usa IA externa nem altera inventário.</p>
  <div className="build-lab-chat-history" aria-live="polite">
   {history.length===0&&<p className="fineprint">Exemplo: Adriana, Mihyang líder e Rigna; maior dano sem corte; alvo 230 SPD e 1200 DEF; preservar Deck 17.</p>}
   {history.map((entry,i)=><p key={i}><strong>{entry.role}:</strong> {entry.content}</p>)}
  </div>
  <form onSubmit={submit}>
   <label className="field" htmlFor="build-lab-request"><span>Seu pedido</span>
    <textarea id="build-lab-request" value={message} maxLength={1200} rows={3} disabled={busy} onChange={e=>setMessage(e.target.value)}/>
   </label>
   <div className="button-group">
    {busy?<button className="button small" type="button" onClick={()=>{cancel();setBusy(false);setProgress('');setHistory(v=>[...v,{role:'Build Lab',content:'Busca cancelada. Nenhum dado foi alterado.'}]);}}>Cancelar busca</button>:
     <button className="button primary small" disabled={!enabled||!account||!message.trim()} type="submit">Otimizar e explicar</button>}
   </div>
  </form>
  {!account&&<p role="status">Importe seu SWEX para utilizar as runas da conta.</p>}
  {!enabled&&<p role="status">O motor está indisponível.</p>}
  {progress&&<p role="status">{progress}</p>}
  {error&&<p role="alert">{error}</p>}
  {report&&<BuildLabAnswer report={report}/>}
 </section>;
}

function BuildLabAnswer({report}){
 const {result,conflicts,selected,protection,parsed}=report;
 return <section className="build-lab-chat-results" aria-label="Resultado calculado">
  <h3>Resultado do motor de Siege</h3>
  <p>{selected.reused?'Trio existente reconhecido.':'Trio preparado temporariamente a partir do SWEX.'} Alvo: {format(parsed.targetSpd)} SPD, {format(parsed.targetDef)} DEF. {protection.preset?protection.preset.name+' protegido na busca.':'Sem proteção adicional de preset.'}</p>
  <p className="fineprint">Busca heurística: {result.checked}/{result.limit} conjuntos, {(result.elapsed/1000).toFixed(2)} s. Artefatos equipados. Ignore DEF de Rigna em faixa 0–100%, não certificado. Não há garantia de ótimo global.</p>
  {result.status!=='complete'&&<p role="status">Nenhuma alocação válida encontrada. Experimente outras condições no painel avançado.</p>}
  {(result.alternatives||[]).map(item=>{
   const conflict=conflicts.find(c=>c.kind===item.kind);
   const blocked=conflict&&(conflict.runeIds.length>0||conflict.artifactIds.length>0);
   return <article key={item.kind} className="optimizer-calculation-summary">
    <h4>{titles[item.kind]||item.kind} · {range([item.lower,item.upper])}</h4>
    <p>{blocked?'BLOCKED · equipamento protegido em conflito':item.valid?'CONDITIONAL · sem corte nos ramos simulados':'BLOCKED · falha na simulação'}</p>
    {blocked&&<p role="alert">Runas conflitantes: {conflict.runeIds.join(', ')||'nenhuma'}; artefatos conflitantes: {conflict.artifactIds.join(', ')||'nenhum'}</p>}
    <ul>{item.branches.map(branch=><li key={branch.label}>{branch.label}: {range(branch.range)} · {branch.valid?'sem corte simulado':'sincronia inválida'}</li>)}</ul>
    <details><summary>IDs de equipamentos e ticks</summary>
     <ul>{item.builds.map(build=><li key={build.key}><strong>{build.name}</strong> · Runas {build.runeIds.map(x=>'#'+x).join(', ')} · Artefatos {build.artifactIds.map(x=>'#'+x).join(', ')||'não considerados'}</li>)}</ul>
     {item.branches.map(branch=><p key={branch.label}>{branch.label}: {branch.turns.map(t=>(result.names[t.key]||'Defesa')+' T'+t.tick).join(' → ')}</p>)}
    </details>
   </article>;
  })}
  <p className="fineprint">A defesa completa 3v3, passivas e eliminações projetadas exigem conferência no painel de validação. Nenhuma build foi salva ou aplicada automaticamente.</p>
 </section>;
}
