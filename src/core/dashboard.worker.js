import {analyzeDashboard} from './dashboard-analysis.js';
self.onmessage=({data})=>{try{self.postMessage({type:'result',report:analyzeDashboard(data.account,data.context)});}catch{self.postMessage({type:'error'});}};
