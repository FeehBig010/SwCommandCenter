import {useEffect,useId,useRef,useState} from 'react';
import {MONSTER_CATALOG} from '../core/monsters';
import {quickSkillOptions} from '../core/quick-skill-effects';
import {DEFENDER_ACTIONS,siege3v3Presets} from '../core/siege-3v3';

const initial=(team)=>Array.from({length:3},(_,i)=>{
 const d=team.combatScenario?.enemies?.[i]||team.enemyDefense?.[i]||{};
 return {master:d.master||d.masterId||'',hp:'',def:'',spd:d.spd||d.combatSpd||'',mode:'unknown',required:i===0,combat:{...d.combat}};
});
const format=n=>Math.round(n).toLocaleString('pt-BR');
const rangeText=r=>r?(r[0]===r[1]?format(r[0]):r.map(format).join('–')):'Sem projeção';
const effectTargets=['ally:0','ally:1','ally:2','enemy:0','enemy:1','enemy:2'];
const statusText={'READY':'Condições modeladas atendidas. Projeção da primeira rotação.',CONDITIONAL:'Depende dos ramos ou do dano incerto.',BLOCKED:'Conflito de equipamento, corte ou dano insuficiente nos ramos.', 'REVIEW REQUIRED':'Há dados ou mecânicas relevantes sem cobertura.'};
const outcomeText={reaches:'Faixa atinge HP',short:'Faixa abaixo do HP',conditional:'Faixa cruza o HP',unknown:'Dano desconhecido'};

