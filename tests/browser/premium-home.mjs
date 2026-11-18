import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {quickPresetAccount} from '../fixtures/quick-presets.mjs';
const origin=process.env.E2E_BASE_URL||'http://127.0.0.1:5306',out=process.env.E2E_ARTIFACT_DIR||'/tmp/sw-premium-home';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const code='PREMIUMQACODE',history={[code]:{code,status:'active',sources:['SWGT'],last_seen:new Date().toISOString(),reward:'Mana ×300,000'}},errors=[];
try{
 for(const width of [1440,1920,390,320]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue();if(u.hostname.endsWith('.supabase.co'))return route.fulfill({json:u.pathname.endsWith('get_engine_settings')?{default_speed_tick:7,max_teams:10,maintenance_mode:false}:[]});if(u.hostname==='raw.githubusercontent.com')return route.fulfill({json:history});return route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
  await page.evaluate(async()=>{
   const [{default:React},{default:ReactDOM},{default:EntryPortal}]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/components/EntryPortal.jsx')]);
   document.querySelector('#root').style.display='none';const node=document.createElement('div');node.id='qa-home';document.body.append(node);window.qaEvents=[];const root=ReactDOM.createRoot(node);
   window.renderHome=(account=null,lastWorkspace=null,busy=false)=>root.render(React.createElement(EntryPortal,{account,lastWorkspace,busy,onNavigate:key=>window.qaEvents.push(key),onQuick:()=>window.qaEvents.push('quick-action'),onContinue:()=>window.qaEvents.push('continue'),onUpload:()=>window.qaEvents.push('upload'),onFile:file=>window.qaEvents.push(file.name),onLoginIntent:()=>{},onLoginCancel:()=>{}}));window.renderHome();
  });
  const home=page.locator('#qa-home');await home.getByRole('heading',{name:'Sua Central de Comando',exact:true}).waitFor();
  assert.equal(await home.locator('.premium-home').count(),1);
  const nav=home.getByRole('navigation',{name:'Módulos principais'});
  for(const [key,label] of [['portal','Início'],['siege','Siege Center'],['optimizer','Rune Optimizer'],['rune-intelligence','Rune Intelligence'],['quick','Calculadora de Velocidade']]){await nav.getByRole('button',{name:label,exact:true}).click();assert.equal(await page.evaluate(()=>window.qaEvents.at(-1)),key);}
  await home.getByRole('button',{name:'Abrir Calculadora Livre',exact:true}).click();assert.equal(await page.evaluate(()=>window.qaEvents.at(-1)),'quick-action');
  await home.getByRole('button',{name:'Selecionar arquivo JSON SWEX',exact:true}).click();assert.equal(await page.evaluate(()=>window.qaEvents.at(-1)),'upload');
  await home.locator('.entry-portal').evaluate(node=>{const dataTransfer=new DataTransfer();dataTransfer.items.add(new File(['{}'],'qa-drop.json',{type:'application/json'}));node.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer}));});assert.equal(await page.evaluate(()=>window.qaEvents.at(-1)),'qa-drop.json');
  await home.getByRole('button',{name:'Salvar dados na nuvem (Login/Criar Conta)',exact:true}).click();await home.getByRole('region',{name:'Entrar ou criar conta na nuvem'}).waitFor();await home.getByRole('button',{name:'Fechar login'}).click();
  await home.getByRole('button',{name:'Copiar Código',exact:true}).click();await home.getByRole('button',{name:'Copiado! ✓',exact:true}).waitFor();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),code);assert.equal(await home.getByRole('link',{name:'Resgatar no Jogo',exact:true}).getAttribute('href'),'https://event.withhive.com/ci/smon/evt_coupon');await home.getByRole('button',{name:'Atualizar cupons'}).click();
  await page.screenshot({path:`${out}/guest-${width}.png`,fullPage:true});
  const account=quickPresetAccount();account.importedAt='2026-11-18T10:20:00.000Z';await page.evaluate(account=>window.renderHome(account,{key:'siege',label:'Siege Center'}),account);
  const summary=home.getByRole('region',{name:'Resumo da conta'});await summary.getByText('ID 7654321',{exact:true}).waitFor();assert.equal(await summary.locator('time').getAttribute('datetime'),'2026-11-18T10:20:00.000Z');assert.deepEqual(await summary.locator('dd').allTextContents(),['6','60','1']);await home.getByRole('button',{name:'Continuar em Siege Center',exact:true}).click();assert.equal(await page.evaluate(()=>window.qaEvents.at(-1)),'siege');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}/home-${width}.png`,fullPage:true});
  await page.evaluate(account=>window.renderHome({...account,importedAt:'unknown'}),account);await summary.getByText('Data de importação não informada',{exact:true}).waitFor();assert.equal(await summary.locator('time').count(),0);await home.getByRole('button',{name:'Continuar com Conta fictícia de testes',exact:true}).click();assert.equal(await page.evaluate(()=>window.qaEvents.at(-1)),'continue');await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: premium Home metadata, five shortcuts, continuity, SWEX/drop, inline login, copy/redemption/refresh, responsive widths; no runtime errors.');
}finally{await browser.close();}
