import { optimize } from './optimizer.js';
self.onmessage=({data})=>{try{const result=optimize(data.account,data.teams,data.options,p=>self.postMessage({type:'progress',...p}),data.reservedIds);self.postMessage({type:'done',result});}catch(error){self.postMessage({type:'error',message:error.message});}};
