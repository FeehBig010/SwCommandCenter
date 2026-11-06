import {analyzeRunes} from './rune-intelligence.js';
self.onmessage=({data})=>{try{self.postMessage({report:analyzeRunes(data.account,data.context)});}catch{self.postMessage({error:'Não foi possível analisar as runas. Confira ou atualize o SWEX.'});}};
