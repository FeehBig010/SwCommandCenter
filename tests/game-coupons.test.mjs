import test from 'node:test';
import assert from 'node:assert/strict';
import {activeCoupons,couponRewards,fetchCouponHistory,COUPON_MAX_AGE,COUPON_REDEEM_URL} from '../src/core/game-coupons.js';
const now=Date.parse('2026-10-26T15:00:00Z');
const entry=(code,extra={})=>({code,status:'active',last_seen:'2026-10-26T12:00:00Z',sources:['SWGT','SWQuery'],reward:'Wind Scroll ×3 | 11 minutes ago | Active',missing_runs:0,...extra});
test('current verified coupons are shown; expired, missing, stale, unsupported and unsafe records are excluded',()=>{
 const history={a:entry('OCTSW2026O7J'),b:entry('SEPSW2026I8B'),c:entry('EXPIRED',{status:'expired'}),d:entry('MISSING',{missing_runs:1}),e:entry('STALE',{last_seen:new Date(now-COUPON_MAX_AGE-1).toISOString()}),f:entry('UNVERIFIED',{sources:['Unknown']}),g:entry('<script>'),h:entry('FUTURE',{last_seen:'2027-01-01T00:00:00Z'}),i:entry('VALIDTILLTODAY',{expires_at:'2026-10-26T14:59:00Z'})};
 const before=structuredClone(history),result=activeCoupons(history,now);
 assert.deepEqual(result.map(c=>c.code),['OCTSW2026O7J']);assert.deepEqual(result[0].rewards,[{type:'wind',label:'Pergaminhos de Vento',amount:3}]);assert.deepEqual(history,before);
});
test('monthly filtering follows the displayed Brazilian month at UTC midnight',()=>{
 const at=Date.parse('2026-11-01T01:00:00Z'),history={a:entry('OCTSW2026O7J',{last_seen:new Date(at).toISOString()}),b:entry('NOVSW2026ABC',{last_seen:new Date(at).toISOString()})};
 assert.deepEqual(activeCoupons(history,at).map(c=>c.code),['OCTSW2026O7J']);
});
test('rewards parse only supported quantities and do not invent mana or scrolls from an unknown description',()=>{
 assert.deepEqual(couponRewards('Mana ×300,000, Scroll Mystical ×2').map(r=>[r.type,r.amount]),[['mystical',2],['mana',300000]]);
 assert.deepEqual(couponRewards('3 Water Scrolls, 100 Energy').map(r=>[r.type,r.amount]),[['water',3],['energy',100]]);
 assert.deepEqual(couponRewards('Reward not supplied'),[]);assert.deepEqual(couponRewards('Mana ×1.5'),[]);
});
test('empty/malformed feeds, duplicate coupons and old snapshots have bounded, honest empty states',()=>{
 assert.deepEqual(activeCoupons(null,now),[]);assert.deepEqual(activeCoupons([],now),[]);assert.deepEqual(activeCoupons({},now),[]);
 const history={a:entry('OCTSW2026O7J'),b:entry('octsw2026o7j')};assert.equal(activeCoupons(history,now).length,1);assert.equal(activeCoupons(history,now+COUPON_MAX_AGE).length,0);
});
test('fetch uses the public JSON without credentials, keeps cancellation and rejects HTTP/malformed/oversized responses',async()=>{
 const signal=new AbortController().signal;let requested;
 const history={a:entry('OCTSW2026O7J')},fetcher=async(url,options)=>{requested={url,options};return {ok:true,text:async()=>JSON.stringify(history)};};
 assert.deepEqual(await fetchCouponHistory({fetcher,signal}),history);assert.equal(requested.options.credentials,'omit');assert.equal(requested.options.signal,signal);assert.equal(new URL(requested.url).hostname,'raw.githubusercontent.com');assert.equal(COUPON_REDEEM_URL,'https://withhive.com/');
 await assert.rejects(fetchCouponHistory({fetcher:async()=>({ok:false})}),/consultar/);
 await assert.rejects(fetchCouponHistory({fetcher:async()=>({ok:true,text:async()=>'<html>'})}));
 await assert.rejects(fetchCouponHistory({fetcher:async()=>({ok:true,text:async()=>'x'.repeat(1000001)})}),/inválida/);
});
