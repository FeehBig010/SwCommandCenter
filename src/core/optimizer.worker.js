import {optimizeAdvanced} from './advanced-optimizer.js';
import {optimizeClone} from './clone-optimizer.js';
import { optimize } from './optimizer.js';
self.onmessage=({data})=>{try{const progress=p=>self.postMessage({type:'progress',...p});const result=data.advanced?optimizeAdvanced(data.account,data.teams,data.options,progress,data.reservedIds,{matchTargets:data.matchTargets}):data.matchTargets?optimizeClone(data.account,data.teams[0],data.options,progress,data.reservedIds):optimize(data.account,data.teams,data.options,progress,data.reservedIds);self.postMessage({type:'done',result});}catch(error){self.postMessage({type:'error',message:error.message});}};
