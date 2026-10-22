import { Download, Save, Skull } from 'lucide-react';
export default function BuilderControls({team,options,onOptions,onRecalc,onSave,onLoad,onClear,disabled=false}){
 return <div className="builder-controls">

  <label className="check-label"><input type="checkbox" disabled={disabled} checked={options.strictMode===true} onChange={e=>onOptions({...options,strictMode:e.target.checked})}/>Strict Mode</label>
  <label className="check-label"><input type="checkbox" disabled={disabled} checked={options.maxGrindsGems===true} onChange={e=>onOptions({...options,maxGrindsGems:e.target.checked})}/>Max Grind Sim</label>
  <div className="button-group"><button type="button" className="button small" onClick={onSave} disabled={disabled}><Save size={13}/>Save Team</button><button type="button" className="button small" onClick={onLoad} disabled={disabled}><Download size={13}/>Load Team</button><button type="button" className="button small" onClick={onClear} disabled={disabled}><Skull size={13}/>Clear All</button></div>
 </div>;
}
