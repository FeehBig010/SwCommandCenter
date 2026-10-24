import test from 'node:test';import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {blankConfig} from '../src/core/data.js';
import {normalizeSiegeSpec,normalizeKillOrder,toggleKillTarget} from '../src/core/siege-schema.js';
import {cleanSiegeCounter,makeFavorite} from '../src/core/siege.js';
import {cleanCloudPayload} from '../src/core/hub.js';
import {saveCloudTeam} from '../src/lib/guild-cloud.js';
import {siegeGuildRecords,siegeComparisonRows} from '../src/core/siege-central.js';
const members=[13413,18913,21214].map((masterId,i)=>({masterId,label:`Alvo ${i+1}`}));
const counter=()=>cleanSiegeCounter({version:1,name:'Counter tático',enemyDefense:members,offense:{name:'Meu ataque',gameMode:'siege',configs:members.map(m=>({...blankConfig(),...m}))},siege:{defenseLeader:null,killOrder:[2,0,1]}});
test('kill order is optional for legacy counters and rejects repeated, fractional or invalid targets',()=>{
 assert.deepEqual(normalizeSiegeSpec({}).killOrder,[]);assert.deepEqual(normalizeKillOrder([2,0]),[2,0]);
 for(const value of [[0,0],[3],[-1],[1.5],['1'],[0,1,2,0],'2,0,1',{},Array(1)])assert.throws(()=>normalizeKillOrder(value),/Ordem de matar/);
 const raw=[2,0,1],clean=normalizeKillOrder(raw);clean.reverse();assert.deepEqual(raw,[2,0,1]);
});
test('click selection preserves the chosen sequence, compacts priorities and never duplicates targets',()=>{
 let order=[];for(const slot of [2,0,1])order=toggleKillTarget(order,slot);assert.deepEqual(order,[2,0,1]);
 const saved=[...order];order=toggleKillTarget(order,0);assert.deepEqual(order,[2,1]);assert.deepEqual(saved,[2,0,1]);
 assert.deepEqual(toggleKillTarget(order,0),[2,1,0]);assert.throws(()=>toggleKillTarget([],3),/Alvo/);
});
test('portable counter and favorite roundtrips retain tactical order even for duplicate enemy monsters',()=>{
 const c=counter();c.enemyDefense[1]={...c.enemyDefense[0]};c.offense.configs[0].unitId=777;
 const favorite=makeFavorite(c,'local:test'),restored=cleanCloudPayload('counter',favorite.counter);
 assert.deepEqual(restored.siege.killOrder,[2,0,1]);assert.equal(restored.enemyDefense[0].masterId,restored.enemyDefense[1].masterId);assert.equal(restored.offense.configs[0].unitId,undefined);
});
test('database write includes kill order in the existing counter JSON payload and read cleaning preserves it',async()=>{
 const userId='11111111-1111-4111-8111-111111111111',guildId='22222222-2222-4222-8222-222222222222';let stored;
 const client=createClient('https://example.supabase.co','public-test-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(_url,init)=>{stored=JSON.parse(init.body);return new Response(JSON.stringify({...stored,id:'33333333-3333-4333-8333-333333333333'}),{status:201,headers:{'content-type':'application/json'}});}}});
 const saved=await saveCloudTeam(client,userId,{name:'Counter tático',kind:'counter',visibility:'guild',guild_id:guildId,payload:counter()});
 assert.deepEqual(stored.payload.siege.killOrder,[2,0,1]);assert.deepEqual(cleanCloudPayload(saved.kind,saved.payload).siege.killOrder,[2,0,1]);
});
test('grouped guild comparisons keep each attack order tied to its original defense positions',()=>{
 const a=counter(),b=counter();a.id='a';b.id='b';b.enemyDefense=[members[2],members[0],members[1]];b.siege.killOrder=[0,2,1];
 const rows=siegeComparisonRows(siegeGuildRecords([], [a,b]));assert.equal(rows.length,1);assert.equal(rows[0].attacks.length,2);
 const targets=rows[0].attacks.map(r=>r.counter.siege.killOrder.map(slot=>r.counter.enemyDefense[slot].masterId));assert.deepEqual(targets,[[21214,13413,18913],[21214,18913,13413]]);
});
