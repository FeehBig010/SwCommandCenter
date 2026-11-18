// Motion QA uses public synthetic responses only; no real login, inventory or redemption.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
const origin=process.env.E2E_BASE_URL||'http://127.0.0.1:5294',out='/tmp/sw-premium-motion';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
async function setup({mobile=false,reducedMotion='no-preference',width=1366}={}){
 const context=await browser.newContext({viewport:{width,height:mobile?844:900},hasTouch:mobile,isMobile:mobile,reducedMotion,permissions:['clipboard-read','clipboard-write']});
 await context.addInitScript(()=>{
  localStorage.setItem('has_completed_onboarding','true');localStorage.setItem('qa-preserve','original');
  window.motionCalls=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){window.motionCalls.push(options?.id||'other');return animate.call(this,frames,options);};
  window.frameCount=0;const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>raf(time=>{window.frameCount++;callback(time);});
 });
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue();if(u.hostname.endsWith('.supabase.co'))return route.fulfill({json:u.pathname.endsWith('get_engine_settings')?{default_speed_tick:7,max_teams:10,maintenance_mode:false}:[]});if(u.hostname==='raw.githubusercontent.com'&&u.pathname.endsWith('code_history.json'))return route.fulfill({json:{PREMIUMQA:{code:'PREMIUMQA',status:'active',sources:['SWGT'],last_seen:new Date().toISOString(),reward:'Mana ×300,000'}}});return route.abort();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));return {context,page,errors};
}
async function home(page){await page.goto(origin+'/#/portal');await page.getByRole('heading',{name:'Sua Central de Comando',exact:true}).waitFor();await page.getByRole('button',{name:'Copiar Código',exact:true}).waitFor();await page.waitForFunction(()=>!document.getAnimations().some(a=>a.id.startsWith('swcc-home-')&&a.playState==='running'));}
async function mode(page,name){await page.locator('.appearance-menu>summary').click();await page.getByRole('button',{name:new RegExp('^'+name+' ')}).click();await page.waitForFunction(name=>document.documentElement.dataset.appearance===name,name.toLowerCase());}
try{
 let {context,page,errors}=await setup();await home(page);
 assert.equal(await page.locator('html').getAttribute('data-appearance'),'war');
 const entranceCount=await page.evaluate(()=>window.motionCalls.filter(id=>id.startsWith('swcc-home-')).length);assert.equal(entranceCount,0,'Home cards do not require a cinematic entrance');
 assert.equal(await page.locator('.home-modules>button').count(),5);assert.equal(await page.locator('.nav-primary>button').count(),5);
 const sidebar=await page.locator('.sidebar').boundingBox(),workspace=await page.locator('.workspace').boundingBox();assert.ok(workspace.x>=sidebar.x+sidebar.width-1,'sidebar reserves its own width');
 const card=page.locator('.portal-manual');await card.scrollIntoViewIfNeeded();const rect=await card.boundingBox();await page.mouse.move(rect.x+rect.width*.8,rect.y+rect.height*.4);await page.waitForTimeout(350);
 assert.equal(await card.evaluate(el=>getComputedStyle(el).transform),'none');assert.equal(await page.locator('[data-home-tilt]').count(),0);
 const afterHover=await card.boundingBox();assert.ok(Math.abs(afterHover.x-rect.x)<1&&Math.abs(afterHover.y-rect.y)<1,'independent Home cards remain stable on hover');
 assert.equal(await page.locator('.app-motion-layer').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
 const frames=await page.evaluate(()=>window.frameCount);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>window.frameCount),frames,'A settled hover must not keep a frame loop running');
 await page.screenshot({path:out+'/home-war.png',fullPage:true});await page.mouse.move(2,2);
 await page.getByRole('button',{name:'Salvar dados na nuvem (Login/Criar Conta)',exact:true}).click();const email=page.getByRole('region',{name:'Entrar ou criar conta na nuvem',exact:true}).getByLabel('E-mail',{exact:true});await email.fill('motion@example.test');await email.hover();assert.equal(await page.locator('.portal-account[data-home-tilt]').count(),0);await page.getByRole('button',{name:'Fechar login',exact:true}).click();
 await mode(page,'Office');assert.equal(await page.locator('.portal-account').evaluate(el=>getComputedStyle(el).transform),'none');assert.equal(await page.locator('.portal-coupons').evaluate(el=>getComputedStyle(el).boxShadow),'none');
 assert.equal(await page.evaluate(()=>window.motionCalls.filter(id=>id.startsWith('swcc-home-')).length),entranceCount,'Minor state updates must not restart Home entrances');
 assert.equal(await page.evaluate(()=>localStorage.getItem('qa-preserve')),'original');await page.screenshot({path:out+'/home-office.png'});
 await page.reload();await page.getByRole('heading',{name:'Sua Central de Comando',exact:true}).waitFor();assert.equal(await page.locator('html').getAttribute('data-appearance'),'office');
 const menu=page.locator('.appearance-menu>summary');await menu.focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');assert.ok(await menu.evaluate(el=>document.activeElement===el));assert.equal(await page.locator('.appearance-menu').getAttribute('open'),null);
 await page.getByRole('button',{name:'Abrir Calculadora Livre',exact:true}).click();await page.getByRole('heading',{name:'Calculadora Livre',exact:true}).waitFor();assert.equal(await page.locator('html').getAttribute('data-appearance'),'office');
 await mode(page,'War');await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Início',exact:true}).click();await page.getByRole('heading',{name:'Sua Central de Comando',exact:true}).waitFor();
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('[data-home-tilt]')&&!document.querySelector('.app-motion-layer'));
 assert.equal(await page.locator('.portal-manual').evaluate(el=>getComputedStyle(el).animationName),'none');assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.id.startsWith('swcc-')&&a.playState==='running').length),0);
 await page.emulateMedia({reducedMotion:'no-preference'});await card.scrollIntoViewIfNeeded();const box=await card.boundingBox();await page.mouse.move(box.x+30,box.y+30);await page.locator('.app-motion-layer').waitFor();assert.equal(await card.evaluate(el=>getComputedStyle(el).transform),'none');await page.emulateMedia({forcedColors:'active'});await page.waitForFunction(()=>!document.querySelector('[data-home-tilt]')&&!document.querySelector('.app-motion-layer'));
 assert.equal(await page.locator('vite-error-overlay').count(),0);assert.deepEqual(errors,[]);await context.close();
 for(const width of [390,320]){
  ({context,page,errors}=await setup({mobile:true,width}));await home(page);await page.getByRole('button',{name:'Copiar Código',exact:true}).tap();await page.getByRole('button',{name:'Copiado! ✓',exact:true}).waitFor();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'PREMIUMQA');assert.equal(await page.locator('[data-home-tilt]').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+`/mobile-${width}.png`});await mode(page,'Office');await page.getByRole('button',{name:'Abrir Calculadora Livre',exact:true}).tap();await page.getByRole('heading',{name:'Calculadora Livre',exact:true}).waitFor();const importButton=page.getByRole('button',{name:'Importar JSON',exact:true});assert.ok(await importButton.isVisible());const bounds=await importButton.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+`/calculator-${width}.png`});assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: stable independent Home cards and non-overlay sidebar, decorative feedback with no idle RAF, neutral input editing, Office/War persistence isolated from account data, keyboard/Escape, live reduced-motion and forced-colors, touch feedback and 320/390px layout; original calculator/clipboard destinations, no runtime errors.');
}catch(error){let index=0;for(const context of browser.contexts())for(const failedPage of context.pages())await failedPage.screenshot({path:`${out}/failure-${Date.now()}-${index++}.png`,fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();}
