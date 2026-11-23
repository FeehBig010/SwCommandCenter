import Siege3v3Panel from './Siege3v3Panel';
import {useEffect,useRef,useState} from 'react';

const labels={damage:'Maior dano encontrado',robust:'Alternativa mais robusta',current:'Configuração atual'};
const winLabels={'atinge-hp-no-ramo':'Dano projetado atinge o HP informado','abaixo-do-hp':'Dano projetado abaixo do HP','depende-do-dano':'A faixa cruza o HP informado','sem-hp':'HP do alvo não informado'};
const format=value=>Math.round(value).toLocaleString('pt-BR');
const rangeText=range=>range?(range[0]===range[1]?format(range[0]):`${format(range[0])}–${format(range[1])}`):'Indisponível';

export default function SiegeRotationPanel({account,team,options,reservedIds,allTeams,enabled}){
 const [target,setTarget]=useState(()=>({spd:team.combatScenario?.enemies?.[0]?.spd||team.enemyCombatSpd||'',def:'',hp:'',element:1,defenseBuff:true,stripAfterHit:1,ignorePercent:''}));
 const [state,setState]=useState({});
 const worker=useRef(null);
 const signature=JSON.stringify([team,target,options,reservedIds,allTeams]);
 const current=state.signature===signature&&state.account===account?state:{};
 const cancel=()=>{worker.current?.terminate();worker.current=null;};
 useEffect(()=>()=>cancel(),[]);
 const update=(key,value)=>{cancel();setState({});setTarget(v=>({...v,[key]:value}));};
 function search(event){
  event.preventDefault();
  if(!enabled||!account)return;
  cancel();
  const job=new Worker(new URL('../core/optimizer.worker.js',import.meta.url),{type:'module'});
  worker.current=job;
  const identity={signature,account};
  setState({...identity,busy:true,message:'Preparando combinações…'});
  job.onmessage=({data})=>{
   if(worker.current!==job)return;
   if(data.type==='progress'){setState({...identity,busy:true,message:data.message});return;}
   cancel();
   setState({...identity,result:data.result,error:data.type==='error'?data.message:undefined});
  };
  job.onerror=()=>{if(worker.current===job){cancel();setState({...identity,error:'A busca foi interrompida.'});}};
  job.postMessage({mode:'siege-rotation',team,target,account,options,reservedIds,allTeams});
 }
 return <section className="optimizer-calculation-summary" aria-label="Dano conjunto de Siege">
  <h3>Dano da primeira rotação</h3>
  <p>Mihyang lidera. A busca compara Adriana S3, Mihyang S2 e Rigna/Ciri S2 nas duas ordens, com os artefatos equipados.</p>
  <form onSubmit={search}>
   <div className="damage-fields">
    {[['spd','SPD do alvo',1,10000,true],['def','DEF base do alvo',0,100000,true],['hp','HP do alvo (opcional)',1,10000000,false],['ignorePercent','Ignore DEF assumido (%)',0,100,false]].map(([key,label,min,max,required])=>
     <label className="field" key={key}><span>{label}</span><input type="number" min={min} max={max} step={key==='ignorePercent'?'any':1} value={target[key]} placeholder={key==='ignorePercent'?'Faixa 0–100%':undefined} required={required} onChange={e=>update(key,e.target.value)}/></label>)}
    <label className="field"><span>Elemento do alvo</span><select value={target.element} onChange={e=>update('element',Number(e.target.value))}>{['Neutro','Água','Fogo','Vento','Luz','Trevas'].map((label,i)=><option key={label} value={i}>{label}</option>)}</select></label>
    <label className="check-label"><input type="checkbox" checked={target.defenseBuff} onChange={e=>update('defenseBuff',e.target.checked)}/>Alvo começa com buff DEF</label>
    {target.defenseBuff&&<label className="field"><span>Remoção hipotética após o golpe</span><select value={target.stripAfterHit} onChange={e=>update('stripAfterHit',Number(e.target.value))}>{[1,2,3].map(n=><option key={n}>{n}</option>)}</select></label>}
   </div>
   {current.busy?<button className="button small" type="button" onClick={()=>{cancel();setState({});}}>Cancelar busca de dano</button>:<button className="button primary small" disabled={!enabled||!account}>Buscar maior dano do trio</button>}
  </form>
  {current.message&&<p role="status">{current.message}</p>}
  {current.error&&<p role="alert">{current.error}</p>}
  {current.result&&<RotationResults result={current.result}/>}
  <Siege3v3Panel account={account} team={team} options={options} reservedIds={reservedIds} allTeams={allTeams} enabled={enabled} alternative={current.result?.alternatives.find(a=>a.kind==='damage')}/>
 </section>;
}

function RotationResults({result}){
 const {target,names}=result;
 return <>
  <p role="status">{result.checked}/{result.limit} conjuntos reavaliados · {(result.elapsed/1000).toFixed(2)} s · Busca limitada{result.limitReached?' (teto atingido)':''}.</p>
  <p>Estimativa condicional com variação 1. Ignore DEF {target.ignorePercent===null?'em faixa de 0–100%':`informado em ${target.ignorePercent}%`}. Os ramos não têm probabilidades atribuídas.</p>
  <ul>{result.orders.map(order=><li key={order.keys.join('|')}>{order.keys.map(key=>names[key]).join(' → ')} · {order.upper===null?'nenhum conjunto válido encontrado':`melhor faixa ${rangeText([order.lower,order.upper])}`}</li>)}</ul>
  {result.status!=='complete'&&<p>Busca sem configuração válida nos ramos testados.</p>}
  {result.failures.map(failure=><p key={failure.key||failure.name}>{failure.name} · {failure.reason}</p>)}
  {result.alternatives.map(row=><article className="optimizer-calculation-summary" key={row.kind}>
   <h4>{labels[row.kind]} · {rangeText(row.lower===null?null:[row.lower,row.upper])}</h4>
   <p>{row.valid?'Ordem e anti-corte atendidos nos ramos simulados.':'Ordem ou anti-corte não atendidos neste snapshot.'}</p>
   {row.branches.map(branch=><details key={branch.label}>
    <summary>{branch.label} · {rangeText(branch.range)} · {winLabels[branch.win]}{branch.valid?'':' · sincronia inválida'}</summary>
    <ul>{branch.turns.map(turn=>{
     const action=branch.actions.find(action=>action.key===turn.key),combat=action?.hits?.[0]?.combat;
     return <li key={turn.key}>{names[turn.key]||'Defesa'} · tick {turn.tick} · SPD {format(turn.spd)}{action&&` · dano ${rangeText(action.range)}`}{combat&&` · ATK ${format(combat.atk)} · DEF ${format(combat.def)}`}{action?.hits?.[0]&&` · TC no primeiro golpe ${rangeText(action.hits[0].critChance)}%`}</li>;
    })}</ul>
    <ul>{branch.risks.map(risk=><li key={risk}>{risk}</li>)}</ul>
   </details>)}
   <details><summary>Equipamento e atributos finais</summary><ul>{row.builds.map(build=><li key={build.key}>
    <strong>{build.name}</strong> · Runas {build.runeIds.map(id=>`#${id}`).join(', ')} · Artefatos {build.artifactIds.map(id=>`#${id}`).join(', ')||'sem artefatos no cálculo'}
    <br/>{['hp','atk','def','spd','cr','cd','acc','res'].map(stat=>`${stat.toUpperCase()} ${format(build.stats.combat[stat])}`).join(' · ')}
   </li>)}</ul></details>
  </article>)}
 </>;
}
