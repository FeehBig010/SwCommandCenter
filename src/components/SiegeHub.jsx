import BattlePortal from './BattlePortal';
import {useState} from 'react';
import SiegeCounters from './SiegeCounters';
import DefensePlanner from './DefensePlanner';
export default function SiegeHub(props){const [mode,setMode]=useState(null);if(!mode)return <BattlePortal area="siege" onChoose={setMode} onBack={props.onExit}/>;return <><div className="siege-mode-tools"><button className="button small" onClick={()=>setMode(null)}>Trocar Ataque / Defesa</button>{mode==='attack'&&<button className="button primary small" onClick={props.onOpenAttack}>Abrir fila de ataque</button>}</div>{mode==='defense'?<DefensePlanner account={props.account} options={props.options} cloud={props.cloud} templates={props.templates} reservedIds={props.reservedIds}/>:<><div className="page-intro"><h1>Siege · Counters</h1></div><SiegeCounters {...props}/></>}</>;}
