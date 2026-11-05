import {useDeferredValue,useEffect,useId,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ChevronLeft,ChevronRight,Grid2X2,List,Search,X} from 'lucide-react';
import {ELEMENTS} from '../core/data';
import {filterMonsterBrowser,indexMonsterBrowser,monsterNaturalStars,toggleMonsterFilter} from '../core/monster-browser';
import MonsterPortrait from './MonsterPortrait';
import './MonsterBrowser.css';
const ELEMENT_FILES={1:'water',2:'fire',3:'wind',4:'light',5:'dark'},PAGE_SIZE=48;
export default function MonsterBrowser({label,options,value,onSelect,onClose,disabled=false}){
 const dialog=useRef(null),search=useRef(null),close=useRef(onClose),id=useId();close.current=onClose;
 const [query,setQuery]=useState(''),[stars,setStars]=useState([]),[elements,setElements]=useState([]),[page,setPage]=useState(0),[view,setView]=useState('grid');
 const deferred=useDeferredValue(query),index=useMemo(()=>indexMonsterBrowser(options),[options]);
 const filtered=useMemo(()=>filterMonsterBrowser(index,{query:deferred,stars,elements}),[index,deferred,stars,elements]);
 const pages=Math.ceil(filtered.length/PAGE_SIZE),current=Math.min(page,Math.max(0,pages-1)),visible=filtered.slice(current*PAGE_SIZE,(current+1)*PAGE_SIZE),hasFilter=!!query.trim()||stars.length>0||elements.length>0;
 useEffect(()=>{const node=dialog.current,opener=document.activeElement;node.showModal();search.current?.focus();const cancel=e=>{e.preventDefault();close.current();};node.addEventListener('cancel',cancel);return()=>{node.removeEventListener('cancel',cancel);node.close();if(opener?.isConnected)opener.focus();};},[]);
 function changeStars(n){setStars(v=>toggleMonsterFilter(v,n));setPage(0);}
 function changeElement(n){setElements(v=>toggleMonsterFilter(v,n));setPage(0);}
 return createPortal(<dialog ref={dialog} className="monster-browser" aria-labelledby={`${id}-title`} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}>
  <header><div><small>{label}</small><h2 id={`${id}-title`}>Catálogo de monstros</h2></div><button type="button" className="icon-button" aria-label="Fechar catálogo" onClick={onClose}><X size={20}/></button></header>
  <fieldset disabled={disabled} className="monster-browser-controls"><label className="monster-browser-search"><Search size={16}/><input ref={search} type="search" aria-label="Pesquisar no catálogo" placeholder="Nome ou família…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label>
   <div className="monster-browser-filters"><div role="group" aria-label="Estrelas naturais"><span>Estrelas naturais</span><div>{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={`${n} estrelas naturais`} aria-pressed={stars.includes(n)} onClick={()=>changeStars(n)}>{n}★</button>)}</div></div>
   <div role="group" aria-label="Elementos do catálogo"><span>Elementos</span><div>{Object.entries(ELEMENT_FILES).map(([key,file])=><button type="button" key={key} title={ELEMENTS[key]} aria-label={ELEMENTS[key]} aria-pressed={elements.includes(Number(key))} onClick={()=>changeElement(Number(key))}><img src={`/game-icons/elements/${file}.png`} alt="" width="24" height="24"/></button>)}</div></div>
   <div className="monster-browser-view" role="group" aria-label="Visualização do catálogo"><button type="button" aria-label="Ver ícones" aria-pressed={view==='grid'} onClick={()=>setView('grid')}><Grid2X2 size={17}/></button><button type="button" aria-label="Ver lista" aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={18}/></button></div></div>
   <div className="monster-browser-status"><span role="status">{hasFilter?`${filtered.length} resultado(s)`:'Selecione estrelas, elementos ou pesquise por nome.'}</span>{hasFilter&&<button type="button" onClick={()=>{setQuery('');setStars([]);setElements([]);setPage(0);}}>Limpar filtros</button>}</div>
  </fieldset>
  <div className={`monster-browser-results view-${view}`} aria-label="Monstros encontrados" aria-busy={deferred!==query}>
   {!visible.length?<p className="monster-browser-empty">{hasFilter?'Nenhum monstro corresponde aos filtros.':'O catálogo começa vazio. Escolha um filtro para explorar.'}</p>:visible.map(option=><button key={option.value} type="button" className="monster-browser-option" disabled={disabled} aria-label={`Selecionar ${option.name}${monsterNaturalStars(option)?` · ${monsterNaturalStars(option)} estrelas naturais`:''} · ${ELEMENTS[option.element]||''}${option.detail?` · ${option.detail}`:''}`} aria-pressed={option.value===value} title={`${option.name} · ${ELEMENTS[option.element]||''}`} onClick={()=>onSelect(option)}><MonsterPortrait master={option.portraitMaster||option.master} name={option.name} element={option.element}/><span><strong>{option.name}</strong>{view==='list'&&<small>{monsterNaturalStars(option)?`${monsterNaturalStars(option)}★ · `:''}{ELEMENTS[option.element]}{option.detail?` · ${option.detail}`:''}</small>}</span></button>)}
  </div>
  <footer><span>{pages?`${current*PAGE_SIZE+1}–${Math.min((current+1)*PAGE_SIZE,filtered.length)} de ${filtered.length}`:'Nenhum monstro exibido'}</span><div><button type="button" className="icon-button" aria-label="Página anterior de monstros" disabled={current===0} onClick={()=>setPage(current-1)}><ChevronLeft size={18}/></button><span>{pages?current+1:0} / {pages}</span><button type="button" className="icon-button" aria-label="Próxima página de monstros" disabled={!pages||current===pages-1} onClick={()=>setPage(current+1)}><ChevronRight size={18}/></button></div></footer>
 </dialog>,document.body);
}
