import {normalizeAccount} from './data.js';

// File reading, JSON.parse and normalization stay off the UI thread. Only the
// whitelisted account crosses back; session/social data never leaves this worker.
self.onmessage=async({data:file})=>{
 try{
  let raw;
  try{raw=JSON.parse(await file.text());}catch(error){
   if(error instanceof SyntaxError)throw new Error('O arquivo não é um JSON válido.');
   throw error;
  }
  self.postMessage({type:'account',account:normalizeAccount(raw)});
 }catch(error){self.postMessage({type:'error',message:error.message||'Não foi possível processar o inventário.'});}
};