export default function Siege3v3Panel({account,team,options,reservedIds,allTeams,enabled,alternative}){
 const listId=useId();
 const presets=siege3v3Presets(account,team);
 const [defenders,setDefenders]=useState(()=>initial(team));
 const [attackTargets,setAttackTargets]=useState({});
 const [ignorePercent,setIgnore]=useState('');
 const [selected,setSelected]=useState([]);
 const [protectedPresets,setProtected]=useState([]);
 const protectedOptions=(account?.accountPresets||[]).filter(p=>p.equipment?.length);
 const [useAlternative,setUseAlternative]=useState(false);
 const [manualBase,setManualBase]=useState('');
 const [manualRunes,setManualRunes]=useState({});
 const [state,setState]=useState({});
 const worker=useRef(null);
 const signature=JSON.stringify([team,options,reservedIds,allTeams,defenders,attackTargets,ignorePercent,selected,protectedPresets,useAlternative,alternative?.builds,manualBase,manualRunes]);
 const view=state.signature===signature&&state.account===account?state:{};
 const cancel=()=>{worker.current?.terminate();worker.current=null;};
 useEffect(()=>()=>cancel(),[]);
 const update=(i,patch)=>setDefenders(current=>current.map((d,j)=>j===i?{...d,...patch}:d));
 const attackChoices=team.configs.filter(c=>c.key!==team.configs.find(v=>[26811,26311].includes(Number(v.masterId)))?.key);
 const toggle=(setter,id,on)=>setter(prev=>on?[...prev,id]:prev.filter(x=>x!==id));
 function submit(event){
  event.preventDefault();
  if(!enabled||!account)return;
  cancel();
  const profiles=selected.map(id=>({presetId:id,label:presets.find(p=>p.id===id)?.name||'Preset'}));
  if(useAlternative&&alternative?.builds)profiles.push({presetId:team.sourceDeckId||undefined,label:'Alternativa da busca',runes:Object.fromEntries(alternative.builds.map(b=>[b.key,b.runeIds]))});
  if(manualBase)profiles.push({presetId:manualBase,label:'Alternativa por IDs',runes:Object.fromEntries(team.configs.map(c=>[c.key,(manualRunes[c.key]||'').trim().split(/[\s,]+/).filter(Boolean).map(Number)]))});
  const identity={signature,account};
  if(profiles.length>3){setState({...identity,error:'Selecione até três configurações para comparar.'});return;}
  const job=new Worker(new URL('../core/optimizer.worker.js',import.meta.url),{type:'module'});
  worker.current=job;
  setState({...identity,busy:true});
  job.onmessage=({data})=>{if(worker.current===job){cancel();setState({...identity,result:data.result,error:data.message});}};
  job.onerror=()=>{if(worker.current===job){cancel();setState({...identity,error:'Não foi possível executar a validação.'});}};
  job.postMessage({mode:'siege-3v3',account,team,options,reservedIds,allTeams,scenario:{defenders,attackTargets,ignorePercent,profiles,protectedPresets}});
 }
 return <details className="optimizer-calculation-summary"><summary>Validação de Siege 3v3</summary>
  <form onSubmit={submit} aria-label="Validação de Siege 3v3">
   <p>Informe SPD antes de buff ou slow. A habilidade identifica a ação; selecione o efeito já resolvido para entrar na fila. Dano projetado usa variação de 0,972–1,028 e não retira defensores da fila.</p>
   <datalist id={listId}>{MONSTER_CATALOG.map(u=><option key={u.master} value={u.master}>{u.name}</option>)}</datalist>
   {defenders.map((d,i)=><fieldset key={i} className="damage-fields"><legend>Defensor {i+1}</legend>
    <label className="field"><span>Monstro {i+1} (ID no catálogo)</span><input list={listId} required value={d.master} onChange={e=>update(i,{master:e.target.value,skillSlot:''})}/></label>
    {[['hp','HP',1],['def','DEF',0],['spd','SPD',1],['initialAtb','ATB inicial (%)',0],['damageReduction','Redução de dano (%)',0],['critDamageReduction','Redução de DC (%)',0],['nemesisSets','Sets Nemesis',0]].map(([key,label,min])=>
     <label className="field" key={key}><span>{label}</span><input type="number" required={['hp','def','spd'].includes(key)} min={min} max={key==='nemesisSets'?3:['hp','def','spd'].includes(key)?undefined:100}
      value={d[key]??''} onChange={e=>update(i,{[key]:e.target.value})}/></label>)}
    {[['hpPercent','HP inicial (%)',1],['artifactSpd','Artefato · SPD adicional',0],['artifactSpdBuff','Artefato · efeito do buff SPD (%)',0],['artifactSpdLostHp','Artefato · SPD por HP perdido (%)',0],['artifactSpdDisabled','Artefato · SPD sob incapacidade (%)',0],['buffCount','Buffs para passivas',0]].map(([key,label,min])=><label className="field" key={key}><span>{label}</span><input type="number" min={min} max="100" value={d.combat[key]??''} onChange={e=>update(i,{combat:{...d.combat,[key]:e.target.value===''?undefined:Number(e.target.value)}})}/></label>)}
    <label className="field"><span>Primeira habilidade</span><select value={d.skillSlot??''} onChange={e=>update(i,{skillSlot:e.target.value})}><option value="">Não informada</option>{quickSkillOptions(d.master).filter(s=>!s.isPassive).map(s=><option key={s.slot} value={s.slot}>S{s.slot} · {s.name}</option>)}</select></label>
    <label className="field"><span>Efeito da primeira ação</span><select aria-label="Efeito da primeira ação" value={d.mode} onChange={e=>update(i,{mode:e.target.value})}>{Object.entries(DEFENDER_ACTIONS).map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></label>
    {!['none','unknown'].includes(d.mode)&&<label className="field"><span>Alvo do efeito</span><select value={d.target??(d.mode==='boost'?`enemy:${i}`:'ally:0')} onChange={e=>update(i,{target:e.target.value})}>{effectTargets.map((key,j)=><option key={key} value={key}>{j<3?team.configs[j].label:`Defensor ${j-2}`}</option>)}</select></label>}
    {['boost','reduce','damage'].includes(d.mode)&&<label className="field"><span>Quantidade (%)</span><input required type="number" min="0" max="100" value={d.amount??''} onChange={e=>update(i,{amount:e.target.value})}/></label>}
    {d.mode==='damage'&&<label className="field"><span>Tipo do golpe resolvido</span><select value={d.critical?'critical':d.glancing?'glancing':'normal'} onChange={e=>update(i,{critical:e.target.value==='critical',glancing:e.target.value==='glancing'})}><option value="normal">Comum</option><option value="critical">Crítico</option><option value="glancing">Glancing</option></select></label>}
    {[['required','Eliminar na rotação'],['defenseBuff','Buff DEF'],['will','Will'],['unmodeled','Efeito relevante sem cobertura']].map(([k,label])=><label key={k} className="check-label"><input type="checkbox" checked={d[k]===true} onChange={e=>update(i,{[k]:e.target.checked})}/>{label}</label>)}
    {[['speedBuff','Buff SPD'],['slow','Slow'],['disabled','Incapacidade'],['oblivion','Oblivion']].map(([k,label])=><label key={k} className="check-label"><input type="checkbox" checked={d.combat[k]===true} onChange={e=>update(i,{combat:{...d.combat,[k]:e.target.checked}})}/>{label}</label>)}
   </fieldset>)}
   <div className="damage-fields">{attackChoices.map(c=><label key={c.key} className="field"><span>Alvo de {c.label}</span><select value={attackTargets[c.key]??0} onChange={e=>setAttackTargets(t=>({...t,[c.key]:Number(e.target.value)}))}>{defenders.map((_,i)=><option key={i} value={i}>Defensor {i+1}</option>)}</select></label>)}
    <label className="field"><span>Ignore DEF em 3v3 (%)</span><input type="number" min="0" max="100" step="any" placeholder="Faixa 0–100%" value={ignorePercent} onChange={e=>setIgnore(e.target.value)}/></label>
   </div>
   <details><summary>Comparar até três configurações</summary>
    <p>Sem seleção, usa a configuração atual.</p>
    {presets.map(p=><label className="check-label" key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={e=>toggle(setSelected,p.id,e.target.checked)}/>{p.name}</label>)}
    {alternative?.builds&&<label className="check-label"><input type="checkbox" checked={useAlternative} onChange={e=>setUseAlternative(e.target.checked)}/>Alternativa da última busca</label>}
    <label className="field"><span>Preset dos artefatos da alternativa por IDs</span><select value={manualBase} onChange={e=>setManualBase(e.target.value)}><option value="">Sem alternativa por IDs</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    {manualBase&&team.configs.map(c=><label className="field" key={c.key}><span>Seis IDs de runa de {c.label}</span><input required value={manualRunes[c.key]||''} onChange={e=>setManualRunes(v=>({...v,[c.key]:e.target.value}))}/></label>)}
   </details>
   {!!protectedOptions.length&&<details><summary>Presets que devem permanecer disponíveis</summary>
    <label className="field"><span>Selecionar presets protegidos</span><select multiple value={protectedPresets} onChange={e=>setProtected([...e.target.selectedOptions].map(o=>o.value))}>{protectedOptions.map(p=><option key={p.id} value={p.id}>{p.name} · {p.gameMode}</option>)}</select></label>
   </details>}
   {view.busy?<button className="button small" type="button" onClick={()=>{cancel();setState({});}}>Cancelar validação</button>:<button className="button primary small" disabled={!enabled||!account}>Validar defesa 3v3</button>}
  </form>
  {view.error&&<p role="alert">{view.error}</p>}
  {view.result&&<ValidationResults result={view.result}/>}
 </details>;
}

function ValidationResults({result}){
 if(result.issue)return <p role="status">REVIEW REQUIRED · {result.issue}</p>;
 const labels=Object.fromEntries(result.defenders.map(d=>[d.key,d.label]));
 return <div aria-live="polite">{result.reports.map((r,i)=>{
  const names={...labels,...Object.fromEntries(r.equipment.map(e=>[e.key,e.name]))};
  return <article className="optimizer-calculation-summary" key={i}><h4>{r.label} · {r.status}</h4>
   <p>{statusText[r.status]}</p>
   <ul>{[...r.conflicts,...r.issues].map(issue=><li key={issue}>{issue}</li>)}</ul>
   {r.branches.map(b=><details key={b.strip} open={b.strip===0}><summary>{b.strip?'Com strip hipotético':'Sem strip'} · {b.cut?'interrupção na fila':'sem interrupção na fila'}</summary>
    <ol className="siege-3v3-turns" aria-label="Linha do tempo">{b.turns.map(t=><li key={t.tick} data-enemy={t.enemy}><strong>T{t.tick}</strong> {names[t.key]}{t.disabled?' · impedido':''} · SPD {format(t.spd)} · ATB {format(t.atb)}%</li>)}</ol>
    <ul>{b.events.map((e,j)=><li key={j}>T{e.tick} · {names[e.source]} · {e.type}{e.amount?` · quantidade informada ${e.amount}`:''} {e.targets.map(k=>names[k]).join(', ')}</li>)}</ul>
    <ul>{b.targets.map(t=><li key={t.key}>{t.label} ({Number(t.key.slice(-1))+1}) · HP {format(t.hp)} · {rangeText(t.range)} de dano · {outcomeText[t.outcome]}{t.required?' · obrigatório':''}{t.ignoreDependency?' · depende do ignore informado':''}</li>)}</ul>
    <details><summary>Limitações do ramo</summary><ul>{[...new Set([...b.risks,...b.targets.flatMap(t=>t.risks)])].map(risk=><li key={risk}>{risk}</li>)}</ul></details>
   </details>)}
   <details><summary>Equipamentos e proprietários</summary><ul>{r.equipment.map(e=><li key={e.key}>{e.name} #{e.unitId} · Runas {e.runeIds.join(', ')||'incompletas'} · Artefatos {e.artifactIds.join(', ')||'—'}</li>)}{r.notes.map(note=><li key={note}>{note}</li>)}</ul></details>
  </article>;
 })}</div>;
}
