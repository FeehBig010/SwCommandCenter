import {createAssetUpdater} from './assets-sync.js';
const mode=process.argv[2]||'setup';
if(!['setup','update'].includes(mode)){
 console.error('Uso: node server/assets-cli.js setup|update');process.exitCode=1;
}else{
 try{await createAssetUpdater().sync({pull:mode==='update'});}catch{process.exitCode=1;}
}
