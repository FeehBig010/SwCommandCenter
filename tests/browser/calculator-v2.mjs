import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {quickPresetAccount} from '../fixtures/quick-presets.mjs';
import {fixture} from '../fixtures/attack-tradeoffs.mjs';
const origin=process.env.E2E_BASE_URL||'http://127.0.0.1:5305',out=process.env.E2E_ARTIFACT_DIR||'/workspace/artifacts/calculadora-v2-20261118';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin){if(u.pathname==='/__qa__/seed')return r.fulfill({body:'QA'});return r.continue();}if(u.hostname.endsWith('.supabase.co'))return r.fulfill({json:u.pathname.endsWith('get_engine_settings')?{default_speed_tick:7,max_teams:10,maintenance_mode:false}:[]});if(u.href.includes('icon_map.json'))return r.fulfill({json:{}});return r.abort();});
async function choose(i,name){await page.getByRole('combobox',{name:`Monstro livre ${i+1}`,exact:true}).fill(name);await page.getByRole('option').filter({has:page.getByText(name,{exact:true})}).first().click();}
try{
 await page.goto(origin+'/__qa__/seed');await page.evaluate(async account=>{localStorage.setItem('has_completed_onboarding','true');const db=await new Promise(resolve=>{const r=indexedDB.open('d8stino-siege-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>resolve(r.result);});await new Promise(resolve=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(account,'account');tx.oncomplete=resolve;});db.close();},quickPresetAccount());
 await page.goto(origin+'/#/quick');await page.getByRole('heading',{name:'Calculadora Livre',exact:true}).waitFor();
 assert.equal(await page.locator('.calculator-v2').count(),1,'V2 deve abrir na calculadora real');
 const cards=page.locator('.summary-monster-card');assert.equal(await cards.count(),3);assert.equal(await cards.first().getByRole('button',{name:'Pronto por tick',exact:true}).isDisabled(),true);
 await choose(0,'Bernard');await choose(1,'Galleon');await choose(2,'Julie');
 const rune=cards.first().getByRole('spinbutton',{name:'Bernard runas livres spd',exact:true});await rune.fill('228');await rune.press('Tab');
 await cards.first().getByRole('button',{name:'Pronto por tick',exact:true}).click();assert.match(await cards.first().locator('.quick-tick-result').innerText(),/Pronto: tick 6/);
 await cards.first().getByRole('button',{name:'SPD de runas',exact:true}).click();await rune.fill('228');await rune.press('Tab');
 const before=await rune.inputValue();await page.getByRole('button',{name:'Versão clássica',exact:true}).click();assert.equal(await page.locator('.calculator-v2').count(),0);assert.equal(await rune.inputValue(),before);await cards.first().getByRole('combobox',{name:'Bônus de nível da habilidade de Bernard',exact:true}).selectOption('15');await page.getByRole('button',{name:'Premium V2',exact:true}).click();assert.equal(await rune.inputValue(),before);assert.match(await cards.first().locator('.peanuts-skill-effect').innerText(),/ajuste manual/i);await page.getByRole('button',{name:'Versão clássica',exact:true}).click();await cards.first().getByRole('combobox',{name:'Bônus de nível da habilidade de Bernard',exact:true}).selectOption('0');await page.getByRole('button',{name:'Premium V2',exact:true}).click();
 const skill=cards.first().getByRole('button',{name:'S1',exact:true});await skill.click();assert.equal(await skill.getAttribute('aria-pressed'),'true');await cards.first().getByRole('button',{name:'S3',exact:true}).click();assert.match(await cards.first().locator('.peanuts-skill-effect').innerText(),/Barra ATQ/);
 for(const width of [1440,1920,390]){await page.setViewportSize({width,height:width===390?844:1080});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`sem overflow ${width}`);for(const portrait of await page.locator('.balance-order-unit .monster-portrait').all()){const box=await portrait.boundingBox();assert.ok(Math.abs(box.width-box.height)<2,'retratos da ordem permanecem quadrados');}await page.screenshot({path:`${out}/calculator-v2-${width}.png`,fullPage:true});}
 // Seed an isolated optimizer team; this path must not mutate account equipment.
 const data=fixture();data.team.name='Time de sincronia QA';data.team.autoName=false;
 await page.setViewportSize({width:1440,height:900});await page.goto(origin+'/__qa__/seed');
 await page.evaluate(async ({account,team})=>{const db=await new Promise(resolve=>{const r=indexedDB.open('d8stino-siege-v1',1);r.onsuccess=()=>resolve(r.result);});await new Promise(resolve=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(account,'account');tx.objectStore('data').put([team],'teams');tx.objectStore('data').put({artifacts:true,minLevel:0,depth:'fast',strictMode:false,respectLocks:true},'options');tx.oncomplete=resolve;});db.close();},data);
 await page.goto(origin+'/#/optimizer');await page.getByRole('heading',{name:'Otimizador Avançado',exact:true}).waitFor();
 await page.getByRole('button',{name:'Verificar Sincronia do time 1',exact:true}).click();await page.getByRole('region',{name:'Verificação do time do otimizador',exact:true}).waitFor();
 assert.equal(await cards.count(),3);const input=cards.first().locator('.quick-speed-controls input[type=number]').first(),old=Number(await input.inputValue());await input.fill(String(old+10));await input.press('Tab');
 await page.getByRole('button',{name:'Voltar sem aplicar',exact:true}).click();await page.getByRole('heading',{name:'Otimizador Avançado',exact:true}).waitFor();
 await page.getByRole('button',{name:'Verificar Sincronia do time 1',exact:true}).click();await page.getByRole('region',{name:'Verificação do time do otimizador',exact:true}).waitFor();assert.equal(Number(await input.inputValue()),old);
 await input.fill(String(old+10));await input.press('Tab');await page.getByRole('button',{name:'Enviar metas SPD ao time de origem',exact:true}).click();await page.getByRole('heading',{name:'Otimizador Avançado',exact:true}).waitFor();
 async function stored(){return page.evaluate(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('d8stino-siege-v1',1);r.onsuccess=()=>resolve(r.result);});const read=key=>new Promise(resolve=>{const r=db.transaction('data').objectStore('data').get(key);r.onsuccess=()=>resolve(r.result);});const result={account:await read('account'),teams:await read('teams')};db.close();return result;});}
 await page.waitForFunction(async expected=>{const db=await new Promise(resolve=>{const r=indexedDB.open('d8stino-siege-v1',1);r.onsuccess=()=>resolve(r.result);});const teams=await new Promise(resolve=>{const r=db.transaction('data').objectStore('data').get('teams');r.onsuccess=()=>resolve(r.result);});db.close();return teams?.[0]?.configs[0]?.goals?.spd===expected;},data.team.configs[0].basis==='bonus'?old+10:old+10+data.account.units.find(u=>u.id===data.team.configs[0].unitId).base.spd);
 const persisted=await stored();assert.deepEqual(persisted.account,data.account);assert.equal(persisted.teams.length,1);assert.equal(persisted.teams[0].id,data.team.id);assert.deepEqual(persisted.teams[0].configs.map(c=>[c.key,c.unitId,c.sets,c.mains]),data.team.configs.map(c=>[c.key,c.unitId,c.sets,c.mains]));
 await page.screenshot({path:out+'/optimizer-return-1440.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Calculator V2: direct speed/tick, classic state preservation, disclosed manual bonuses, known skills, 1440/1920/mobile and optimizer verify/cancel/return without equipment mutation passed.');
}finally{await browser.close();}
