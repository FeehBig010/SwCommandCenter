import {useMemo,useRef,useState} from 'react';
import {FolderOpen,Search} from 'lucide-react';
import {quickPresetArea,quickPresetChoices} from '../core/quick-presets';
export default function QuickPresetPicker({account,presets,onLoad}){
 const root=useRef(null),[query,setQuery]=useState(''),[error,setError]=useState('');
 const choices=useMemo(()=>quickPresetChoices(presets,query),[presets,query]);
 const groups=useMemo(()=>{const groups=new Map();for(const p of choices){const area=quickPresetArea(p);if(!groups.has(area))groups.set(area,[]);groups.get(area).push(p);}return [...groups];},[choices]);
 function close(){root.current.open=false;root.current.querySelector('summary').focus();}
 return <details ref={root} className="quick-preset-picker" onKeyDown={event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();close();}}}>
  <summary className="button" aria-label="Presets do JSON" title="Carregar um preset de qualquer área do SWEX"><FolderOpen size={15}/><span className="preset-button-desktop">Presets do JSON</span><span className="preset-button-mobile">Presets</span></summary>
  <div className="quick-header-popover quick-preset-popover" role="region" aria-label="Carregar preset do JSON">
   {!account?<p role="status">Importe seu JSON SWEX pelo botão do topo para acessar os presets da conta.</p>:!presets.length?<p role="status">Este JSON não contém presets disponíveis.</p>:<>
    <label className="field"><span>Buscar preset, área ou monstro</span><div className="quick-preset-search"><Search size={14} aria-hidden="true"/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: Dragão, R5, Orion…"/></div></label>
    <label className="field"><span>Preset do jogo</span><select aria-label="Carregar preset do JSON" value="" onChange={event=>{const preset=presets.find(p=>String(p.id)===event.target.value);if(!preset)return;try{onLoad(preset);setError('');setQuery('');close();}catch{setError('Não foi possível carregar esse preset. Confira ou atualize seu JSON SWEX.');}}}>
     <option value="">Selecione para carregar…</option>{groups.map(([area,items])=><optgroup key={area} label={area}>{items.map(p=><option key={p.id} value={p.id}>{p.name||area} · {(p.members||[]).map(m=>m?.name||'Vazio').join(' / ')}</option>)}</optgroup>)}
    </select></label>
    <span className="fineprint" role="status">{choices.length} preset(s) · todas as áreas</span>
   </>}
   {error&&<p className="notice warning" role="alert">{error}</p>}
  </div>
 </details>;
}
