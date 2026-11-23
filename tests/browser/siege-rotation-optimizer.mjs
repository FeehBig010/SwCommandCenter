import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fixture} from '../fixtures/siege-rotation.mjs';

const origin=process.env.E2E_BASE_URL||'http://127.0.0.1:5290';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),errors=[];
await context.addInitScript(()=>{
 localStorage.setItem('has_completed_onboarding','true');
 const BrowserWorker=Worker;
 window.rotationWorkers=[];
 window.Worker=class extends BrowserWorker{postMessage(data,...args){window.rotationWorkers.push(data.mode);return super.postMessage(data,...args);}};
});
await context.route('**/*',route=>{
 const url=new URL(route.request().url());
 if(url.origin===origin)return url.pathname==='/__qa__/seed'?route.fulfill({contentType:'text/html',body:'<title>QA setup</title>'}):route.continue();
 if(url.hostname.endsWith('.supabase.co'))return route.fulfill({headers:{'access-control-allow-origin':origin},json:url.pathname.endsWith('get_engine_settings')?{default_speed_tick:7,max_teams:10,maintenance_mode:false}:[]});
 return route.abort();
});
const page=await context.newPage();
page.on('pageerror',error=>errors.push(error.message));
const {account,team}=fixture();
Object.assign(account,{version:1,name:'Siege QA',importedAt:'2026-11-23T12:00:00Z',accountPresets:[]});
try{
 await page.goto(origin+'/__qa__/seed');
 await page.evaluate(async data=>{
  const db=await new Promise((resolve,reject)=>{const open=indexedDB.open('d8stino-siege-v1',1);open.onupgradeneeded=()=>open.result.createObjectStore('data');open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});
  await new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite');for(const [key,value] of Object.entries(data))tx.objectStore('data').put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
  db.close();
 },{account,teams:[{...team,mode:'attack'}],options:{artifacts:true,equipped:false,minLevel:0,depth:'fast',strictMode:false}});
 await page.goto(origin+'/#/optimizer');
 await page.getByRole('heading',{name:'Otimizador Avançado',exact:true}).waitFor();
 await page.getByRole('button',{name:'Detalhes do time 1',exact:true}).click();
 const panel=page.getByRole('region',{name:'Dano conjunto de Siege',exact:true});
 await panel.getByLabel('SPD do alvo').fill('230');
 await panel.getByLabel('DEF base do alvo').fill('1000');
 await panel.getByLabel('HP do alvo (opcional)',{exact:true}).fill('7000');
 await panel.getByLabel('Ignore DEF assumido (%)').fill('50');
 await panel.getByRole('button',{name:'Buscar maior dano do trio',exact:true}).click();
 await panel.getByRole('heading',{name:/Maior dano encontrado/}).waitFor();
 assert.equal(await panel.getByRole('heading',{name:/Configuração atual/}).count(),1);
 assert.ok((await page.evaluate(()=>window.rotationWorkers)).includes('siege-rotation'));
 await panel.getByText('Equipamento e atributos finais',{exact:true}).first().click();
 assert.match(await panel.innerText(),/Runas #1, #2, #3, #4, #5, #6 · Artefatos #100/);
 await panel.locator('summary').filter({hasText:'Remove DEF'}).first().click();
 assert.match(await panel.innerText(),/tick 5/);
 assert.match(await panel.innerText(),/ATK/);
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await panel.getByLabel('Ignore DEF assumido (%)').clear();
 assert.equal(await panel.getByRole('heading',{name:/Maior dano encontrado/}).count(),0);
 await panel.getByRole('button',{name:'Buscar maior dano do trio',exact:true}).click();
 await panel.getByText(/em faixa de 0–100%/).waitFor();
 assert.deepEqual(errors,[]);
 await page.reload();
 await page.getByRole('heading',{name:'Otimizador Avançado',exact:true}).waitFor();
 await page.getByRole('button',{name:'Detalhes do time 1',exact:true}).click();
 assert.equal(await panel.getByLabel('Ignore DEF assumido (%)').inputValue(),'');
 assert.equal(await panel.getByRole('heading',{name:/Maior dano encontrado/}).count(),0);
 console.log('PASS Build Lab Siege rotation: real worker, both branches, IDs, tick stats, stale inputs, mobile and read-only result.');
}finally{await browser.close();}
