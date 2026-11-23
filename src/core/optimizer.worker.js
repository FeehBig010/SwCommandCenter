import {validateSiege3v3} from './siege-3v3.js';
import {handleTeamBalanceRequest} from './team-balance-handler.js';
import {handleAttackTradeoffRequest} from './attack-tradeoffs-handler.js';
import {optimizeAdvanced} from './advanced-optimizer.js';
import {optimizeClone} from './clone-optimizer.js';
import {optimizeSiegeRotation} from './siege-rotation-optimizer.js';
import { optimize } from './optimizer.js';
self.onmessage=({data})=>{if(data.mode==='balance'){handleTeamBalanceRequest(data,value=>self.postMessage(value));return;}if(data.mode==='tradeoff'){handleAttackTradeoffRequest(data,value=>self.postMessage(value));return;}try{const progress=p=>self.postMessage({type:'progress',...p});const result=data.mode==='siege-3v3'?validateSiege3v3(data.account,data.team,data.scenario,data.options,data.reservedIds,data.allTeams):data.mode==='siege-rotation'?optimizeSiegeRotation(data.account,data.team,data.target,data.options,progress,data.reservedIds,data.allTeams):data.advanced?optimizeAdvanced(data.account,data.teams,data.options,progress,data.reservedIds,{matchTargets:data.matchTargets}):data.matchTargets?optimizeClone(data.account,data.teams[0],data.options,progress,data.reservedIds):optimize(data.account,data.teams,data.options,progress,data.reservedIds);self.postMessage({type:'done',result});}catch(error){self.postMessage({type:'error',message:error.message});}};
