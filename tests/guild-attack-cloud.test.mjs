import test from 'node:test';import assert from 'node:assert/strict';import {createClient} from '@supabase/supabase-js';
import {saveCloudTeam,listCloudTeams,voteGuildAttack,updateGuildAttackTarget} from '../src/lib/guild-cloud.js';
import {makeTeam,blankConfig} from '../src/core/data.js';
const user='11111111-1111-4111-8111-111111111111',guild='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';
const team={...makeTeam('siege'),mode:'attack',configs:Array.from({length:3},()=>({...blankConfig(),masterId:13413,label:'Lushen'}))};
const row={id,owner_id:user,guild_id:guild,visibility:'guild',kind:'plan',name:'Ataque',payload:{version:1,team},updated_at:'2026-10-23T00:00:00Z'};
function client(handler){return createClient('http://localhost:54321','test',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:handler}});}
const respond=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
test('sharing POST is a portable attack and cannot spoof votes or leak equipment IDs',async()=>{
 let sent;await saveCloudTeam(client(async(url,init)=>{sent=JSON.parse(init.body);return respond(row);}),user,{...row,target_defense:'  Molly / Vritra / Solveig  ',votes:{upvotes:999}});assert.equal(sent.target_defense,'Molly / Vritra / Solveig');assert.equal(sent.visibility,'guild');assert.equal(sent.votes,undefined);assert.ok(!JSON.stringify(sent.payload).includes('unitId'));
});
test('guild metadata and own ballot are loaded separately with compatibility for pre-migration deployments',async()=>{
 let missing=false;const c=client(async url=>{const u=new URL(url);if(u.pathname.endsWith('guild_team_votes'))return respond([{team_id:id,vote:1}]);if(u.searchParams.get('select')==='id,votes,target_defense')return missing?respond({code:'42703',message:'column votes does not exist'},400):respond([{id,votes:{upvotes:2,downvotes:1},target_defense:'Clara'}]);return respond([row]);});
 let list=await listCloudTeams(c,user,guild);assert.equal(list[0].my_vote,1);assert.deepEqual(list[0].votes,{upvotes:2,downvotes:1});assert.equal(list[0].target_defense,'Clara');assert.equal(list.attackFeaturesReady,true);missing=true;list=await listCloudTeams(c,user,guild);assert.equal(list.length,1);assert.equal(list.attackFeaturesReady,false);
});
test('votes use the constrained RPC and target edits enforce author plus optimistic concurrency',async()=>{
 const calls=[],c=client(async(url,init)=>{calls.push({url:new URL(url),method:init.method,body:init.body&&JSON.parse(init.body)});return respond(row);});await voteGuildAttack(c,row,-1);assert.equal(calls[0].url.pathname,'/rest/v1/rpc/set_guild_team_vote');assert.deepEqual(calls[0].body,{target:id,value:-1});await assert.rejects(voteGuildAttack(c,row,10),/Voto/);
 await assert.rejects(updateGuildAttackTarget(c,'44444444-4444-4444-8444-444444444444',row,'Novo'),/autor/);await updateGuildAttackTarget(c,user,row,'Novo');assert.deepEqual(calls[1].body,{target_defense:'Novo'});assert.equal(calls[1].url.searchParams.get('owner_id'),`eq.${user}`);assert.equal(calls[1].url.searchParams.get('updated_at'),`eq.${row.updated_at}`);
});
