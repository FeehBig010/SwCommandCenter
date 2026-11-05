import {useId,useMemo,useRef,useState} from 'react';
import {ChevronDown,Search,X} from 'lucide-react';
import {PresetList} from './QuickPresetPicker';
import {quickPresetChoices} from '../core/quick-presets';
import MonsterPortrait from './MonsterPortrait';

// Reuse the calculator's virtualized visual list; loading remains with the composer.
export default function TeamPresetPicker({teams,account,selectedId,onSelect,disabled=false}){
 const root=useRef(null),labelId=useId(),[open,setOpen]=useState(false),[query,setQuery]=useState('');
 const presets=useMemo(()=>{
  const units=new Map((account?.units||[]).map(u=>[u.id,u]));
  return teams.filter(t=>t.mode==='attack'&&t.configs?.length===3).map(t=>({...t,gameMode:t.gameMode||'siege',unitIds:t.configs.map(c=>c.unitId),members:t.configs.map(c=>{const unit=units.get(c.unitId);return {master:unit?.master||c.masterId,name:unit?.name||c.label,element:unit?.element||Number(c.masterId)%10};})}));
 },[teams,account]);
 const selected=presets.find(t=>t.id===selectedId),choices=useMemo(()=>quickPresetChoices(presets,query),[presets,query]);
 function close(){root.current.open=false;setOpen(false);root.current.querySelector('summary').focus();}
 function select(item){onSelect(item?teams.find(t=>t.id===item.id):null);setQuery('');close();}
 return <div className="field"><span id={labelId}>Preencher com meu time</span>
  <details ref={root} className="quick-preset-picker preset-library-picker siege-team-preset-picker" onToggle={e=>{if(e.target===root.current)setOpen(e.currentTarget.open);}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();close();}}}>
   <summary className="button" aria-label="Preencher com meu time" aria-describedby={labelId} aria-disabled={disabled||undefined} onClick={e=>{if(disabled)e.preventDefault();}}>
    {selected&&<span className="preset-library-faces">{selected.members.map((m,i)=><span className="preset-library-face" key={i}><MonsterPortrait {...m}/></span>)}</span>}
    <span className="siege-team-preset-name">{selected?.name||'Escolher preset pelos ícones'}</span><ChevronDown size={14} aria-hidden="true"/>
   </summary>
   <div className="quick-preset-popover preset-library-popover" role="region" aria-label="Escolher meu preset">
    <div className="siege-preset-picker-heading"><strong>Meus presets de ataque</strong><button type="button" className="button small" aria-label="Fechar presets" onClick={close}><X size={16}/></button></div>
    <label className="field"><span>Buscar time ou monstro</span><div className="quick-preset-search"><Search size={14} aria-hidden="true"/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nome do time ou monstro…" onKeyDown={e=>{if(e.key==='ArrowDown'&&choices.length){e.preventDefault();root.current.querySelector('[role=listbox]')?.focus();}}}/></div></label>
    <button type="button" className="button small" disabled={disabled} onClick={()=>select(null)}>Criar do zero</button>
    {open&&(choices.length?<PresetList key={query} presets={choices} onLoad={select} disabled={disabled}/>:<p role="status">{presets.length?'Nenhum time encontrado.':'Nenhum preset de ataque com 3 monstros disponível.'}</p>)}
    <span className="fineprint" role="status">{choices.length} preset(s) de ataque · 3 monstros</span>
   </div>
  </details>
 </div>;
}
