import BossTabs from './BossTabs';
import {PVE_AREAS} from '../core/pve';
export default function PveWorkspace({area,stages,stage,onSelect,disabled=false,presets=[],onNavigate,children}){
 return <div className="pve-workspace"><aside className="pve-master" aria-label="Destinos PvE"><div className="pve-master-title">Central PvE</div>{onNavigate&&<nav className="pve-area-switch" aria-label="Áreas PvE">{Object.entries(PVE_AREAS).map(([key,definition])=><button type="button" key={key} className="button small" aria-current={area===key?'page':undefined} disabled={disabled} onClick={()=>onNavigate(key)}>{definition.label}</button>)}</nav>}<BossTabs stages={stages} value={stage} onChange={onSelect} disabled={disabled} layout="master" presets={presets}/></aside><div className="pve-detail" role="region" aria-label="Composição e atributos PvE">{children}</div></div>;
}
