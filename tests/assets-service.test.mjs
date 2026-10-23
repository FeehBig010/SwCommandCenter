import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,access,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import cron from 'node-cron';
import {ASSET_REPOSITORY,ASSET_BRANCH,ASSET_CRON,ASSET_TIMEZONE,IMAGE_URL,MANIFEST_URL,assetPaths} from '../server/asset-paths.js';
import {createAssetUpdater} from '../server/assets-sync.js';
import {startAssetSchedule} from '../server/assets-scheduler.js';
import {copyPublicAssets} from '../server/public-assets.js';
import {createAppServer} from '../server/http-server.js';

async function fixture(t,{checkout=true}={}){
 const root=await mkdtemp(path.join(tmpdir(),'sw-assets-test-'));t.after(()=>rm(root,{recursive:true,force:true}));const paths=assetPaths(root),calls=[],logs=[];
 async function files(){await mkdir(path.join(paths.checkout,'.git'),{recursive:true});await writeFile(path.join(paths.checkout,'.git','config'),'git metadata must not be published');await mkdir(path.join(paths.imageRoot,'monsters'),{recursive:true});await mkdir(path.dirname(paths.fixture),{recursive:true});await writeFile(path.join(paths.imageRoot,'monsters','unit_icon_test.png'),'image-v1');await writeFile(paths.fixture,JSON.stringify([{model:'bestiary.monster',fields:{com2us_id:12301,image_filename:'unit_icon_test.png'}},{model:'bestiary.monster',fields:{com2us_id:12302,image_filename:'missing.png'}},{model:'bestiary.monster',fields:{com2us_id:12303,image_filename:'../bad.png'}}]));}
 if(checkout)await files();
 const logger={info:s=>logs.push(s),error:s=>logs.push(s)};
 async function git(args,cwd){calls.push({args,cwd});if(args[0]==='clone')await files();return {stdout:args[0]==='rev-parse'?(args[1]==='--show-toplevel'?paths.checkout:'1234567890abcdef'):args[0]==='remote'?ASSET_REPOSITORY:args[0]==='branch'?ASSET_BRANCH:'Already up to date.',stderr:''};}
 return {root,paths,git,calls,logs,logger};
}

