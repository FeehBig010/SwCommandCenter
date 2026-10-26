import {normalizeKillOrder,toggleKillTarget} from '../core/siege-schema';
import MonsterPortrait from './MonsterPortrait';

export default function SiegeKillOrder({defense=[],order=[],onChange,disabled=false}){
 const selected=normalizeKillOrder(order),editable=typeof onChange==='function';
 if(!editable&&!selected.length)return null;
 return <section className={`siege-kill-order ${editable?'editable':'readonly'}`} aria-label="Ordem de matar">
  <header><h4>Ordem de matar</h4>{editable&&<button type="button" className="button small" disabled={disabled||!selected.length} onClick={()=>onChange([])}>Limpar ordem</button>}</header>
  {editable?<><p>Clique nos inimigos na sequência: 1º → 2º → 3º.</p><div className="siege-kill-targets">{Array.from({length:3},(_,slot)=>{
   const monster=defense[slot],rank=selected.indexOf(slot);
   return <button type="button" className="siege-kill-target" key={slot} disabled={disabled||!monster?.masterId} aria-pressed={rank>=0} aria-label={`Focar ${monster?.label||`Defesa ${slot+1}`} · posição ${slot+1}`} onClick={()=>onChange(toggleKillTarget(selected,slot))}>
    <span className="siege-kill-rank" aria-label={rank>=0?`${rank+1}º alvo`:'Sem prioridade'}>{rank>=0?rank+1:'—'}</span>
    <MonsterPortrait unit_master_id={monster?.masterId} name={monster?.label||`Defesa ${slot+1}`}/><strong>{monster?.label||`Defesa ${slot+1}`}</strong>
   </button>;
  })}</div></>:null}
  {selected.length>0&&<ol className="siege-kill-sequence" aria-label="Sequência de alvos">{selected.map((slot,rank)=>{const monster=defense[slot];return <li key={slot}><b>{rank+1}º</b>{!editable&&<MonsterPortrait unit_master_id={monster?.masterId} name={monster?.label}/>}<span>{monster?.label||`Defesa ${slot+1}`}</span></li>;})}</ol>}
 </section>;
}
