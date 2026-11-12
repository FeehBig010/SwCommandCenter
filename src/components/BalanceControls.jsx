import {useEffect,useRef,useState,useMemo} from 'react';
import {LockKeyhole,Unlock,Settings2,Gem,Check,ArrowLeft,ArrowRight,X,Search} from 'lucide-react';
import {STATS,LABELS,SETS,STAT_NAMES,FOUR} from '../core/data';
import {quickSpeedTarget} from '../core/quick-calculator';
import {SLOT_MAINS} from '../core/guild';
import {balanceProfile,balanceInventory,balanceUnit,balanceChecks} from '../core/balance-profile';
const format=n=>new Intl.NumberFormat('pt-BR').format(Math.round(Number(n)||0));
export const setImage=id=>`/game-icons/runes/${String(SETS[id]||'').toLowerCase()}.png`;
function Disclosure({label,children,kind='',disabled=false}){
 const root=useRef(),[position,setPosition]=useState({});
 const place=()=>{if(!root.current?.open)return;const rect=root.current.querySelector('summary').getBoundingClientRect(),width=Math.min(340,innerWidth-24),height=Math.min(620,innerHeight-90,root.current.querySelector('.balance-popover').scrollHeight+4);setPosition({position:'fixed',width,left:Math.max(12,Math.min(rect.left,innerWidth-width-12)),top:Math.max(12,Math.min(rect.bottom+8,innerHeight-height-12)),maxHeight:height,transform:'none'});};
 useEffect(()=>{const reposition=()=>place();window.addEventListener('resize',reposition);window.addEventListener('scroll',reposition,true);return()=>{window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true);};},[]);
 useEffect(()=>{const escape=e=>{if(e.key==='Escape'&&!e.defaultPrevented&&root.current?.open&&!document.querySelector('dialog[open]')){e.preventDefault();root.current.open=false;root.current.querySelector('summary').focus();}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[]);
 useEffect(()=>{const close=e=>{if(root.current?.open&&!root.current.contains(e.target))root.current.open=false;};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 return <details ref={root} className={`balance-disclosure ${kind}`} name="balance-controls" onToggle={e=>{if(root.current?.open)place();}} onKeyDown={e=>{if(e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();root.current.open=false;root.current.querySelector('summary').focus();}}}>
  <summary aria-disabled={disabled||undefined} onClick={e=>{e.preventDefault();if(disabled)return;root.current.open=!root.current.open;if(root.current.open)place();}}><Settings2 size={13}/>{label}</summary>
  <div className="balance-popover" style={position} role="region" aria-label={label}><header><strong>{label}</strong><button type="button" className="icon-button" aria-label={`Fechar ${label}`} onClick={()=>{root.current.open=false;root.current.querySelector('summary').focus();}}><X size={16}/></button></header>{children}</div>
 </details>;
}
export function BalancePreferences({config,onChange}){
 const p=balanceProfile(config),set=next=>onChange({...config,balance:{...p,...next}});
 const rule=stat=><div className="balance-stat-rule" key={stat}>
   <span>{LABELS[stat]}{['cr','cd','res','acc'].includes(stat)?'%':''}</span>
   <input aria-label={`Prioridade ${LABELS[stat]} de ${config.label}`} type="range" min="1" max="5" step="1" disabled={!p.weights[stat]} value={p.weights[stat]||1} onChange={e=>set({weights:{...p.weights,[stat]:Number(e.target.value)}})}/>
   <input aria-label={`Mínimo ${LABELS[stat]} de ${config.label}`} placeholder="—" type="number" min="0" max="1000000" value={p.minimums[stat]??''} onChange={e=>set({minimums:{...p.minimums,[stat]:e.target.value===''?null:Number(e.target.value)}})}/>
   <input aria-label={`Exigir mínimo ${LABELS[stat]} de ${config.label}`} type="checkbox" disabled={p.minimums[stat]==null} checked={p.minimums[stat]!=null&&p.required[stat]} onChange={e=>set({required:{...p.required,[stat]:e.target.checked}})}/>
  </div>;
 return <Disclosure label={`Prioridades e mínimos · ${config.label}`} disabled={!config.masterId} kind="balance-preferences">
  <div className="balance-attribute-chips">{STATS.map(stat=><label key={stat}><input type="checkbox" checked={p.weights[stat]>0} onChange={e=>set({weights:{...p.weights,[stat]:e.target.checked?3:0}})}/>{LABELS[stat]}{['cr','cd','res','acc'].includes(stat)?'%':''}</label>)}</div>
  <div className="balance-pref-label"><span>Atributo</span><span>Peso</span><span>Mínimo</span><span title="Uma exigência não atendida permite apenas diagnóstico.">Exigir</span></div>
  {STATS.filter(stat=>p.weights[stat]>0).map(rule)}
  <details className="balance-other-minimums"><summary>Mínimos para outros atributos</summary>{STATS.filter(stat=>!p.weights[stat]).map(rule)}</details>
  <small>SPD de combate · demais atributos da ficha</small>
  <details className="balance-equipment-rules"><summary>Conjuntos e principais</summary><div className="balance-pref-subtitle">Conjuntos <span>Obrigatório ou preferência</span></div>
  {[0,1,2].map(i=><div className="balance-set-rule" key={i}><select aria-label={`Conjunto ${i+1} de ${config.label}`} value={p.sets[i]?.set||0} onChange={e=>{const sets=[...p.sets];sets[i]={set:Number(e.target.value),required:sets[i]?.required||false};set({sets:sets.filter(r=>r?.set)});}}><option value="0">Qualquer conjunto</option>{Object.entries(SETS).filter(([id])=>Number(id)!==25).sort((a,b)=>Number(FOUR.has(Number(b[0])))-Number(FOUR.has(Number(a[0])))||a[1].localeCompare(b[1])).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select><label><input type="checkbox" disabled={!p.sets[i]?.set} checked={p.sets[i]?.required||false} onChange={e=>set({sets:p.sets.map((r,j)=>i===j?{...r,required:e.target.checked}:r)})}/>Exigir</label></div>)}
  <div className="balance-pref-subtitle">Atributos principais</div>
  {[2,4,6].map(slot=><div className="balance-set-rule" key={slot}><select aria-label={`Principal slot ${slot} de ${config.label}`} value={p.mains[slot].stat} onChange={e=>set({mains:{...p.mains,[slot]:{...p.mains[slot],stat:Number(e.target.value)}}})}>{SLOT_MAINS[slot].map(stat=><option key={stat} value={stat}>Slot {slot} · {STAT_NAMES[stat]||'Livre'}</option>)}</select><label><input type="checkbox" disabled={!p.mains[slot].stat} checked={p.mains[slot].required} onChange={e=>set({mains:{...p.mains,[slot]:{...p.mains[slot],required:e.target.checked}}})}/>Exigir</label></div>)}
  </details>
 </Disclosure>;
}
export function BalanceSheet({config,account,team,checks=[],onRune,build,unit}){
 const p=balanceProfile(config),byId=useMemo(()=>new Map((account?.runes||[]).map(r=>[r.id,r])),[account]),ids=build?.runeIds||unit?.runeIds||[],runes=ids.map(id=>byId.get(id)).filter(Boolean),base=config.manual.base,total=config.manual.sheet;
 const artifacts=(account?.artifacts||[]).filter(a=>(build?.artifactIds||unit?.artifactIds||[]).includes(a.id));
 const counts={};for(const r of runes)counts[r.set]=(counts[r.set]||0)+1;
 if(!checks.length&&config.masterId)checks=balanceChecks({stats:{total,combat:{spd:quickSpeedTarget(team,config)?.combatSpd||0}},counts,runeIds:ids},config,byId);
 const flag=stat=>checks.find(c=>c.kind==='minimum'&&c.stat===stat);
 return <div className="balance-build-sheet">
  <div className="balance-equipment"><dl className="balance-primary-stats">{['hp','atk','def','spd'].map(stat=>{const f=flag(stat);return <div key={stat} data-goal={f?(f.met?'met':'miss'):undefined} title={f?`Meta ${f.target} · ${f.required?'Obrigatória':'Preferência'} · ${f.met?'Atendida':'Não atendida'}`:undefined}><dt>{LABELS[stat]}</dt><dd><span>{config.masterId?format(base[stat]):'—'}</span><strong>{config.masterId?`${Number(total[stat])>=Number(base[stat])?'+':''}${format(Number(total[stat])-Number(base[stat]))}`:'—'}</strong>{f&&<span className="balance-goal-dot">{f.met?<Check size={11}/>:<X size={11}/>}</span>}</dd></div>;})}</dl>
   <div className="balance-rune-wheel" aria-label={`Runas de ${config.label}`}>{[1,2,3,4,5,6].map(slot=>{const rune=runes.find(r=>r.slot===slot),pinned=!!p.pins[slot];return <button type="button" key={slot} disabled={!account||!config.masterId||!unit} className={`balance-rune-stone rune-slot-${slot} ${rune?'equipped':'empty'} ${pinned?'pinned':''}`} aria-label={`Escolher runa slot ${slot} de ${config.label}`} title={rune?`${SETS[rune.set]} +${rune.level} · ID ${rune.id}${pinned?` · Peça exigida para busca: #${p.pins[slot]}`:''}`:`Slot ${slot} sem equipamento${pinned?` · Peça exigida para busca: #${p.pins[slot]}`:''}`} onClick={()=>onRune(slot)}>
    <img className="balance-rune-shape" src={`/game-icons/runes/rune${slot}.png`} alt="" loading="lazy"/>{rune&&SETS[rune.set]&&<img className="balance-rune-glyph" src={setImage(rune.set)} alt={SETS[rune.set]} loading="lazy"/>}<span>{slot}</span>{pinned&&<LockKeyhole className="balance-pin" size={10}/>}</button>;})}<div className="balance-artifacts">{[0,1].map(i=><span key={i} className={artifacts[i]?'equipped':''} title={artifacts[i]?`Artefato ${artifacts[i].id} · +${artifacts[i].level}`:'Artefato não informado'}><Gem size={17}/><small>{artifacts[i]?`+${artifacts[i].level}`:'—'}</small></span>)}</div></div>
  </div>
  <dl className="balance-secondary-stats">{['cr','cd','res','acc'].map(stat=>{const f=flag(stat);return <div key={stat} data-goal={f?(f.met?'met':'miss'):undefined} title={f?`Meta ${f.target}% · ${f.met?'Atendida':'Não atendida'}`:undefined}><dt>{LABELS[stat]}</dt><dd>{config.masterId?`${format(total[stat])}%`:'—'}{f&&<span className="balance-goal-dot" aria-label={f.met?'Meta atendida':'Meta não atendida'}>{f.met?<Check size={10}/>:<X size={10}/>}</span>}</dd></div>;})}</dl>
  <div className="balance-set-badges">{config.sets.filter(Boolean).length?config.sets.filter(Boolean).sort((a,b)=>Number(FOUR.has(b))-Number(FOUR.has(a))).map((id,i)=><span key={`${id}-${i}`}><img src={setImage(id)} alt="" loading="lazy"/>{SETS[id]}</span>):<span>{runes.length?'Conjuntos incompletos':'Sem runas informadas'}</span>}</div>
 </div>;
}
export function BalanceRunePicker({account,team,config,options,reservedIds,allTeams,slot,onSlot,onChange,open,onClose}){
 const [filter,setFilter]=useState(''),[setFilterId,selectSet]=useState(0),[page,setPage]=useState(0),root=useRef();
 const p=balanceProfile(config),scope=useMemo(()=>account?balanceInventory(account,team,options,reservedIds,allTeams):null,[account,team,options,reservedIds,allTeams]),unit=account?balanceUnit(account,team,config):null;
 const otherPins=new Set(team.configs.filter(c=>c.key!==config.key).flatMap(c=>Object.values(balanceProfile(c).pins)));
 const runes=(scope?.runes||[]).filter(r=>r.slot===slot&&scope.allowed(r,unit||{id:-1,runeIds:[]})&&!otherPins.has(r.id)&&(!setFilterId||r.set===setFilterId)&&`${r.id} ${SETS[r.set]} ${STAT_NAMES[r.main?.[0]]}`.toLowerCase().includes(filter.toLowerCase()));
 useEffect(()=>{setPage(0);},[slot,filter,setFilterId]);
 useEffect(()=>{if(open&&!root.current.open)root.current.showModal();else if(!open&&root.current.open)root.current.close();},[open]);
 return <dialog ref={root} className="balance-rune-dialog" aria-label={`Escolher runas · ${config.label}`} onCancel={onClose} onClose={onClose} onClick={e=>{if(e.target===root.current)onClose();}}><div className="balance-dialog-content"><header><div><small>PEÇA EXATA DO JSON</small><h2>Runas · {config.label}</h2></div><button type="button" className="icon-button" aria-label="Fechar escolha de runas" onClick={onClose}><X size={18}/></button></header>
  <div className="balance-slot-tabs" role="group" aria-label="Slot da runa">{[1,2,3,4,5,6].map(n=><button type="button" key={n} aria-pressed={slot===n} onClick={()=>onSlot(n)}>{n}{p.pins[n]&&<LockKeyhole size={10}/>}</button>)}</div>
  <div className="balance-rune-filters"><label><Search size={14}/><input type="search" aria-label="Buscar runa por ID ou atributo" placeholder="ID ou atributo" value={filter} onChange={e=>setFilter(e.target.value)}/></label><select aria-label="Filtrar conjunto da runa" value={setFilterId} onChange={e=>selectSet(Number(e.target.value))}><option value="0">Todos os conjuntos</option>{Object.entries(SETS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></div>
  <div className="balance-rune-list">{runes.slice(page*24,(page+1)*24).map(r=><button type="button" className="balance-inventory-rune" key={r.id} aria-pressed={p.pins[slot]===r.id} onClick={()=>onChange({...config,balance:{...p,pins:{...p.pins,[slot]:r.id}}})}><img src={setImage(r.set)} alt=""/><span><strong>{SETS[r.set]} +{r.level}</strong><small>#{r.id} · {r.owner?'Equipada':'Livre'}</small><span>{STAT_NAMES[r.main[0]]} +{r.main[1]}</span><small>{(r.subs||[]).map(s=>`${STAT_NAMES[s[0]]} ${Number(s[1])+Number(s[3]||0)}`).join(' · ')}</small></span>{p.pins[slot]===r.id&&<LockKeyhole size={15}/>}</button>)}</div>
  {!runes.length&&<p role="status">Nenhuma runa disponível neste slot com os filtros e bloqueios atuais.</p>}
  <footer><span>{runes.length} peças · {page+1}/{Math.max(1,Math.ceil(runes.length/24))}</span><button type="button" aria-label="Página anterior de runas" className="icon-button" disabled={!page} onClick={()=>setPage(n=>n-1)}><ArrowLeft size={16}/></button><button type="button" aria-label="Próxima página de runas" className="icon-button" disabled={(page+1)*24>=runes.length} onClick={()=>setPage(n=>n+1)}><ArrowRight size={16}/></button><button type="button" className="button" disabled={!p.pins[slot]} onClick={()=>{const pins={...p.pins};delete pins[slot];onChange({...config,balance:{...p,pins}});}}><Unlock size={13}/>Liberar slot {slot}</button></footer>
 </div></dialog>;
}

export function BalanceRuleChips({config,checks=[]}){
 const p=balanceProfile(config),chip=(label,required,check,key)=> <span key={key} className={check?(check.met?'balance-met':'balance-miss'):''} title={`${required?'Obrigatório':'Preferência'}${check?` · ${check.met?'Atendido':'Não atendido'}`:''}`}>{required&&<LockKeyhole size={9}/>} {label}{check&&(check.met?<Check size={10}/>:<X size={10}/>)}</span>;
 return <div className="balance-priority-chips">{Object.entries(p.weights).filter(([,n])=>n>0).map(([k,n])=><span key={k}>{LABELS[k]} <b>{n}</b></span>)}
 {p.sets.map((r,i)=>chip(SETS[r.set],r.required,checks.filter(c=>c.kind==='set'&&c.set===r.set)[p.sets.slice(0,i).filter(c=>c.set===r.set).length],`set-${i}`))}
 {Object.entries(p.minimums).filter(([,n])=>n!=null).map(([stat,n])=>chip(`${LABELS[stat]} ≥${format(n)}`,p.required[stat],checks.find(c=>c.kind==='minimum'&&c.stat===stat),`min-${stat}`))}
 {Object.entries(p.mains).filter(([,r])=>r.stat).map(([slot,r])=>chip(`${slot} · ${STAT_NAMES[r.stat]}`,r.required,checks.find(c=>c.kind==='main'&&c.slot===Number(slot)),`main-${slot}`))}
 {!!Object.keys(p.pins).length&&<span title="Peças fixadas por ID para a próxima busca; as runas atuais só mudam ao selecionar uma alternativa."><LockKeyhole size={10}/>{Object.keys(p.pins).length} fixa(s)</span>}
 </div>;
}
