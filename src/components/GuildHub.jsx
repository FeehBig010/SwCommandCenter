import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Plus, Pencil, Trash2, Play, Square, Users } from 'lucide-react';
import { MonsterEditor } from './TeamEditor';
import MonsterPortrait from './MonsterPortrait';
import Results from './Results';
import { LABELS, SETS, STAT_NAMES } from '../core/data';
import { downloadJSON } from '../core/storage';
import { bindTemplate, cleanTemplate, newTemplate, parseTemplateFile, templateDraft, templateFile, templateMissing } from '../core/guild';

const fmt=n=>Number(n).toLocaleString('pt-BR');
export default function GuildHub({templates,onChange,account,options,reservedIds=[]}){
 const [draft,setDraft]=useState(null),[notice,setNotice]=useState(''),[active,setActive]=useState(null);
 const [result,setResult]=useState(null),[progress,setProgress]=useState(null),[running,setRunning]=useState(false);
 const fileRef=useRef(),workerRef=useRef();
 const context=JSON.stringify([account?.id,account?.importedAt,options,reservedIds,templates]);
 useEffect(()=>{
  workerRef.current?.terminate();workerRef.current=null;
  setRunning(false);setProgress(null);setActive(null);setResult(null);
 },[context]);
 useEffect(()=>()=>workerRef.current?.terminate(),[]);
 function cancel(){workerRef.current?.terminate();workerRef.current=null;setRunning(false);setProgress(null);}
 function run(template,team=bindTemplate(template,account)){
  cancel();setNotice('');setResult(null);setActive({template,team});
  if(!account){setNotice('Importe seu JSON do SWEX para testar este template.');return;}
  const missing=templateMissing(team);
  if(missing.length){setNotice(`Monstros ou cópias ausentes na sua conta: ${missing.join(', ')}. Nenhuma unidade será substituída por outro monstro.`);return;}
  if(new Set(team.configs.map(c=>c.unitId)).size!==3){setNotice('Selecione três cópias distintas da conta.');return;}
  const worker=new Worker(new URL('../core/optimizer.worker.js',import.meta.url),{type:'module'});
  workerRef.current=worker;setRunning(true);setProgress({percent:0,message:'Comparando com as metas da liderança…'});
  worker.onmessage=({data})=>{
   if(workerRef.current!==worker)return;
   if(data.type==='progress'){setProgress(data);return;}
   worker.terminate();workerRef.current=null;setRunning(false);setProgress(null);
   if(data.type==='error')setNotice(data.message);else setResult(data.result);
  };
  worker.onerror=()=>{if(workerRef.current!==worker)return;cancel();setNotice('Não foi possível concluir o teste. Tente reduzir a profundidade da busca.');};
  // A matching report describes the member's current equipment, never hypothetical gems.
  worker.postMessage({account,teams:[team],options:{...options,maxGrindsGems:false},reservedIds});
 }
 function saveDraft(event){
  event.preventDefault();
  try{
   const clean=cleanTemplate(draft);
   if(templates.length>=100&&!templates.some(t=>t.id===clean.id))throw new Error('Limite de 100 templates por biblioteca.');
   onChange(templates.some(t=>t.id===clean.id)?templates.map(t=>t.id===clean.id?clean:t):[clean,...templates]);
   setDraft(null);setNotice('Template salvo neste navegador. Exporte o arquivo para compartilhar.');
  }catch(error){setNotice(error.message);}
 }
 async function importTemplates(file){
  if(!file)return;
  try{
   if(file.size>1000000)throw new Error('Arquivo muito grande. Use até 1 MB.');
   const imported=parseTemplateFile(JSON.parse(await file.text()));
   if(templates.length+imported.length>100)throw new Error('A biblioteca pode conter até 100 templates.');
   onChange([...imported,...templates]);setNotice(`${imported.length} template(s) importado(s). Confira as metas antes de testar.`);
  }catch(error){setNotice(error instanceof SyntaxError?'O arquivo não contém JSON válido.':error.message);}
  finally{fileRef.current.value='';}
 }
 function exportTemplates(items){
  try{downloadJSON(templateFile(items),'d8stino-templates.json');setNotice('Arquivo exportado. Compartilhe pelo Discord ou WhatsApp.');}
  catch(error){setNotice(error.message);}
 }
 return <div className="guild-hub">
  <div className="page-intro"><h1>Estratégias da guilda.</h1><p>Composições da liderança, testadas nas suas runas.</p></div>
  <div className="notice guild-privacy"><Users size={18}/><p>Biblioteca local de templates Siege/WGB. Crie recomendações e compartilhe o JSON com a guilda. Seu inventário e seus dados de conta não entram no arquivo.</p></div>
  <div className="section-toolbar guild-toolbar"><h2>Templates <span className="count">{templates.length}</span></h2><div className="button-group">
   <button className="button outline small" onClick={()=>fileRef.current.click()}><Upload size={15}/>Importar templates</button>
   <button className="button outline small" disabled={!templates.length} onClick={()=>exportTemplates(templates)}><Download size={15}/>Exportar todos</button>
   <button className="button primary small" disabled={templates.length>=100} onClick={()=>{cancel();setDraft(newTemplate());setNotice('');}}><Plus size={15}/>Novo template</button>
  </div></div>
  <input ref={fileRef} hidden type="file" accept=".json,application/json" aria-label="Arquivo de templates" onChange={e=>importTemplates(e.target.files[0])}/>
  {notice&&<p className="notice" role="status">{notice}</p>}
  {draft&&<form className="template-editor team-panel" onSubmit={saveDraft}>
   <div className="template-editor-header"><h2>{templates.some(t=>t.id===draft.id)?'Editar template':'Criar template de liderança'}</h2>
    <label className="field"><span>Nome da composição</span><input aria-label="Nome do template" required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
    <label className="field"><span>Orientações da liderança</span><textarea aria-label="Orientações da liderança" maxLength={1000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Quando usar esta composição, ordem dos turnos…"/></label>
    <div className="three-fields">{[['towerSpd','Torre SPD (%)'],['leaderSpd','Líder SPD (%)'],['enemyCombatSpd','SPD de combate inimiga']].map(([key,label])=><label className="field" key={key}><span>{label}</span><input aria-label={`${label} do template`} type="number" min="0" max={key==='enemyCombatSpd'?1000:100} value={draft.team[key]} onChange={e=>setDraft({...draft,team:{...draft.team,[key]:e.target.value}})}/></label>)}</div>
    <p className="fineprint">Três monstros. Sets selecionados e atributos principais são obrigatórios. Metas de SPD usam a ficha; ordem vinculada usa SPD de combate.</p>
   </div>
   <div className="monster-grid slots-3">{draft.team.configs.map((c,index)=><MonsterEditor key={c.key} config={c} index={index} slotCount={3} catalogMode onChange={config=>setDraft({...draft,team:{...draft.team,configs:draft.team.configs.map((old,i)=>i===index?config:old)}})}/>)}</div>
   <div className="template-editor-actions"><button type="button" className="button" onClick={()=>{setDraft(null);setNotice('');}}>Cancelar edição</button><button className="button primary" type="submit">Salvar template</button></div>
  </form>}
  {!templates.length&&!draft&&<div className="empty-results"><Users size={30}/><p>Nenhuma composição compartilhada ainda.</p><small>Crie um template com três monstros ou importe o arquivo enviado pela liderança.</small></div>}
  <div className="template-list">{templates.map(template=><article className="template-card" key={template.id}>
   <div className="template-card-heading"><h2>{template.name}</h2><span className="template-badge">Siege / WGB · 3 monstros</span></div>
   {template.description&&<p className="template-description">{template.description}</p>}
   <div className="template-lineup">{template.team.configs.map((c,i)=><div key={i}><MonsterPortrait master={c.masterId} name={c.label}/><span>{c.label}</span></div>)}</div>
   <details className="template-requirements"><summary>Ver metas da liderança</summary>{template.team.configs.map((c,i)=><article key={i}><strong>{i+1}. {c.label}</strong><p>Sets: {c.sets.map(id=>SETS[id]).join(' / ')||'Livres'} · Slots 2/4/6: {[2,4,6].map(slot=>STAT_NAMES[c.mains[slot]]||'Livre').join(' / ')}</p><p>{Object.entries(c.goals).filter(([,value])=>Number(value)>0).map(([key,value])=>`${LABELS[key]} ${fmt(value)}`).join(' · ')||'Sem metas numéricas'} · {c.basis==='bonus'?'Adicionais (+)':'Totais'}{c.lockSpeedSync?' · SPD vinculada':''}</p></article>)}</details>
   <div className="button-group"><button className="button primary small" disabled={running} onClick={()=>run(template)}><Play size={15}/>Testar no meu JSON</button>
    <button className="button small" onClick={()=>{cancel();setDraft(templateDraft(template));setNotice('');}}><Pencil size={15}/>Editar</button>
    <button className="button small" aria-label={`Exportar ${template.name}`} onClick={()=>exportTemplates([template])}><Download size={15}/>Exportar</button>
    <button className="icon-button" aria-label={`Excluir ${template.name}`} onClick={()=>onChange(templates.filter(t=>t.id!==template.id))}><Trash2 size={16}/></button>
   </div>
  </article>)}</div>
  {active&&<section className="template-match" aria-label="Teste de template">
   <h2>Comparação · {active.template.name}</h2><p className="fineprint">Runas atuais, sem projeção de gems/grinds. Filtros da busca e reservas de builds salvas são respeitados. A seleção inicial usa a cópia de maior nível; confira as instâncias.</p>
   {account&&<><fieldset className="match-units" disabled={running}>{active.team.configs.map((c,index)=><label className="field" key={c.key}><span>{index+1}. {c.label} · cópia da conta</span><select aria-label={`Cópia de ${c.label} na posição ${index+1}`} value={c.unitId||''} onChange={e=>{setResult(null);setNotice('');setActive({...active,team:{...active.team,configs:active.team.configs.map((old,i)=>i===index?{...old,unitId:Number(e.target.value)||null}:old)}});}}><option value="">Ausente / selecionar</option>{account.units.filter(u=>u.master===c.masterId).map(u=><option value={u.id} key={u.id}>{u.name} · Nv.{u.level} · #{String(u.id).slice(-5)}</option>)}</select></label>)}</fieldset>
    <button className="button small" onClick={()=>running?cancel():run(active.template,active.team)}>{running?<><Square size={15}/>Cancelar teste</>:<><Play size={15}/>Testar cópias selecionadas</>}</button></>}
   {progress&&<div className="progress-panel" role="status"><span>{progress.message}</span><progress max="100" value={progress.percent}/></div>}
   {result&&account&&<div className="guild-deficits" aria-live="polite">
    <h3>{result.status==='met'?'Sua conta atende às metas encontradas':'Déficits para a meta da liderança'}</h3>
    {result.builds.map(build=><article className="deficit-card" key={build.key}><strong>{build.name}</strong><p className={build.goals.every(g=>g.met)?'status-good':'status-warn'}>{build.goals.some(g=>!g.met)?`${build.goals.filter(g=>!g.met).map(g=>`−${fmt(g.missing)} ${LABELS[g.key]}`).join(' · ')} para atingir a meta da liderança`:'Metas atingidas nesta combinação.'}</p></article>)}
    {!result.builds.length&&<p className="notice warning">A busca não encontrou uma distribuição compatível com os sets, atributos principais, reservas ou ordem de SPD. Sem build válida, não é possível calcular déficits numéricos confiáveis.</p>}
    <p className="fineprint">Busca heurística conjunta: os três monstros não repetem runas. Um déficit ou falha desta busca não comprova impossibilidade com todo o inventário.</p>
    <Results result={result} account={account}/>
   </div>}
  </section>}
 </div>;
}
