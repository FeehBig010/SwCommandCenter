import {Search} from 'lucide-react';
import MonsterCombobox from './MonsterCombobox';
import {SIEGE_CHOICES} from './SiegeCounterComposer';

export default function DefenseSearch({query,onQuery,slots,onSlots,compact=false}){
 const directed=slots.some(Boolean);
 const directedFields=<fieldset className="siege-directed-search"><legend>Defesa inimiga · 3 slots</legend>{slots.map((id,i)=><MonsterCombobox key={i} label={`Buscar defesa — slot ${i+1}`} options={SIEGE_CHOICES} value={id} onChange={m=>onSlots(all=>all.map((v,j)=>j===i?String(m?.master||''):v))}/>)}{directed&&<div className="siege-slot-priority"><small id="siege-slot-priority">Filtro por slots ativo</small><button type="button" className="button small" onClick={()=>onSlots(['','',''])}>Limpar slots</button></div>}</fieldset>;
 return <div className="siege-defense-filters">
  <label className="field"><span><Search size={14}/>{compact?'Buscar defesa inimiga':'Buscar no acervo'}</span><input type="search" aria-label={compact?'Buscar defesa inimiga':'Buscar time de Siege'} value={query} onChange={e=>onQuery(e.target.value)} placeholder="Nome do monstro…" aria-describedby={directed?'siege-slot-priority':undefined}/></label>
  {compact?<details className="siege-slot-filter"><summary>Filtrar por três monstros{directed?' · ativo':''}</summary>{directedFields}</details>:directedFields}
 </div>;
}
