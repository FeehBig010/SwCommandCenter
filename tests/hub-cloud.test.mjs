import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {blankConfig,makeTeam} from '../src/core/data.js';
import {portableTeam,copyTeamToOptimizer,cleanMatchup,cleanCloudPayload} from '../src/core/hub.js';
import {saveCloudTeam,listCloudTeams,deleteCloudTeam} from '../src/lib/guild-cloud.js';
import {publicSupabaseConfig} from '../src/lib/supabase-config.js';
const owner='11111111-1111-4111-8111-111111111111',guild='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';
function team(size=3){return {...makeTeam({3:'siege',4:'arena',5:'cairos'}[size]),name:'Ofensa',mode:'attack',configs:Array.from({length:size},(_,i)=>({...blankConfig(),unitId:100+i,masterId:13413,label:'Lushen',accountSession:'private',damage:{enabled:true,multiplier:2}}))};}
test('portable hub teams support 3/4/5 slots and exclude inventory, copies, sessions and hidden slots',()=>{
 for(const n of [3,4,5]){const t=team(n);t.session_key='private';t.inactiveConfigs=[{session_key:'private'}];const portable=portableTeam(t);assert.equal(portable.configs.length,n);assert.ok(!JSON.stringify(portable).includes('private'));assert.ok(!JSON.stringify(portable).includes('unitId'));assert.equal(portable.configs[0].damage.multiplier,2);assert.equal(portable.mode,'attack');}
 assert.throws(()=>portableTeam({...team(),configs:[{}]}),/3 a 6/);
});
test('copy to optimizer is independent, matches exact masters and distinct account copies, and reports missing instances',()=>{
 const source=portableTeam(team());const account={units:[{id:900,master:13413,name:'Lushen',level:40},{id:901,master:13413,name:'Lushen',level:35},{id:902,master:13911,name:'Julie',level:40}]};
 const copied=copyTeamToOptimizer(source,account);assert.deepEqual(copied.configs.map(c=>c.unitId),[900,901,null]);assert.equal(copied.mode,'attack');assert.notEqual(copied.configs[0].key,copied.configs[1].key);copied.configs[0].goals.hp=99999;assert.equal(source.configs[0].goals.hp,'');assert.deepEqual(copyTeamToOptimizer(source,null).configs.map(c=>c.unitId),[null,null,null]);
});
test('offense-vs-defense storage preserves observed outcomes and never places enemy units into own configs',()=>{
 const matchup=cleanMatchup({offense:team(4),enemyDefense:[13413,13911,19614].map(master=>({masterId:master,label:'Defesa'})),outcome:'win',notes:'Teste',name:'Meu confronto'});
 assert.equal(matchup.offense.configs.length,4);assert.equal(matchup.enemyDefense.length,3);assert.equal(matchup.outcome,'win');assert.equal(matchup.offense.mode,'attack');assert.ok(matchup.enemyDefense.every(e=>!('unitId' in e)));assert.throws(()=>cleanMatchup({...matchup,enemyDefense:[null,null,null]}),/Complete/);
 assert.deepEqual(cleanCloudPayload('counter',matchup),matchup);assert.throws(()=>cleanCloudPayload('other',matchup),/Tipo/);
});
test('public Supabase setup handles absent/invalid values and rejects administrative keys',()=>{
 assert.equal(publicSupabaseConfig({}).configured,false);assert.equal(publicSupabaseConfig({VITE_SUPABASE_URL:'not-a-url',VITE_SUPABASE_ANON_KEY:'anon'}).configured,false);
 assert.equal(publicSupabaseConfig({VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_ANON_KEY:'sb_publishable_public'}).configured,true);
 const jwt=['header',Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url'),'sig'].join('.');
 for(const key of [jwt,'sb_secret_never-public'])assert.equal(publicSupabaseConfig({VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_ANON_KEY:key}).configured,false);
});
function clientFor(handler){return createClient('http://localhost:54321','test-public-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:handler}});}
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
test('real Supabase SDK request sends only portable team payload and uses explicit ownership and concurrency filters',async()=>{
 const requests=[];const row={id,owner_id:owner,guild_id:guild,kind:'plan',visibility:'private',is_leadership:false,name:'Ofensa',payload:{version:1,team:portableTeam(team())},updated_at:'2026-10-22T12:00:00Z'};
 const client=clientFor(async(url,init)=>{requests.push({url:new URL(url),method:init.method,body:init.body?JSON.parse(init.body):null});return respond(row);});
 await saveCloudTeam(client,owner,{...row,payload:{version:1,team:{...team(),session_key:'private'}}});
 assert.equal(requests[0].method,'POST');assert.equal(requests[0].body.owner_id,owner);assert.ok(!JSON.stringify(requests[0].body).includes('unitId'));assert.ok(!JSON.stringify(requests[0].body).includes('session_key'));
 await saveCloudTeam(client,owner,row,row);assert.equal(requests[1].method,'PATCH');assert.equal(requests[1].url.searchParams.get('updated_at'),`eq.${row.updated_at}`);assert.equal(requests[1].url.searchParams.get('owner_id'),`eq.${owner}`);
});
test('sync rejects conflicting edits/deletes and isolates malformed payloads while preserving valid records',async()=>{
 const payload={version:1,team:portableTeam(team())},row={id,owner_id:owner,name:'Ofensa',kind:'plan',payload,updated_at:'2026-10-22T12:00:00Z'};
 const conflict=clientFor(async()=>respond(null));await assert.rejects(saveCloudTeam(conflict,owner,row,row),/mudou em outro/);
 const deletion=clientFor(async()=>respond([]));await assert.rejects(deleteCloudTeam(deletion,owner,row),/mudou/);
 const reader=clientFor(async()=>respond([{...row,payload:{version:99}},row]));const list=await listCloudTeams(reader,owner,guild);assert.equal(list.length,1);assert.equal(list[0].id,id);
 await assert.rejects(listCloudTeams(reader,'bad-id',guild),/inválido/);
});
