import {useEffect} from 'react';
import {hydratePveTeam,pveHydrationKey} from '../core/pve-intelligence';
export default function usePveHydration(team,account,options,onHydrate,enabled=true){
 const signature=pveHydrationKey(team,account,options);
 useEffect(()=>{if(!enabled||!account)return;const filled=hydratePveTeam(team,account,options);if(JSON.stringify(filled)!==JSON.stringify(team))onHydrate(filled);},[account,signature,enabled]);
}
