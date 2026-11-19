import {proveRuneMinimum} from './tuning-minimum.js';
self.onmessage=({data})=>{
 const {id,team,key,options}=data||{};
 try{self.postMessage({id,result:proveRuneMinimum(team,key,options)});}catch(error){self.postMessage({id,error:error?.message||'Não foi possível verificar o mínimo.'});}
};
