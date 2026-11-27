// Real shared tooltip, isolated anonymous contexts; external requests never leave the browser.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';

const origin=process.env.E2E_BASE_URL||'http://127.0.0.1:5297';
const out=process.env.E2E_ARTIFACT_DIR||'/workspace/artifacts/tooltip-pilot-20261109';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
try{
 for(const mobile of [false,true])for(const appearance of ['war','office'])for(const reducedMotion of ['no-preference','reduce']){
  const name=`${mobile?'mobile':'desktop'}-${appearance}-${reducedMotion}`;
  const context=await browser.newContext({viewport:{width:mobile?390:1440,height:mobile?844:960},hasTouch:mobile,isMobile:mobile,reducedMotion});
  await context.addInitScript(()=>localStorage.setItem('has_completed_onboarding','true'));
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin===origin)return route.continue();
   if(url.hostname.endsWith('.supabase.co'))return route.fulfill({json:url.pathname.endsWith('get_engine_settings')?{default_speed_tick:7,max_teams:10,maintenance_mode:false}:[]});
   return route.abort();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(origin+'/#/quick');
   const trigger=page.getByRole('button',{name:'Regras da calculadora reativa',exact:true});
   await trigger.waitFor();
   await page.locator('.appearance-menu>summary').click();
   await page.getByRole('button',{name:new RegExp(`^${appearance==='war'?'War':'Office'} `)}).click();
   assert.equal(await page.locator('html').getAttribute('data-appearance'),appearance);
   assert.ok(page.url().endsWith('/#/quick'));assert.ok(await page.title());
   assert.equal(await page.locator('vite-error-overlay').count(),0);
   const id=await trigger.getAttribute('aria-describedby');assert.ok(id);
   const tooltip=page.locator(`[role="tooltip"][id="${id}"]`);
   assert.equal(await tooltip.count(),1,'A ajuda deve usar o ID associado ao botão');
   assert.equal(await trigger.locator('..').getAttribute('data-export-ignore'),'true');
   const text=await tooltip.textContent();
   assert.match(text,/Selecione seu time e informe SPD de runas ou Pronto por tick\./,'A ajuda explica as regras atuais da calculadora');
   async function visible(want,message){
    assert.equal(await tooltip.isVisible(),want,message);
    const expanded=await trigger.getAttribute('aria-expanded');
    if(expanded!==null)assert.equal(expanded,String(want),'Expanded state follows rendered visibility');
   }
   await page.mouse.move(1,1);
   await trigger.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
   assert.equal(await trigger.evaluate(el=>el===document.activeElement),true,'Keyboard returns to help trigger');
   assert.equal(await tooltip.isVisible(),true,'Keyboard focus opens help');
   const focusStyle=await trigger.evaluate(el=>{const s=getComputedStyle(el);return {outline:s.outlineStyle,shadow:s.boxShadow};});
   assert.ok(focusStyle.outline!=='none'||focusStyle.shadow!=='none','Keyboard focus remains visible');
   await page.keyboard.press('Escape');
   assert.equal(await trigger.evaluate(el=>el===document.activeElement),true,'Escape preserves trigger focus');
   await visible(false,'Escape dismisses help while focused');
   await page.keyboard.press('Tab');
   assert.equal(await trigger.evaluate(el=>el===document.activeElement),false,'Tab advances normally');
   await visible(false,'Tab does not reopen dismissed help');
   await page.keyboard.press('Shift+Tab');await visible(true,'New keyboard focus reopens help');
   await page.keyboard.press('Enter');await visible(false,'Enter toggles focused help closed');
   await page.keyboard.press('Space');await visible(true,'Space toggles focused help open');
   await page.keyboard.press('Tab');await visible(false,'Blur closes help');
   if(mobile){
    await trigger.tap();await visible(true,'First tap opens help');
    await trigger.tap();await visible(false,'Second tap closes despite retained focus');
    await trigger.tap();await visible(true,'Third tap reopens help');
   }else{
    await trigger.hover();await visible(true,'Hover opens help');
    await page.keyboard.press('Escape');await visible(false,'Escape dismisses hover without moving keyboard focus');
    await page.mouse.move(1,1);await trigger.hover();await visible(true,'Hover re-entry reopens dismissed help');
    await page.screenshot({path:`${out}/${name}-open.png`});
    await trigger.click();await visible(false,'Click closes hovered help');
    await trigger.click();await visible(true,'Click deliberately reopens help');
    await page.keyboard.press('Escape');await visible(false,'Escape wins over stationary hover and focus');
    await page.waitForTimeout(100);await visible(false,'Stationary pointer does not reopen dismissed help');
    await page.screenshot({path:`${out}/${name}-dismissed.png`});
    await page.mouse.move(1,1);await trigger.hover();await visible(true,'Leave and re-enter reopens help');
   }
   assert.equal(await tooltip.textContent(),text,'Help text stays intact');
   const box=await tooltip.boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=(mobile?390:1440),'Tooltip fits viewport');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
   await page.screenshot({path:`${out}/${name}-open.png`});
   await page.setViewportSize({width:320,height:740});
   await page.waitForFunction(()=>document.documentElement.clientWidth===320);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.ok(await tooltip.evaluate(el=>{const box=el.getBoundingClientRect(),view=visualViewport;return box.left>=view.offsetLeft&&box.right<=view.offsetLeft+view.width;}),'Resized help fits the actual visible viewport');
   assert.ok(await tooltip.evaluate(el=>{const box=el.getBoundingClientRect();return el.contains(document.elementFromPoint(box.left+12,box.top+20));}),'Help text is above neighboring controls');
   await visible(true,'Open help remains usable after viewport resize');
   await page.screenshot({path:`${out}/${name}-320.png`});
   assert.deepEqual(errors,[]);
   console.log(`PASS: ${name}: focus, Escape, Tab, toggles, description, viewport, runtime`);
  }catch(error){await page.screenshot({path:`${out}/${name}-failure.png`}).catch(()=>{});throw error;}
  finally{await context.close();}
 }
}finally{await browser.close();}
