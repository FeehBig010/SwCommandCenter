import {useEffect,useMemo,useRef,useState} from 'react';
import {certifyTuning} from '../core/tuning-certification.js';
import './TuningCertification.css';

export default function TuningCertification({team,preview,error}){
 const certificate=certifyTuning(team,preview),stamp=JSON.stringify(team),active=(team.configs||[]).filter(c=>c.enabled!==false&&c.masterId);
 const [chosen,setChosen]=useState(''),[criterion,setCriterion]=useState('tick'),[targetTick,setTargetTick]=useState(6),[safetyMargin,setSafetyMargin]=useState(0),[maxRuneSpd,setMaxRuneSpd]=useState(600),[work,setWork]=useState(null);
 const workerRef=useRef(null),sequence=useRef(0),key=active.some(c=>c.key===chosen)?chosen:active[0]?.key||'';
 const proofStamp=useMemo(()=>JSON.stringify([stamp,key,criterion,targetTick,safetyMargin,maxRuneSpd]),[stamp,key,criterion,targetTick,safetyMargin,maxRuneSpd]);
 const current=work?.stamp===proofStamp?work:null,busy=current?.busy===true,result=current?.result;
 useEffect(()=>()=>{sequence.current++;workerRef.current?.terminate();workerRef.current=null;},[proofStamp]);
 function cancel(){sequence.current++;workerRef.current?.terminate();workerRef.current=null;setWork(null);}
 function run(){
  cancel();const id=++sequence.current;
  try{const worker=new Worker(new URL('../core/tuning-minimum.worker.js',import.meta.url),{type:'module'});workerRef.current=worker;setWork({stamp:proofStamp,busy:true});
   worker.onmessage=({data})=>{if(sequence.current!==id||data.id!==id)return;worker.terminate();workerRef.current=null;setWork({stamp:proofStamp,busy:false,result:data.result,error:data.error});};
   worker.onerror=()=>{if(sequence.current!==id)return;worker.terminate();workerRef.current=null;setWork({stamp:proofStamp,busy:false,error:'Não foi possível executar a prova. Revise o cenário e tente novamente.'});};
   worker.postMessage({id,team,key,options:{criterion,targetTick,safetyMargin,maxRuneSpd}});
  }catch{setWork({stamp:proofStamp,busy:false,error:'O navegador não conseguiu iniciar a verificação local.'});}
 }
 const status=error?'BLOCKED':certificate.status;
 return <section className="tuning-certification" role="region" aria-label="Certificação do tuning">
  <header><strong>Verificação do cenário</strong><span className="tuning-certification-badge" data-status={status}>{status}</span><small>SWCALC · {certificate.parity.status}</small></header>
  <details><summary>Certificação, cobertura e prova de SPD mínima</summary>
   <p>{certificate.scope}. Validação interna não representa vitória nem paridade externa.</p>
   {error&&<p role="alert">{error}</p>}
   {certificate.reasons.length>0&&<ul>{certificate.reasons.map((r,i)=><li key={`${r.code}:${i}`}>{r.detail}</li>)}</ul>}
   <p className="tuning-parity-note">{certificate.parity.detail}</p>
   <details className="tuning-coverage"><summary>Habilidades e passivas consideradas</summary>{certificate.coverage.map(c=><div key={c.key}><strong>{c.label}</strong><span>S{c.selected.slot} · {c.selected.name} · {c.selected.coverage==='supported'?'efeito conhecido':'efeito não modelado'}{c.selected.levelKnown?` · nível ${c.selected.level}`:' · nível não informado'}</span>{c.passives.map(p=><span key={p.slot}>{p.name} · {c.oblivion?'sob Oblivion':p.coverage==='conditional'?'condicional':'não modelada'}</span>)}</div>)}</details>
   <div className="tuning-proof-controls">
    <label className="field"><span>Monstro da prova</span><select aria-label="Monstro da prova" value={key} onChange={e=>setChosen(e.target.value)}>{!active.length&&<option value="">Selecione um monstro</option>}{active.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
    <label className="field"><span>Critério</span><select aria-label="Critério da prova" value={criterion} onChange={e=>setCriterion(e.target.value)}><option value="tick">Barra pronta por tick</option><option value="rotation">Primeira rotação sem corte</option></select></label>
    {criterion==='tick'&&<label className="field"><span>Tick limite</span><input aria-label="Tick limite da prova" type="number" min="1" max="30" step="1" value={targetTick} onChange={e=>setTargetTick(Number(e.target.value))}/></label>}
    <label className="field"><span>Safety Margin · SPD de runas</span><input aria-label="Safety Margin da prova" type="number" min="0" max="100" step="1" value={safetyMargin} onChange={e=>setSafetyMargin(Number(e.target.value))}/></label>
    <label className="field"><span>Limite da busca · SPD de runas</span><input aria-label="Limite da busca de SPD" type="number" min="0" max="600" step="1" value={maxRuneSpd} onChange={e=>setMaxRuneSpd(Number(e.target.value))}/></label>
   </div>
   <p>Varia somente a SPD de runas deste monstro. As demais builds ficam fixas. Barra pronta é diferente de agir; uma margem maior também pode alterar a ordem.</p>
   <div className="tuning-proof-actions"><button type="button" className="button" disabled={!key||busy} onClick={run}>Comprovar SPD mínima</button>{busy&&<button type="button" className="button" onClick={cancel}>Cancelar prova</button>}</div>
   {busy&&<p role="status">Verificando velocidades inteiras no simulador local…</p>}
   {current?.error&&<p role="alert">{current.error}</p>}
   {result&&<section className="tuning-proof-result" role="region" aria-label="Resultado da prova de SPD" data-status={result.status}>
    <strong>{result.status} · prova limitada ao cenário</strong><p>{result.reason}</p>
    {result.minimum!=null&&<><dl><div><dt>Mínimo matemático no intervalo</dt><dd>+{result.minimum} SPD de runas</dd></div><div><dt>Margem escolhida</dt><dd>+{result.planned?.safetyMargin??safetyMargin} SPD</dd></div><div><dt>Meta com margem</dt><dd>+{result.planned?.runeSpd} SPD de runas</dd></div><div><dt>SPD de runas no cenário atual</dt><dd>+{result.actualRuneSpd}</dd></div></dl><p>{result.delta>0?`Faltam +${result.delta} SPD de runas para o mínimo.`:`O cenário atual possui ${Math.abs(result.delta)} SPD de runas acima do mínimo.`}</p><p>{result.below?`Limite inferior: +${result.below.runeSpd} SPD ${result.below.passed?'atendeu':'não atendeu'} ao critério.`:'O mínimo é zero; não há contribuição inteira não negativa inferior.'}</p><p>Meta com margem reavaliada: <strong>{result.planned?.passed?'critério atendido':'critério NÃO atendido'}</strong>. {criterion==='tick'?'Isso confirma prontidão da barra, não ausência de corte.':''}</p></>}
    <small>{result.scope} {result.checked} candidatos avaliados até encontrar o mínimo ou atingir o limite de +{result.bound}. Nenhuma velocidade ou equipamento foi aplicado.</small>
   </section>}
  </details>
 </section>;
}
