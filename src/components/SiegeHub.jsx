import BattlePortal from './BattlePortal';
import {useState} from 'react';
import {useAccount} from '../contexts/AccountContext';
import {teamsForArea} from '../core/deckManager';
import {makeTeam} from '../core/data';
import TeamEditor from './TeamEditor';
import SiegeCounters from './SiegeCounters';
import DefensePlanner from './DefensePlanner';
export default function SiegeHub(props){
 const global=useAccount(),[mode,setMode]=useState(null),account=global?.account||props.account,teams=global?.teams||props.teams||[],siegeTeams=teamsForArea(teams,'siege');
 function change(next){global?.setTeams(all=>[...all.filter(t=>(t.gameMode||'siege')!=='siege'),...next]);}
 return <>{siegeTeams.length>0&&<section className="siege-imported-planner" aria-label="Times Siege importados"><header><h1>Meus times de Siege / GvG</h1><p className="fineprint">{siegeTeams.length} times · presets do SWEX e seus rascunhos</p></header><TeamEditor teams={siegeTeams} account={account} options={props.options} onOptions={props.onOptions} onOptimizeTeam={props.onOptimizeTeam} onSavePlan={props.onSavePlan} onLoadPlan={props.onLoadPlan} onChange={change} onAdd={()=>change([...siegeTeams,makeTeam('siege')])}/></section>}
 {!mode?<BattlePortal area="siege" onChoose={setMode} onBack={props.onExit}/>:<><div className="siege-mode-tools"><button className="button small" onClick={()=>setMode(null)}>Trocar Ataque / Defesa</button>{mode==='attack'&&<button className="button primary small" onClick={props.onOpenAttack}>Abrir fila de ataque</button>}</div>{mode==='defense'?<DefensePlanner account={account} options={props.options} cloud={props.cloud} templates={props.templates} reservedIds={props.reservedIds}/>:<><div className="page-intro"><h1>Siege · Counters</h1></div><SiegeCounters {...props}/></>}</>}</>;
}
