export function importAccountFile(file,{signal,onProgress=()=>{}}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Importação cancelada.','AbortError'));return;}
  const worker=new Worker(new URL('./import-account.worker.js',import.meta.url),{type:'module'});
  const finish=(error,account)=>{
   worker.terminate();signal?.removeEventListener('abort',abort);
   if(error)reject(error);else resolve(account);
  };
  const abort=()=>finish(new DOMException('Importação cancelada.','AbortError'));
  signal?.addEventListener('abort',abort,{once:true});
  worker.onmessage=({data})=>{if(data.type==='progress'){onProgress(data);return;}if(data.type==='account')finish(null,data.account);else finish(new Error(data.message));};
  worker.onerror=()=>finish(new Error('Não foi possível iniciar o processamento do inventário. Tente novamente.'));
  worker.onmessageerror=()=>finish(new Error('Não foi possível receber o inventário processado.'));
  try{worker.postMessage(file);}catch(error){finish(error);}
 });
}
