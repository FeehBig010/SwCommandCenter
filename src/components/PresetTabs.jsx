import MonsterPortrait from './MonsterPortrait';
export default function PresetTabs({presets,value,onSelect,disabled=false}){
 if(!presets.length)return null;
 return <div className="preset-tabs" role="group" aria-label="Times PvE importados">{presets.map((p,i)=><button type="button" key={p.id} className="button small" disabled={disabled} aria-pressed={p.id===value} onClick={()=>onSelect(p)} title={p.name}>{i+1}. {p.name}{p.members&&<span className="preset-member-icons">{p.members.map((m,j)=>m?<span key={j} title={`${m.name} · SPD combate ${m.combat_spd}${m.equipmentComplete?'':' · equipamento incompleto'}`}><MonsterPortrait master={m.master} name={m.name} element={m.element}/></span>:null)}</span>}</button>)}</div>;
}
