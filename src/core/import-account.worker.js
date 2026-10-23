import {normalizeAccountAsync} from './data.js';

self.onmessage=async({data:file})=>{
 let last=0;
 const progress=({percent,message})=>{const next=Math.max(last,Math.min(88,Math.floor(percent)));if(next>last){last=next;self.postMessage({type:'progress',percent:next,message});}};
 try{
  const reader=file.stream().getReader(),decoder=new TextDecoder(),chunks=[];let bytes=0;
  for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;chunks.push(decoder.decode(value,{stream:true}));progress({percent:1+Math.floor(bytes/Math.max(1,file.size)*12),message:'Lendo arquivo SWEX'});}
  chunks.push(decoder.decode());progress({percent:15,message:'Decodificando JSON'});
  let raw;try{raw=JSON.parse(chunks.join(''));}catch(error){if(error instanceof SyntaxError)throw new Error('O arquivo não é um JSON válido.');throw error;}
  chunks.length=0;progress({percent:18,message:'Preparando inventário'});
  const account=await normalizeAccountAsync(raw,{onProgress:progress});
  self.postMessage({type:'account',account});
 }catch(error){self.postMessage({type:'error',message:error.message||'Não foi possível processar o inventário.'});}
};
