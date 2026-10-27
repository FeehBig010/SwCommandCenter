import {BrainCircuit,Swords} from 'lucide-react';
import './GuildIntelligence.css';
import GuildCloudPanel from './GuildCloudPanel';
export default function GuildCenter({cloud,session,onAuth,teams,account,onCopy,onNavigate}){
 return <section className="guild-center"><header className="page-intro"><h1>Guild Center</h1></header><div className="guild-center-links"><button type="button" className="button primary" onClick={()=>onNavigate('guild-intelligence')}><BrainCircuit size={24}/><span><strong>Guild Intelligence</strong><small>Defesas, counters e histórico da guilda · Siege G1 / G2 / G3</small></span></button><button type="button" className="button" onClick={()=>onNavigate('siege')}><Swords size={22}/>Central de Siege</button></div><GuildCloudPanel managementOnly cloud={cloud} session={session} onAuth={onAuth} teams={teams} account={account} onCopy={onCopy}/></section>;
}
