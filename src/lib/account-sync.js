import {loadAccountCloud,saveAccountCloud} from './account-cloud.js';
// Per-session coordinator. In-flight reads cannot supersede a later upload or login.
export function accountSyncController({client,onRestore,onStatus,load=loadAccountCloud,save=saveAccountCloud}){
 let generation=0,revision=0,user=null,queue=Promise.resolve();
 const current=(g,u)=>generation===g&&user===u;
 return {
  async login(id){const g=++generation;user=id;const r=revision;onStatus('idle');if(!id||!client)return;
   onStatus('loading');try{const account=await load(client,id,{optional:true});if(!current(g,id)||r!==revision)return;if(!account){onStatus('idle');return;}await onRestore(account);if(current(g,id)&&r===revision)onStatus('synced');}catch{if(current(g,id)&&r===revision)onStatus('error');}
  },
  beginUpload(){const g=generation,u=user,r=++revision;onStatus('idle');return ()=>current(g,u)&&revision===r;},
  upload(account){revision++;const g=generation,u=user;if(!u||!client){onStatus('idle');return Promise.resolve();}onStatus('saving');
   const result=queue.catch(()=>{}).then(async()=>{if(!current(g,u))return;await save(client,u,account);});queue=result;
   const r=revision;return result.then(()=>{if(current(g,u)&&r===revision)onStatus('synced');},()=>{if(current(g,u)&&r===revision)onStatus('error');});
  },
  cancel(){generation++;user=null;onStatus('idle');}
 };
}
