import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {ArrowRight,Crown,FolderOpen,Search} from 'lucide-react';
import {GAME_MODES} from '../core/data';
import {QUICK_AREA_LABELS,quickPresetArea,quickPresetChoices} from '../core/quick-presets';
import MonsterPortrait from './MonsterPortrait';
import './PresetPicker.css';
const ROW=88,HEIGHT=352;
function PresetList({presets,onLoad,disabled}){
 const root=useRef(),id=useId(),[scroll,setScroll]=useState(0),[active,setActive]=useState(0);
 const start=Math.min(Math.max(0,presets.length-1),Math.max(0,Math.floor(scroll/ROW)-2)),end=Math.min(presets.length,start+8),indices=[...new Set([...Array.from({length:end-start},(_,i)=>start+i),...(presets[active]?[active]:[])])].sort((a,b)=>a-b);
 function move(index){const next=Math.max(0,Math.min(presets.length-1,index)),node=root.current;setActive(next);if(next*ROW<node.scrollTop)node.scrollTop=next*ROW;else if((next+1)*ROW>node.scrollTop+HEIGHT)node.scrollTop=(next+1)*ROW-HEIGHT;setScroll(node.scrollTop);}
 return <div ref={root} id={id} className="preset-library-list" role="listbox" aria-label="Presets disponíveis" aria-activedescendant={presets[active]?`${id}-${active}`:undefined} tabIndex={0} style={{height:Math.min(HEIGHT,presets.length*ROW)}} onScroll={e=>setScroll(e.currentTarget.scrollTop)} onKeyDown={e=>{if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();move(e.key==='Home'?0:e.key==='End'?presets.length-1:active+(e.key==='ArrowDown'?1:-1));}else if(e.key==='Enter'&&!disabled&&presets[active]){e.preventDefault();onLoad(presets[active]);}}}>
  <div style={{height:presets.length*ROW,position:'relative'}}>{indices.map(index=>{const p=presets[index],names=p.members.map(m=>m?.name||'Slot vazio'),area=quickPresetArea(p);return <button type="button" role="option" tabIndex={-1} key={p.id} id={`${id}-${index}`} data-preset-id={p.id} aria-selected={active===index} aria-posinset={index+1} aria-setsize={presets.length} aria-label={`Carregar ${p.name||area} · ${names.join(', ')}`} disabled={disabled} style={{top:index*ROW,height:ROW}} onPointerMove={()=>setActive(index)} onClick={()=>onLoad(p)}>
   <span className="preset-library-faces" data-count={p.members.length}>{p.members.map((m,i)=><span className="preset-library-face" key={i} title={m?.name||'Slot vazio'}><MonsterPortrait master={m?.master??m?.unit_master_id} name={m?.name||'Slot vazio'} element={m?.element}/>{m&&i===(Number(p.leaderIndex)||0)&&<Crown size={10} aria-label="Líder"/>}</span>)}</span>
   <span className="preset-library-copy"><strong>{p.name||area}</strong><span title={names.join(' · ')}>{names.join(' · ')}</span><small>{area} · {p.mode==='attack'?'Ataque':p.mode==='defense'?'Defesa':`${p.members.length} slots`}</small></span><ArrowRight size={13} aria-hidden="true"/>
  </button>;})}</div>
 </div>;
}
export default function QuickPresetPicker({account,presets,area='siege',onLoad,allowAreaChange=true,disabled=false}){
 const root=useRef(null),[filters,setFilters]=useState(()=>({area,scope:area,query:'',mode:'all'})),[error,setError]=useState(''),[open,setOpen]=useState(false);
 useEffect(()=>setFilters(previous=>previous.area===area?previous:{area,scope:area,query:'',mode:'all'}),[area]);
 // Changing the workspace selects its own pool immediately, without a stale render.
 const current=filters.area===area?filters:{area,scope:area,query:'',mode:'all'},scope=allowAreaChange?current.scope:area;
 const indexed=useMemo(()=>{const units=new Map((account?.units||[]).map(u=>[Number(u.id),u]));return presets.filter(p=>p&&Array.isArray(p.unitIds)).map(p=>({...p,members:Array.from({length:Math.min(8,Math.max(p.unitIds.length,GAME_MODES[p.gameMode]?.slots||0))},(_,i)=>p.members?.[i]||units.get(Number(p.unitIds[i]))||null)}));},[presets,account]);
 const choices=useMemo(()=>quickPresetChoices(indexed,current.query,scope).filter(p=>current.mode==='all'||p.mode===current.mode),[indexed,current.query,current.mode,scope]);
 const areas=useMemo(()=>[...new Set([area,...indexed.map(p=>p.gameMode)])].filter(key=>GAME_MODES[key]),[indexed,area]);
 function setFilter(patch){setFilters({...current,...patch});setError('');}
 function close(){if(!root.current)return;root.current.open=false;setOpen(false);root.current.querySelector('summary').focus();}
 function load(item){const preset=presets.find(p=>p.id===item.id);if(!preset||disabled)return;try{onLoad(preset);setFilter({query:''});close();}catch{setError('Não foi possível carregar esse preset. Confira ou atualize seu JSON SWEX.');}}
 return <details ref={root} className="quick-preset-picker preset-library-picker" onToggle={e=>{if(e.target===root.current)setOpen(e.currentTarget.open);}} onKeyDown={event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();close();}}}>
  <summary className="button" aria-label="Presets do JSON" aria-disabled={disabled||undefined} onClick={e=>{if(disabled)e.preventDefault();else setOpen(!root.current.open);}} title="Presets da área selecionada"><FolderOpen size={15}/><span className="preset-button-desktop">Presets do JSON</span><span className="preset-button-mobile">Presets</span></summary>
  <div className="quick-header-popover quick-preset-popover preset-library-popover" role="region" aria-label="Carregar preset do JSON">
   {!account?<p role="status">Importe seu JSON SWEX pelo botão do topo para acessar os presets da conta.</p>:!indexed.length?<p role="status">Este JSON não contém presets disponíveis.</p>:<>
    {allowAreaChange?<label className="field"><span>Área dos presets</span><select aria-label="Área dos presets" value={scope} onChange={e=>setFilter({scope:e.target.value})}><option value="all">Todas as áreas</option>{areas.map(key=><option value={key} key={key}>{QUICK_AREA_LABELS[key]||key}</option>)}</select></label>:<strong className="preset-library-area">{QUICK_AREA_LABELS[area]||area} · Ataques e defesas</strong>}
    <label className="field"><span>Buscar preset, área ou monstro</span><div className="quick-preset-search"><Search size={14} aria-hidden="true"/><input type="search" value={current.query} onChange={e=>setFilter({query:e.target.value})} onKeyDown={e=>{if(e.key==='ArrowDown'&&choices.length){e.preventDefault();root.current.querySelector('[role=listbox]')?.focus();}}} placeholder="Nome do time ou monstro…"/></div></label>
    <div className="preset-library-roles" role="group" aria-label="Filtrar função dos presets">{[['all','Todos'],['attack','Ataques'],['defense','Defesas']].map(([key,label])=><button type="button" key={key} aria-pressed={current.mode===key} onClick={()=>setFilter({mode:key})}>{label}</button>)}</div>
    {choices.length?(open&&<PresetList key={`${area}:${scope}:${current.query}:${current.mode}`} presets={choices} onLoad={load} disabled={disabled}/>):<p role="status">Nenhum preset encontrado nesta área com os filtros atuais.</p>}
    <span className="fineprint" role="status">{choices.length} preset(s) · {scope==='all'?'Todas as áreas':QUICK_AREA_LABELS[scope]||scope}</span>
   </>}
   {error&&<p className="notice warning" role="alert">{error}</p>}
  </div>
 </details>;
}