test('bootstrap clones the public sparse repository and atomically indexes only existing safe portraits',async t=>{
 const f=await fixture(t,{checkout:false}),updater=createAssetUpdater(f),manifest=await updater.sync({pull:false});
 assert.deepEqual(manifest.monsters,{'12301':'unit_icon_test.png'});assert.equal(manifest.source,ASSET_REPOSITORY);assert.equal(manifest.revision,'1234567890abcdef');
 assert.deepEqual(f.calls[0].args,['clone','--depth=1','--filter=blob:none','--sparse','--branch','master',ASSET_REPOSITORY,f.paths.checkout]);assert.ok(f.calls.some(c=>c.args[0]==='sparse-checkout'));assert.ok(!f.calls.some(c=>c.args[0]==='pull'));assert.match(f.logs.at(-1),/Sucesso: 1 retratos/);assert.deepEqual(JSON.parse(await readFile(f.paths.manifest,'utf8')),manifest);
});
test('weekly/manual sync uses fast-forward pull in the image checkout and prevents overlapping Git operations',async t=>{
 const f=await fixture(t),updater=createAssetUpdater(f),a=updater.sync(),b=updater.sync();assert.equal(a,b);assert.equal(updater.busy,true);await a;assert.equal(updater.busy,false);
 const pulls=f.calls.filter(c=>c.args[0]==='pull');assert.equal(pulls.length,1);assert.equal(pulls[0].cwd,f.paths.checkout);assert.deepEqual(pulls[0].args,['pull','--ff-only','origin','master']);assert.ok(f.logs.some(s=>s.includes('já em andamento')));
});
test('network failures log actionable Git details, preserve the previous manifest and allow the next retry',async t=>{
 const f=await fixture(t);await writeFile(f.paths.manifest,'previous-index');let fail=true;const git=async(args,cwd)=>{if(args[0]==='pull'&&fail)throw Object.assign(new Error('Git exited 128'),{code:128,stderr:'fatal: Could not resolve host: github.com'});return f.git(args,cwd);};const updater=createAssetUpdater({...f,git});
 await assert.rejects(updater.sync(),/Git exited/);assert.equal(updater.busy,false);assert.equal(await readFile(f.paths.manifest,'utf8'),'previous-index');assert.ok(f.logs.some(s=>s.includes('Could not resolve host: github.com')&&s.includes('128')));fail=false;await updater.sync();assert.match(f.logs.at(-1),/Sucesso/);
});
test('missing or mismatched checkouts cannot cause git pull in the parent app repository',async t=>{
 const f=await fixture(t);await rm(path.join(f.paths.checkout,'.git'),{recursive:true});await assert.rejects(createAssetUpdater(f).sync(),/não é o clone/);assert.equal(f.calls.length,0);
 await mkdir(path.join(f.paths.checkout,'.git'));const git=async(args,cwd)=>args[0]==='remote'?{stdout:'https://example.test/wrong.git',stderr:''}:f.git(args,cwd);await assert.rejects(createAssetUpdater({...f,git}).sync(),/não corresponde/);assert.ok(!f.calls.some(c=>c.args[0]==='pull'));
});
test('cron matches Tuesday at exactly 23:59 Sao Paulo and remains registered after a failed execution',async()=>{
 let invocation,options,expression;const logs=[],task=startAssetSchedule({sync:async()=>{throw new Error('already logged by updater');}},{logger:{info:s=>logs.push(s)},scheduler:{schedule:(pattern,callback,opts)=>{expression=pattern;options=opts;invocation=callback;return cron.createTask(pattern,callback,opts);}}});
 try{assert.equal(expression,'59 23 * * 2');assert.equal(ASSET_CRON,expression);assert.equal(options.timezone,ASSET_TIMEZONE);assert.equal(options.noOverlap,true);assert.equal(task.match(new Date('2026-10-28T02:59:00Z')),true);assert.equal(task.match(new Date('2026-10-27T23:59:00Z')),false);assert.equal(task.match(new Date('2026-10-28T02:58:00Z')),false);assert.equal(await invocation(),false);assert.equal(task.getPattern(),ASSET_CRON);assert.match(logs[0],/America\/Sao_Paulo/);}finally{await task.destroy();}
});
test('frontend build copies artwork and the manifest but excludes Git metadata and database fixtures',async t=>{
 const f=await fixture(t);await writeFile(f.paths.manifest,'{}');await writeFile(path.join(f.paths.publicDir,'brand.svg'),'<svg/>');await copyPublicAssets(f.root);const dist=path.join(f.root,'dist');
 assert.equal(await readFile(path.join(dist,IMAGE_URL.slice(1),'monsters/unit_icon_test.png'),'utf8'),'image-v1');await access(path.join(dist,MANIFEST_URL.slice(1)));await access(path.join(dist,'brand.svg'));await assert.rejects(access(path.join(dist,'assets/imagens_sw/.git/config')));await assert.rejects(access(path.join(dist,'assets/imagens_sw/bestiary/fixtures/bestiary_data.json')));
});
test('Node backend serves refreshed artwork without rebuilding, handles cache validation and never serves checkout metadata',async t=>{
 const f=await fixture(t);await mkdir(path.join(f.root,'dist'));await writeFile(path.join(f.root,'dist/index.html'),'<html>SwCommandCenter</html>');await writeFile(f.paths.manifest,'{"version":1}');const server=createAppServer(f);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));const base=`http://127.0.0.1:${server.address().port}`;
 let response=await fetch(`${base}/`);assert.equal(response.status,200);assert.match(await response.text(),/SwCommandCenter/);
 const imageUrl=`${base}${IMAGE_URL}monsters/unit_icon_test.png`;response=await fetch(imageUrl);assert.equal(response.headers.get('content-type'),'image/png');assert.match(response.headers.get('cache-control'),/must-revalidate/);const etag=response.headers.get('etag');assert.equal(await response.text(),'image-v1');assert.equal((await fetch(imageUrl,{headers:{'If-None-Match':etag}})).status,304);
 await writeFile(path.join(f.paths.imageRoot,'monsters/unit_icon_test.png'),'image-v2-updated');assert.equal(await (await fetch(imageUrl)).text(),'image-v2-updated');response=await fetch(`${base}${MANIFEST_URL}`);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{version:1});
 for(const suffix of ['/assets/imagens_sw/.git/config','/assets/imagens_sw/bestiary/fixtures/bestiary_data.json',`${IMAGE_URL}missing.png`,`${IMAGE_URL}%2e%2e%2f%2e%2e%2f.git/config`])assert.equal((await fetch(base+suffix,{headers:{Accept:'text/html'}})).status,404,suffix);
 assert.equal((await fetch(`${base}/siege`,{headers:{Accept:'text/html'}})).status,200);assert.equal((await fetch(imageUrl,{method:'HEAD'})).headers.get('content-length'),'16');assert.equal((await fetch(imageUrl,{method:'POST'})).status,405);
});
