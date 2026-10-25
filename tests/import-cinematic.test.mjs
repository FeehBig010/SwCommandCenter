import test from 'node:test';
import assert from 'node:assert/strict';
import {startSummoning,summoningFrame,SUMMONING_DURATION,SUMMONING_MESSAGES} from '../src/core/import-cinematic.js';
import {requiresLogin} from '../src/core/navigation-access.js';
import {accountSyncController} from '../src/lib/account-sync.js';

function clock(){let time=0,key=0;const jobs=new Map();return {now:()=>time,schedule:(fn,delay)=>{const id=++key;jobs.set(id,{at:time+delay,fn});return id;},unschedule:id=>jobs.delete(id),advance(ms){const until=time+ms;for(;;){const next=[...jobs].filter(([,v])=>v.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;time=next[1].at;jobs.delete(next[0]);next[1].fn();}time=until;},jobs};}
test('summoning lasts exactly 15 seconds, shows each 3-second stage and never reaches 100 early',async()=>{
 const c=clock(),frames=[],sequence=startSummoning({...c,onFrame:frame=>frames.push(frame)});let done=false;sequence.completed.then(()=>{done=true;});
 assert.deepEqual(frames[0],{percent:1,message:SUMMONING_MESSAGES[0]});
 for(let i=1;i<=3;i++){c.advance(3000);assert.equal(frames.at(-1).message,SUMMONING_MESSAGES[i]);assert.equal(done,false);}
 c.advance(5999);await Promise.resolve();assert.equal(done,false);assert.ok(frames.every(f=>f.percent<100));
 c.advance(1);await sequence.completed;assert.equal(done,true);assert.equal(c.now(),SUMMONING_DURATION);assert.equal(frames.at(-1).percent,100);assert.equal(c.jobs.size,0);
 assert.ok(frames.every((f,i)=>i===0||f.percent>=frames[i-1].percent));
});
test('invalid or cancelled imports stop all visual timers and release the completion gate',async()=>{
 const c=clock(),controller=new AbortController(),frames=[],sequence=startSummoning({...c,signal:controller.signal,onFrame:f=>frames.push(f)});c.advance(1000);controller.abort();await assert.rejects(sequence.completed,{name:'AbortError'});const count=frames.length;c.advance(20000);assert.equal(frames.length,count);assert.equal(c.jobs.size,0);
 const cancelled=new AbortController();cancelled.abort();const before=startSummoning({...c,signal:cancelled.signal});await assert.rejects(before.completed,{name:'AbortError'});assert.equal(c.jobs.size,0);
 assert.equal(summoningFrame(-100).percent,1);assert.equal(summoningFrame(999999).percent,100);
});
test('the visual clock never releases navigation before both the full account and animation are ready',async()=>{
 const c=clock(),sequence=startSummoning(c);let finishData;const data=new Promise(resolve=>{finishData=resolve;});let navigated=false;
 const complete=Promise.all([sequence.completed,data]).then(()=>{navigated=true;});c.advance(15000);await Promise.resolve();assert.equal(navigated,false);finishData();await complete;assert.equal(navigated,true);
});
test('guest SWEX accounts can use local areas while guild/admin still require authentication',()=>{
 for(const area of ['siege','arena','cairos','rift','toa','dimensional','rta','inventory','optimizer','saved','workshop']){assert.equal(requiresLogin(area),true);assert.equal(requiresLogin(area,{id:123}),false);}
 assert.equal(requiresLogin('admin',{id:123}),true);assert.equal(requiresLogin('guild',{id:123}),true);assert.equal(requiresLogin('quick'),false);assert.equal(requiresLogin('dashboard'),false);
});
test('explicit portal cloud login saves the selected local inventory instead of restoring an older cloud account',async()=>{
 const local={id:'local',units:[{id:10}]},saved=[],statuses=[];let reads=0;
 const sync=accountSyncController({client:{},onRestore:()=>{throw new Error('must not overwrite local upload');},onStatus:s=>statuses.push(s),load:async()=>{reads++;return {id:'older'};},save:async(_client,user,account)=>saved.push({user,account})});
 await sync.login('member',{account:local});assert.equal(reads,0);assert.deepEqual(saved,[{user:'member',account:local}]);assert.equal(statuses.at(-1),'synced');
 await sync.login(null,{account:local});assert.equal(saved.length,1);
});
