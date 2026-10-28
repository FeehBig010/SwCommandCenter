// Exercise the real portrait component with a delayed local image index.
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const origin=process.env.E2E_BASE_URL||'http://127.0.0.1:5294';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
const context=await browser.newContext();let release;const manifestGate=new Promise(resolve=>{release=resolve;});
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.origin!==origin)return route.abort();
 if(url.pathname==='/__qa__/portrait')return route.fulfill({contentType:'text/html',body:`<div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">
 import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';import MonsterPortrait from '/src/components/MonsterPortrait.jsx';import {resolveMonsterImageSources} from '/src/core/monsters';
 window.qaRefresh=()=>resolveMonsterImageSources(13413);ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(MonsterPortrait,{master:13413,name:'Lushen'}));</script>`});
 if(url.pathname==='/assets/sw-monster-images.json'){await manifestGate;return route.fulfill({json:{version:1,monsters:{13413:'unit_icon_0011_2_2.png'}}});}
 return route.continue();
});
try{
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});page.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),r.url());});await page.goto(`${origin}/__qa__/portrait`,{waitUntil:'domcontentloaded'});
 const portrait=page.locator('.monster-portrait');await page.locator('.portrait-photo.is-loaded').waitFor().catch(async e=>{console.error(await page.locator('body').innerHTML());throw e;});const src=await page.locator('.portrait-photo').getAttribute('src');release();
 await page.evaluate(async()=>{await window.qaRefresh();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 assert.equal(await page.locator('.portrait-photo').getAttribute('src'),src);assert.ok(await portrait.evaluate(node=>!node.classList.contains('portrait-fallback')),'Refreshing alternate sources must not hide a photo already loaded at the same URL.');assert.ok(await page.locator('.portrait-photo').evaluate(img=>img.complete&&img.naturalWidth>0&&img.classList.contains('is-loaded')));assert.deepEqual(errors,[]);
 console.log('PASS: delayed avatar index refresh keeps an already loaded local photo visible when only the alternate sources change.');
}finally{release();await browser.close();}
