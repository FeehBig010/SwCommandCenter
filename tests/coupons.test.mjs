import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PGlite} from '@electric-sql/pglite';
import {fetchActiveCoupons,normalizeCouponRows,visibleCoupons,copyCouponCode,couponRedeemUrl,REWARD_ASSETS,COUPON_COPY_DURATION} from '../src/lib/coupons.js';

const now=Date.parse('2026-10-26T15:00:00Z');
const row=(code='OCTSW2026O7J',extra={})=>({code,rewards:[{type:'mana',amount:300000},{type:'mystical',amount:2}],status:'active',source:'manual',checked_at:'2026-10-26T14:00:00Z',expires_at:'2026-10-31T23:59:00Z',...extra});
const publicHistory={OCTSW2026O7J:{code:'OCTSW2026O7J',status:'active',sources:['SWGT'],last_seen:'2026-10-26T14:00:00Z',reward:'Wind Scroll ×3'}};
const api=async()=>({ok:true,text:async()=>JSON.stringify(publicHistory)});
function database(data,error=null){const calls=[];let signal;const q={select(v){calls.push(['select',v]);return this;},eq(...v){calls.push(['eq',...v]);return this;},or(v){calls.push(['or',v]);return this;},order(...v){calls.push(['order',...v]);return this;},limit(v){calls.push(['limit',v]);return this;},abortSignal(s){signal=s;return this;},then(resolve){return Promise.resolve({data,error}).then(resolve);}};return {calls,get signal(){return signal;},from(name){calls.push(['from',name]);return q;}};}
test('Supabase is queried first using only public fields and live expiry; fresh rows avoid the external API',async()=>{
 const client=database([row()]);let external=0;
 const result=await fetchActiveCoupons({client,now,fetcher:async()=>{external++;throw Error();}});
 assert.equal(external,0);assert.equal(result.source,'supabase');assert.equal(result.coupons[0].rewards[0].amount,300000);assert.deepEqual(client.calls[0],['from','coupons']);assert.ok(client.calls.some(c=>c[0]==='or'&&c[1].includes('expires_at.gt.2026-10-26T15:00:00.000Z')));assert.ok(client.signal);
});
test('expired/disabled coupons, invalid dates and stale unknown expirations are discarded, including at the exact expiry instant',()=>{
 const rows=[row(),row('EXPIRED',{expires_at:'2026-10-26T15:00:00Z'}),row('DISABLED',{status:'expired'}),row('BADDATE',{expires_at:'never'}),row('STALE',{expires_at:null,checked_at:'2026-10-01T00:00:00Z'}),row('RECENTUNKNOWN',{expires_at:null})];
 const normalized=normalizeCouponRows(rows,now);assert.deepEqual(normalized.map(c=>c.code),['OCTSW2026O7J','RECENTUNKNOWN']);
 assert.deepEqual(visibleCoupons(normalized,Date.parse('2026-11-01T00:00:00Z')),[]);
});
test('missing/unavailable/empty Supabase tables use the public API and do not write shared rows from the browser',async()=>{
 for(const client of [null,database([],null),database(null,{code:'PGRST205'}),{from(){throw Error('offline');}}]){
  const result=await fetchActiveCoupons({client,now,fetcher:api});assert.equal(result.source,'community');assert.deepEqual(result.coupons.map(c=>c.code),['OCTSW2026O7J']);assert.equal(result.coupons[0].rewards[0].type,'wind');
 }
});
test('stale cloud entries refresh from the community without losing valid manually curated coupons',async()=>{
 const client=database([row('MANUAL',{checked_at:'2026-10-25T00:00:00Z'}),row('REVOKED',{source:'community',checked_at:'2026-10-25T00:00:00Z'})]);
 const history={...publicHistory,REVOKED:{status:'expired'}};
 const result=await fetchActiveCoupons({client,now,fetcher:async()=>({ok:true,text:async()=>JSON.stringify(history)})});
 assert.equal(result.source,'mixed');assert.deepEqual(result.coupons.map(c=>c.code),['OCTSW2026O7J','MANUAL']);
});
test('network failures preserve only valid cloud/snapshot coupons, never expired records; cancellation stops fallback',async()=>{
 const offline=async()=>{throw Error('offline');},client=database([row('MANUAL',{checked_at:'2026-10-25T00:00:00Z'})]);
 const result=await fetchActiveCoupons({client,fetcher:offline,now});assert.equal(result.stale,true);assert.equal(result.source,'supabase');
 assert.equal((await fetchActiveCoupons({fetcher:offline,now,localSnapshot:publicHistory})).source,'snapshot');
 await assert.rejects(fetchActiveCoupons({fetcher:offline,now,localSnapshot:{}}),/consultar/);
 const controller=new AbortController();controller.abort();let called=false;await assert.rejects(fetchActiveCoupons({signal:controller.signal,fetcher:async()=>{called=true;}}),{name:'AbortError'});assert.equal(called,false);
});
test('clipboard receives the exact code once; unavailable/denied clipboard does not report success and feedback lasts two seconds',async()=>{
 const copied=[];await copyCouponCode('OCTSW2026O7J',{clipboard:{writeText:async code=>copied.push(code)}});assert.deepEqual(copied,['OCTSW2026O7J']);assert.equal(COUPON_COPY_DURATION,2000);
 await assert.rejects(copyCouponCode('OCTSW2026O7J',{clipboard:null}));await assert.rejects(copyCouponCode('OCTSW2026O7J',{clipboard:{writeText:async()=>{throw Error('Denied');}}}),/Denied/);await assert.rejects(copyCouponCode('<script>',{clipboard:{writeText:async()=>assert.fail()}}));
 assert.equal(couponRedeemUrl('OCTSW2026O7J'),'https://event.withhive.com/ci/smon/evt_coupon');assert.equal(couponRedeemUrl('../unsafe'),'https://event.withhive.com/ci/smon/evt_coupon');
});
test('actual reward component renders official local images with labels and quantities; unknown rewards remain absent',async()=>{
 const bundled=await build({entryPoints:[new URL('../src/components/CouponReward.jsx',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic'});
 const {default:Reward}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
 for(const [type,asset] of Object.entries(REWARD_ASSETS)){
  const html=renderToStaticMarkup(React.createElement(Reward,{reward:{type,amount:300000}}));
  assert.ok(html.includes(`src="${asset.src}"`));assert.ok(html.includes(`alt="${asset.label}"`));assert.match(html,/300\.000/);
  const bytes=await readFile(new URL(`../public${asset.src}`,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');
 }
 assert.equal(renderToStaticMarkup(React.createElement(Reward,{reward:{type:'unknown',amount:1}})),'');
});
test('PostgreSQL allows public reads of live coupons while excluding expired rows and rejecting all anonymous/member writes',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;');
  await db.exec(await readFile(new URL('../supabase/migrations/202610260001_public_game_coupons.sql',import.meta.url),'utf8'));
  await db.exec("insert into public.coupons(code,expires_at,status) values('VALID',now()+interval '1 day','active'),('EXPIRED',now()-interval '1 second','active'),('INACTIVE',now()+interval '1 day','expired');insert into public.coupons(code,checked_at) values('UNKNOWN',now()),('OLDUNKNOWN',now()-interval '73 hours');");
  for(const role of ['anon','authenticated']){
   await db.exec(`begin;set local role ${role};`);assert.deepEqual((await db.query('select code from public.coupons order by code')).rows.map(r=>r.code),['UNKNOWN','VALID']);await db.exec('rollback');
   for(const sql of ["insert into public.coupons(code) values('INJECT')","update public.coupons set rewards='[]' where code='VALID'","delete from public.coupons where code='VALID'"]){await db.exec(`begin;set local role ${role};`);await assert.rejects(db.exec(sql),/permission denied/);await db.exec('rollback');}
  }
 }finally{await db.close();}
});
