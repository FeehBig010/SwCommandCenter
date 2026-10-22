import {useEffect,useState} from 'react';
import {readShare} from '../core/team-share';
import {Lineup} from './MatchupCard';
import TeamCardExport from './TeamCardExport';
export default function SharedTeam({token,onCopy,onClose}){const [team,setTeam]=useState(null),[error,setError]=useState('');useEffect(()=>{let live=true;readShare(token).then(t=>{if(live)setTeam(t);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[token]);return <section className="shared-team"><header><h2>{team?.name||'Composição compartilhada'}</h2><button className="button small" onClick={onClose}>Fechar</button></header>{error?<p role="alert">{error}</p>:team?<><Lineup monsters={team.configs}/><button className="button primary" onClick={()=>onCopy(team)}>Copiar para o Meu Hub</button><TeamCardExport team={team}/></>:<p role="status">Abrindo composição…</p>}</section>;}
