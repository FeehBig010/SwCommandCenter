import test from 'node:test';
import assert from 'node:assert/strict';
test('actual import worker reports friendly corrupted JSON and preserves null SWEX equipment on success',async()=>{
 const previous=globalThis.self,messages=[];globalThis.self={postMessage:value=>messages.push(value)};
 try{
  await import('../src/core/import-account.worker.js');
  await self.onmessage({data:new File(['{bad'], 'corrupt.json')});assert.equal(messages.at(-1).type,'error');assert.match(messages.at(-1).message,/não é um JSON válido/);
  const raw={unit_list:[{unit_id:1,unit_master_id:18913,con:700,spd:100,runes:[null,{rune_id:1,slot_no:2,set_id:3,pri_eff:[8,42]}],artifacts:[null]}],runes:[],deck_list:[{dungeon_name:'DBAH',monster_ids:[1,{},null]}]};
  messages.length=0;await self.onmessage({data:new File([JSON.stringify(raw)],'valid.json')});const result=messages.at(-1);assert.equal(result.type,'account');assert.equal(result.account.units.length,1);assert.deepEqual(result.account.artifacts,[]);assert.deepEqual(result.account.accountPresets[0].unitIds,[1,null,null,null,null]);
  const progress=messages.filter(m=>m.type==='progress').map(m=>m.percent);assert.ok(progress.length>2);assert.deepEqual(progress,progress.slice().sort((a,b)=>a-b));
 }finally{globalThis.self=previous;}
});
