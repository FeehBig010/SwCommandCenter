import {spawn} from 'node:child_process';
const port=process.env.E2E_PORT||'5290',origin=`http://127.0.0.1:${port}`;
const env={...process.env,VITE_SUPABASE_URL:'https://privacy-qa.supabase.co',VITE_SUPABASE_ANON_KEY:'qa-public-key'};
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',port,'--strictPort'],{env,stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',chunk=>{log=(log+chunk).slice(-4000);});server.stderr.on('data',chunk=>{log=(log+chunk).slice(-4000);});let failed=false;server.on('error',()=>{failed=true;});server.on('exit',()=>{failed=true;});
try{
 let ready=false;for(let attempt=0;attempt<100;attempt++){if(failed)throw new Error(`Servidor de testes indisponível: ${log}`);try{ready=(await fetch(origin)).ok;}catch{}if(ready)break;await new Promise(resolve=>setTimeout(resolve,200));}
 if(!ready)throw new Error('O servidor de testes não iniciou.');
 for(const file of ['tests/browser/privacy-onboarding.mjs','tests/browser/attack-tradeoffs.mjs','tests/browser/guild-intelligence.mjs','tests/browser/home-portal.mjs','tests/browser/optimizer-compact.mjs','tests/browser/quick-density.mjs','tests/browser/quick-presets.mjs','tests/browser/team-balance.mjs','tests/browser/portrait-refresh.mjs','tests/browser/app-motion.mjs','tests/browser/premium-motion.mjs']){
  const child=spawn(process.execPath,[file],{env:{...process.env,E2E_BASE_URL:origin},stdio:'inherit'});
  const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});if(code!==0){process.exitCode=1;break;}
 }
}finally{server.kill('SIGTERM');}
