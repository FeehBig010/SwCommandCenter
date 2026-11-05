import {useDeferredValue,useEffect,useId,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Grid2X2,List,Search,X} from 'lucide-react';
import {ELEMENTS} from '../core/data';
import {filterMonsterBrowser,indexMonsterBrowser,monsterNaturalStars,toggleMonsterFilter} from '../core/monster-browser';
import MonsterPortrait from './MonsterPortrait';
import './MonsterBrowser.css';
const ELEMENT_FILES={1:'water',2:'fire',3:'wind',4:'light',5:'dark'};
export default function MonsterBrowser({label,options,value,onSelect,onClose,disabled=false}){
 const dialog=useRef(null),search=useRef(null),results=useRef(null),close=useRef(onClose),id=useId();close.current=onClose;
 const [query,setQuery]=useState(''),[stars,setStars]=useState([]),[elements,setElements]=useState([]),[view,setView]=useState('grid');
 const deferred=useDeferredValue(query),index=useMemo(()=>indexMonsterBrowser(options),[options]);
 const filtered=useMemo(()=>filterMonsterBrowser(index,{query:deferred,stars,elements}),[index,deferred,stars,elements]);
 const [viewport,setViewport]=useState({height:500,columns:1}),[scroll,setScroll]=useState(0),[active,setActive]=useState(0);
 const rowHeight=view==='grid'?88:80,columns=viewport.columns,rowCount=Math.ceil(filtered.length/columns),start=Math.max(0,Math.floor(scroll/rowHeight)-2),end=Math.min(rowCount,Math.ceil((scroll+viewport.height)/rowHeight)+2),activeRow=Math.floor(active/columns);
 const visibleRows=[...new Set([...Array.from({length:Math.max(0,end-start)},(_,i)=>start+i),...(activeRow<rowCount?[activeRow]:[])])].sort((a,b)=>a-b);
 const hasFilter=!!query.trim()||stars.length>0||elements.length>0;
 useEffect(()=>{const node=dialog.current,opener=document.activeElement;node.showModal();search.current?.focus();const cancel=e=>{e.preventDefault();close.current();};node.addEventListener('cancel',cancel);return()=>{node.removeEventListener('cancel',cancel);node.close();if(opener?.isConnected)opener.focus();};},[]);
 useEffect(()=>{
  const node=results.current;
  function measure(){const style=getComputedStyle(node),width=node.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),columns=view==='grid'?Math.max(1,Math.floor((width+8)/84)):width>=1160?3:width>=560?2:1;setViewport({height:node.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom),columns});}
  measure();const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;observer?.observe(node);window.addEventListener('resize',measure);return()=>{observer?.disconnect();window.removeEventListener('resize',measure);};
 },[view]);
 useEffect(()=>{results.current.scrollTop=0;setScroll(0);setActive(0);},[deferred,stars,elements,view]);
 function move(next){const index=Math.max(0,Math.min(filtered.length-1,next)),node=results.current,top=Math.floor(index/columns)*rowHeight;setActive(index);if(top<node.scrollTop)node.scrollTop=top;else if(top+rowHeight>node.scrollTop+viewport.height)node.scrollTop=top+rowHeight-viewport.height;setScroll(node.scrollTop);}
 function changeStars(n){setStars(v=>toggleMonsterFilter(v,n));}
 function changeElement(n){setElements(v=>toggleMonsterFilter(v,n));}
 return createPortal(<dialog ref={dialog} className="monster-browser" aria-labelledby={`${id}-title`} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}>
  <header><div><small>{label}</small><h2 id={`${id}-title`}>Catálogo de monstros</h2></div><button type="button" className="icon-button" aria-label="Fechar catálogo" onClick={onClose}><X size={20}/></button></header>
  <fieldset disabled={disabled} className="monster-browser-controls"><label className="monster-browser-search"><Search size={16}/><input ref={search} type="search" aria-label="Pesquisar no catálogo" placeholder="Nome ou família…" value={query} onChange={e=>{setQuery(e.target.value);}}/></label>
   <div className="monster-browser-filters"><div role="group" aria-label="Estrelas naturais"><span>Estrelas naturais</span><div>{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={`${n} estrelas naturais`} aria-pressed={stars.includes(n)} onClick={()=>changeStars(n)}>{n}★</button>)}</div></div>
   <div role="group" aria-label="Elementos do catálogo"><span>Elementos</span><div>{Object.entries(ELEMENT_FILES).map(([key,file])=><button type="button" key={key} title={ELEMENTS[key]} aria-label={ELEMENTS[key]} aria-pressed={elements.includes(Number(key))} onClick={()=>changeElement(Number(key))}><img src={`/game-icons/elements/${file}.png`} alt="" width="24" height="24"/></button>)}</div></div>
   <div className="monster-browser-view" role="group" aria-label="Visualização do catálogo"><button type="button" aria-label="Ver ícones" aria-pressed={view==='grid'} onClick={()=>setView('grid')}><Grid2X2 size={17}/></button><button type="button" aria-label="Ver lista" aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={18}/></button></div></div>
   <div className="monster-browser-status"><span role="status">{`${filtered.length} resultado(s)`}</span>{hasFilter&&<button type="button" onClick={()=>{setQuery('');setStars([]);setElements([]);}}>Limpar filtros</button>}</div>
  </fieldset>
  <div ref={results} className={`monster-browser-results view-${view}`} role="listbox" tabIndex={0} aria-label="Monstros encontrados" aria-busy={deferred!==query} aria-activedescendant={filtered[active]?`${id}-option-${active}`:undefined} onScroll={e=>setScroll(e.currentTarget.scrollTop)} onKeyDown={e=>{
   if(e.target!==e.currentTarget)return;
   if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();move(e.key==='Home'?0:e.key==='End'?filtered.length-1:active+({ArrowDown:columns,ArrowUp:-columns,ArrowLeft:-1,ArrowRight:1}[e.key]));}
   if((e.key==='Enter'||e.key===' ')&&filtered[active]&&!disabled){e.preventDefault();onSelect(filtered[active]);}
  }}>
   {!filtered.length?<p className="monster-browser-empty">Nenhum monstro corresponde aos filtros.</p>:<div className="monster-browser-virtual" style={{height:rowCount*rowHeight}}>{visibleRows.map(row=><div key={row} className="monster-browser-virtual-row" style={{top:row*rowHeight,height:rowHeight-8,gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}}>{filtered.slice(row*columns,(row+1)*columns).map((option,offset)=>{const index=row*columns+offset;return <button key={option.value} id={`${id}-option-${index}`} type="button" role="option" tabIndex={-1} className="monster-browser-option" data-master={option.master} data-portrait-master={option.portraitMaster||option.master} disabled={disabled} aria-label={`Selecionar ${option.name}${monsterNaturalStars(option)?` · ${monsterNaturalStars(option)} estrelas naturais`:''} · ${ELEMENTS[option.element]||''}${option.detail?` · ${option.detail}`:''}`} aria-selected={option.value===value} aria-posinset={index+1} aria-setsize={filtered.length} data-active={active===index} title={`${option.name} · ${ELEMENTS[option.element]||''}`} onPointerDown={e=>{e.preventDefault();results.current.focus();}} onPointerMove={()=>setActive(index)} onClick={()=>onSelect(option)}><MonsterPortrait master={option.portraitMaster||option.master} name={option.name} element={option.element}/><span><strong>{option.name}</strong>{view==='list'&&<small>{monsterNaturalStars(option)?`${monsterNaturalStars(option)}★ · `:''}{ELEMENTS[option.element]}{option.detail?` · ${option.detail}`:''}</small>}</span></button>;})}</div>)}</div>}
  </div>
 </dialog>,document.body);
}
