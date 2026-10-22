import {planDefenses} from './defense-planner.js';
self.onmessage=({data})=>{try{planDefenses(data.account,data.templates,data.options,data.reservedIds,report=>self.postMessage({type:'report',report}));self.postMessage({type:'done'});}catch(e){self.postMessage({type:'error',message:e.message});}};
