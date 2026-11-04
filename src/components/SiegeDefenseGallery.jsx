import {useEffect,useState} from 'react';
import MonsterPortrait from './MonsterPortrait';

export default function SiegeDefenseGallery({rows,selectedKey,onSelect}){
 const [limit,setLimit]=useState(24);useEffect(()=>setLimit(24),[rows]);
 const visible=rows.slice(0,limit),selected=rows.find(row=>row.key===selectedKey);if(selected&&!visible.includes(selected))visible.unshift(selected);
 return <div className="siege-master-list siege-defense-gallery" aria-label="Galeria de defesas">
  <div className="siege-list-count" role="status">{rows.length} {rows.length===1?'defesa / composição':'defesas / composições'}</div>
  {visible.map(row=>{const members=row.members.length?row.members:row.record.team.configs,names=members.map(m=>m.label).join(', ');return <button type="button" key={row.key} className={`siege-master-item ${selectedKey===row.key?'selected':''}`} aria-label={`Selecionar ${row.members.length?'defesa':'ataque sem alvo'}: ${names}`} title={names} aria-pressed={selectedKey===row.key} onClick={()=>onSelect(row)}>
   <span className="siege-master-lineup">{members.map((m,i)=><MonsterPortrait key={i} unit_master_id={m.masterId} name={m.label}/>)}</span>
   <small>{row.members.length?`${row.attacks.length} counter${row.attacks.length===1?'':'s'}`:'Sem defesa alvo'}</small>{row.sources?.length>0&&<span className="siege-origin-label">{row.sources.join(' · ')}</span>}
  </button>;})}
  {rows.length>limit&&<button type="button" className="button small" onClick={()=>setLimit(n=>n+24)}>Mostrar mais defesas</button>}
  {!rows.length&&<p className="siege-empty-list">Nenhuma defesa corresponde aos filtros.</p>}
 </div>;
}
