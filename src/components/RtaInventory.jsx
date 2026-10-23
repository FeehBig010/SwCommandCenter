import {useMemo,useState} from 'react';
import {useAccount} from '../contexts/AccountContext';
import {hydrateAccountPresets} from '../core/account-teams';
import MonsterPortrait from './MonsterPortrait';
import InfoTooltip from './InfoTooltip';
import PresetTabs from './PresetTabs';
export default function RtaInventory({account}){
 const global=useAccount(),[selected,setSelected]=useState(null);
 const presets=useMemo(()=>(global?.account===account?global.hydratedPresets:hydrateAccountPresets(account)).filter(p=>p.gameMode==='rta'),[account,global?.account,global?.hydratedPresets]);
 const preset=presets.find(p=>p.id===selected)||presets[0],entries=Object.entries(account?.equipmentPools?.rta?.assignments||{});
 return <section className="rta-inventory"><header className="pve-compact-header"><h1>World Arena · RTA</h1><InfoTooltip label="Isolamento da RTA">Atribuições World Arena são independentes do equipamento principal PvP/PvE. Esta visualização não altera runas e não executa o otimizador principal sobre a pool RTA.</InfoTooltip></header>
 <h2>Times importados · {presets.length}</h2><PresetTabs presets={presets} value={preset?.id} onSelect={p=>setSelected(p.id)}/>
 {preset?<div className="pve-team-grid slots-4" aria-label="Formação RTA importada">{Array.from({length:4},(_,i)=>{const member=preset.members[i];return <article className="swex-rta-member" key={i}>{member?<><MonsterPortrait master={member.master} name={member.name}/><strong>{member.name}</strong><span>{member.runes.length} runas · SPD {member.sheetStats.spd}</span></>:<span>Slot {i+1} vazio</span>}</article>;})}</div>:<p className="inline-notice">Nenhum preset RTA salvo neste inventário.</p>}
 <h2>Equipamentos RTA</h2>{!entries.length?<p className="inline-notice">{account?'O JSON não contém atribuições RTA reconhecidas.':'Carregue o SWEX para consultar seu inventário RTA separado.'}</p>:<div className="table-wrap"><table><thead><tr><th>Monstro</th><th>Runas da pool RTA</th></tr></thead><tbody>{entries.map(([id,runes])=>{const unit=account.units.find(u=>u.id===Number(id));return <tr key={id}><td><MonsterPortrait master={unit?.master} name={unit?.name}/>{unit?.name||id}</td><td>{runes.map(id=>`#${id}`).join(' · ')||'Sem runas atribuídas'}</td></tr>;})}</tbody></table></div>}</section>;
}
