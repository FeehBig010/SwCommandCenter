import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import MonsterPortrait from './MonsterPortrait';
import { ELEMENTS } from '../core/data';
const normalize=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export default function MonsterCombobox({label,options,value,onChange,placeholder='Buscar monstro…',disabled=false}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0);
 const root=useRef(),input=useRef(),id=useId();
 const selected=options.find(o=>o.value===value);
 const filtered=useMemo(()=>options.filter(o=>normalize(`${o.name} ${o.detail||''} ${ELEMENTS[o.element]||''}`).includes(normalize(query))),[options,query]);
 const visible=filtered.slice(0,40);
 useEffect(()=>{const close=e=>{if(!root.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 useEffect(()=>{if(open)root.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'});},[active,open]);
 function choose(option){onChange(option);setOpen(false);setQuery('');input.current?.focus();}
 return <div className="monster-combobox" ref={root}>
  <label htmlFor={id}>{label}</label><div className="combobox-input"><Search size={14}/><input ref={input} id={id} role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={open&&!disabled} aria-controls={`${id}-list`} aria-activedescendant={open&&visible[active]?`${id}-option-${active}`:undefined} disabled={disabled} placeholder={placeholder} value={open?query:selected?.name||''} onFocus={()=>{setOpen(true);setQuery('');setActive(0);}} onChange={e=>{setQuery(e.target.value);setActive(0);setOpen(true);}} onKeyDown={e=>{
   if(e.key==='Escape'){setOpen(false);return;}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(i=>Math.max(0,Math.min(visible.length-1,i+(e.key==='ArrowDown'?1:-1))));}
   if(e.key==='Enter'&&open){e.preventDefault();if(visible[active])choose(visible[active]);}
   if(e.key==='Tab')setOpen(false);
  }}/><ChevronDown size={14}/></div>
  {open&&!disabled&&<div className="combobox-popover"><div role="listbox" id={`${id}-list`} aria-label={label}>{visible.map((option,index)=><button type="button" role="option" tabIndex={-1} id={`${id}-option-${index}`} aria-selected={index===active} key={option.value} onPointerDown={e=>e.preventDefault()} onPointerMove={()=>setActive(index)} onClick={()=>choose(option)}>
   <MonsterPortrait master={option.master} name={option.name} element={option.element}/><span className="combo-option-name"><strong>{option.name}</strong>{option.detail&&<small>{option.detail}</small>}</span><span className={`element-token element-${option.element}`} title={ELEMENTS[option.element]}>{ELEMENTS[option.element]||'?'}</span>
  </button>)}</div>{!visible.length&&<p className="combo-empty">Nenhum monstro encontrado.</p>}<div className="combobox-footer"><small>{filtered.length>40?`40 de ${filtered.length} · refine a busca`:`${filtered.length} opção(ões)`}</small><button type="button" disabled={disabled} onPointerDown={e=>e.preventDefault()} onClick={()=>choose(null)}><X size={12}/>Limpar seleção</button></div></div>}
 </div>;
}
