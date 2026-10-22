import { Download, RefreshCw, Save, Skull } from 'lucide-react';
export function BuilderProgress({account,teams,running,hasResult}){
 const selected=teams.flatMap(t=>t.configs).filter(c=>c.enabled).every(c=>c.unitId||c.masterId);
 const step=hasResult?5:running?4:account&&selected?3:account?2:1;
 return <ol className="builder-progress" aria-label="Etapas do otimizador">{['Setup','Mode','Build Team','Optimize','Results'].map((label,i)=><li key={label} aria-current={step===i+1?'step':undefined} className={step===i+1?'current':step>i+1?'done':''}><span>{i+1}</span><strong>{label}</strong></li>)}</ol>;
}
export default function BuilderControls({team,options,onOptions,onRecalc,onSave,onLoad,onClear,disabled=false}){
 const leader=team.configs.find(c=>c.key===team.leaderKey)||team.configs.find(c=>c.enabled);
 return <div className="builder-controls"><span className="leader-badge">Líder: <strong>{leader?.label||'Selecionar'}</strong> · +{team.leaderSpd||0}% SPD</span>
  <button type="button" className="button small" disabled={disabled} onClick={onRecalc}><RefreshCw size={13}/>Recalc Turn Order</button>
  <label className="check-label"><input type="checkbox" disabled={disabled} checked={options.strictMode===true} onChange={e=>onOptions({...options,strictMode:e.target.checked})}/>Strict Mode</label>
  <label className="check-label"><input type="checkbox" disabled={disabled} checked={options.maxGrindsGems===true} onChange={e=>onOptions({...options,maxGrindsGems:e.target.checked})}/>Max Grind Sim</label>
  <label className="tick-control">Speed Tick %<input aria-label="Speed Tick" type="number" min="1" max="100" step="0.1" value={options.speedTick??7} onChange={e=>onOptions({...options,speedTick:e.target.value})} disabled={disabled}/></label>
  <div className="button-group"><button type="button" className="button small" onClick={onSave} disabled={disabled}><Save size={13}/>Save Team</button><button type="button" className="button small" onClick={onLoad} disabled={disabled}><Download size={13}/>Load Team</button><button type="button" className="button small" onClick={onClear} disabled={disabled}><Skull size={13}/>Clear All</button></div>
 </div>;
}
