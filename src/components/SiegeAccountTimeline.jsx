import {useMemo} from 'react';
import {copySiegeToPersonal} from '../core/siege-central';
import {siegeAccountTimeline} from '../core/siege-timeline';
import SpeedTuneCard from './SpeedTuneCard';
import {siegeCounterContext} from '../core/siege-search';

export default function SiegeAccountTimeline({record,account,options,defenseMembers}){
 const result=useMemo(()=>{if(!account)return null;try{const {team}=copySiegeToPersonal(siegeCounterContext(record,defenseMembers),account);return {team,preview:siegeAccountTimeline(account,team,options)};}catch(e){return {error:e.message};}},[record,account,options,defenseMembers]);
 if(!result)return <p className="fineprint">Importe seu SWEX para visualizar os ticks da sua conta.</p>;
 if(result.error)return <p className="fineprint" role="status">{result.error}</p>;
 return <SpeedTuneCard team={result.team} manualPreview={result.preview} sourceLabel="Minha conta SWEX · runas equipadas"/>;
}
