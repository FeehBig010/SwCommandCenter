import MonsterPortrait from './MonsterPortrait';
import {giName} from '../core/guild-intelligence';
export default function IntelligenceLineup({ids,leader=0,compact=false}){return <div className={`gi-lineup ${compact?'gi-lineup-compact':''}`}>{ids.map((id,i)=><div key={i}><span className="gi-face"><MonsterPortrait unit_master_id={id} name={giName(id)} element={id%10}/>{i===leader&&<span className="gi-leader" title="Líder" aria-label="Líder">♛</span>}</span>{!compact&&<strong>{giName(id)}</strong>}</div>)}</div>;}
