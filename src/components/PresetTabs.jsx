export default function PresetTabs({presets,value,onSelect,disabled=false}){
 if(!presets.length)return null;
 return <div className="preset-tabs" role="group" aria-label="Times PvE importados">{presets.map((p,i)=><button type="button" key={p.id} className="button small" disabled={disabled} aria-pressed={p.id===value} onClick={()=>onSelect(p)} title={p.name}>{i+1}. {p.name}</button>)}</div>;
}
