import {LEADER_STATS,LEADER_SCOPES} from '../core/leaders';
import { Download, RefreshCw, Save, Skull } from 'lucide-react';
export default function BuilderControls({team,options,onOptions,onRecalc,onSave,onLoad,onClear,disabled=false}){
 const leader=team.configs.find(c=>c.key===team.leaderKey)||team.configs.find(c=>c.enabled);
 return <div className="builder-controls"><span className="leader-badge">Líder: <strong>{team.leader||Number(team.leaderSpd)>0?leader?.label||'Selecionar':'Nenhum'}</strong> · {team.leader?`+${team.leader.value}% ${LEADER_STATS[team.leader.stat]} · ${LEADER_SCOPES[team.leader.scope]}`:`+${team.leaderSpd||0}% SPD`}</span>
  <button type="button" className="button small" disabled={disabled} onClick={onRecalc}><RefreshCw size={13}/>Recalc Turn Order</button>
  <label className="check-label"><input type="checkbox" disabled={disabled} checked={options.strictMode===true} onChange={e=>onOptions({...options,strictMode:e.target.checked})}/>Strict Mode</label>
  <label className="check-label"><input type="checkbox" disabled={disabled} checked={options.maxGrindsGems===true} onChange={e=>onOptions({...options,maxGrindsGems:e.target.checked})}/>Max Grind Sim</label>
  <div className="button-group"><button type="button" className="button small" onClick={onSave} disabled={disabled}><Save size={13}/>Save Team</button><button type="button" className="button small" onClick={onLoad} disabled={disabled}><Download size={13}/>Load Team</button><button type="button" className="button small" onClick={onClear} disabled={disabled}><Skull size={13}/>Clear All</button></div>
 </div>;
}
