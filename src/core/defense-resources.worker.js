import {improveJsonDefenses} from './defense-resources.js';
self.onmessage=({data})=>{try{const report=improveJsonDefenses(data.account,data.options,data.reservedIds,p=>self.postMessage({type:'progress',...p}));self.postMessage({type:'done',report});}catch(error){self.postMessage({type:'error',message:error.message});}};
