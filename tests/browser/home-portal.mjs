// Premium Home integration; synthetic public endpoints, no real account or redemption.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
const origin=process.env.E2E_BASE_URL||'http://127.0.0.1:5294',out=process.env.E2E_ARTIFACT_DIR||'/tmp/sw-original-portal';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const code='PORTALQACOUPON',history={[code]:{code,status:'active',sources:['SWGT'],last_seen:new Date().toISOString(),reward:'Mana ×300,000, Mystical Scroll ×2'}},errors=[];
try{
 for(const viewport of [{width:1920,height:1080},{width:1440,height:960},{width:390,height:844},{width:320,height:740}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce',hasTouch:viewport.width<768,permissions:['clipboard-read','clipboard-write']});
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue();if(u.hostname.endsWith('.supabase.co'))return route.fulfill({json:u.pathname.endsWith('get_engine_settings')?{default_speed_tick:7,max_teams:10,maintenance_mode:false}:[]});if(u.hostname==='raw.githubusercontent.com'&&u.pathname.endsWith('code_history.json'))return route.fulfill({json:history});if(['event.withhive.com','withhive.me'].includes(u.hostname))return route.fulfill({contentType:'text/html',body:'<title>Redemption destination QA</title>'});return route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/#/portal');await page.getByRole('heading',{name:'Sua Central de Comando',exact:true}).waitFor();await page.getByRole('button',{name:'Copiar Código',exact:true}).waitFor();
  await page.locator('.portal-guide>img').evaluate(img=>img.decode());assert.equal(await page.locator('.portal-guide>img').getAttribute('src'),'/art/portal-ciri.png');
  assert.equal(await page.locator('.portal-shell.premium-tactical').count(),1);assert.equal(await page.locator('.sidebar,.topbar').count(),2);assert.equal(await page.locator('vite-error-overlay').count(),0);
  assert.equal(await page.locator('.nav-primary>button').count(),5);assert.equal(await page.getByRole('navigation',{name:'Módulos principais'}).getByRole('button').count(),5);
  const bounds=await page.locator('.premium-home').evaluate(root=>Object.fromEntries(['portal-guide','portal-account','portal-coupons'].map(name=>[name,root.querySelector('.'+name).getBoundingClientRect().toJSON()])));
  if(viewport.width>700){assert.ok(bounds['portal-guide'].x<bounds['portal-account'].x);const sidebar=await page.locator('.sidebar').boundingBox(),workspace=await page.locator('.workspace').boundingBox();assert.ok(workspace.x>=sidebar.x+sidebar.width-1,'sidebar leaves room for Home');}
  else {assert.ok(bounds['portal-guide'].y<bounds['portal-account'].y);assert.equal(await page.locator('.sidebar').isVisible(),false);}
  assert.ok(bounds['portal-coupons'].y>=bounds['portal-account'].bottom);for(const r of Object.values(bounds))assert.ok(r.width>0&&r.height>0&&r.left>=0&&r.right<=viewport.width);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}/welcome-${viewport.width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Salvar dados na nuvem (Login/Criar Conta)',exact:true}).click();const login=page.getByRole('region',{name:'Entrar ou criar conta na nuvem',exact:true});await login.waitFor();await login.getByLabel('E-mail',{exact:true}).fill('qa@example.test');assert.equal(await login.getByLabel('E-mail',{exact:true}).inputValue(),'qa@example.test');await page.getByRole('button',{name:'Fechar login',exact:true}).click();
  await page.getByRole('button',{name:'Copiar Código',exact:true}).click();await page.getByRole('button',{name:'Copiado! ✓',exact:true}).waitFor();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),code);
  const web=page.getByRole('link',{name:'Resgatar no Jogo',exact:true});assert.equal(await web.getAttribute('href'),'https://event.withhive.com/ci/smon/evt_coupon');assert.equal(await web.getAttribute('target'),'_blank');assert.match(await web.getAttribute('rel'),/noopener noreferrer/);let popupPromise=page.waitForEvent('popup');await web.click();let popup=await popupPromise;await popup.waitForLoadState();assert.equal(popup.url(),'https://event.withhive.com/ci/smon/evt_coupon');await popup.close();
  const app=page.locator('.coupon-app-link');assert.equal(await app.isVisible(),viewport.width<768);if(viewport.width<768){assert.equal(await app.getAttribute('href'),`https://withhive.me/313/${code}`);await page.locator('.portal-coupons').screenshot({path:`${out}/coupons-${viewport.width}.png`});}
  if(viewport.width===1440){
   await page.evaluate(()=>{const Original=Worker;window.importWorkers=0;window.Worker=class extends Original{constructor(url,options){super(url,options);if(String(url).includes('import-account.worker'))window.importWorkers++;}};});
   const picker=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Selecionar arquivo JSON SWEX',exact:true}).click();await(await picker).setFiles({name:'corrupt.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await page.getByRole('alert').filter({hasText:'O arquivo não é um JSON válido'}).waitFor();assert.equal(await page.evaluate(()=>window.importWorkers),1);await page.locator('.swex-loading-overlay').waitFor({state:'hidden'});
   await page.getByRole('button',{name:'Abrir Calculadora Livre',exact:true}).click();await page.getByRole('heading',{name:'Calculadora Livre',exact:true}).waitFor();assert.ok(page.url().endsWith('#/quick'));assert.equal(await page.locator('.portal-shell').count(),0);assert.equal(await page.getByRole('navigation',{name:'Navegação principal'}).count(),1);await page.reload();await page.getByRole('heading',{name:'Calculadora Livre',exact:true}).waitFor();
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: premium Home with Ciri, calculator/SWEX/cloud login and coupons together; independent scrolling cards, five primary destinations, non-overlay desktop sidebar and accessible mobile stack, clipboard and external destinations, original file picker/Worker, calculator route and refresh; no runtime errors.');
}catch(error){let index=0;for(const context of browser.contexts())for(const failedPage of context.pages())await failedPage.screenshot({path:`${out}/failure-${Date.now()}-${index++}.png`,fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();}
