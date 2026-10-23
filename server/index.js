import {access} from 'node:fs/promises';
import path from 'node:path';
import {PROJECT_ROOT} from './asset-paths.js';
import {createAssetUpdater} from './assets-sync.js';
import {startAssetSchedule} from './assets-scheduler.js';
import {createAppServer} from './http-server.js';

try{
 await access(path.join(PROJECT_ROOT,'dist/index.html'));
 const updater=createAssetUpdater();
 // A transient failure keeps the previous local images available, with a retry
 // at the next scheduled time or via npm run assets:update.
 try{await updater.sync({pull:false});}catch{}
 const port=Number(process.env.PORT||3000),host=process.env.HOST||'0.0.0.0';
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT deve ser uma porta válida entre 1 e 65535.');
 const server=createAppServer();
 server.on('error',error=>{console.error(`[Servidor] ${error.message}`);process.exitCode=1;});
 server.listen(port,host,()=>{
  console.info(`[Servidor] Site e imagens locais disponíveis em http://${host}:${port}`);
  const task=startAssetSchedule(updater);
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await task.destroy();server.close();server.closeIdleConnections();});
 });
}catch(error){console.error(`[Servidor] ${error.message}. Execute npm run build para preparar o site.`);process.exitCode=1;}
