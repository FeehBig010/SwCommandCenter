import {scanAccount} from './accountDiagnostic.js';
self.onmessage=({data})=>{try{self.postMessage({report:scanAccount(data.account,data.teams,data.options,data.reservedIds)});}catch{self.postMessage({error:'Não foi possível concluir a varredura. O inventário foi preservado.'});}};
