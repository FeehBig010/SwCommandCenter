import cron from 'node-cron';
import {ASSET_CRON,ASSET_TIMEZONE} from './asset-paths.js';

export function startAssetSchedule(updater,{logger=console,scheduler=cron}={}){
 const task=scheduler.schedule(ASSET_CRON,async()=>{
  // sync logs the network/process error in detail; a failure must not stop HTTP
  // serving or unregister next week's job.
  try{await updater.sync();}catch{return false;}
  return true;
 },{name:'sw-assets-weekly',timezone:ASSET_TIMEZONE,noOverlap:true});
 logger.info(`[SW Assets] Agendado: ${ASSET_CRON} · toda terça-feira às 23:59 (${ASSET_TIMEZONE}). Próxima execução: ${task.getNextRun()?.toISOString()||'indisponível'}`);
 return task;
}
