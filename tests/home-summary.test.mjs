import test from 'node:test';
import assert from 'node:assert/strict';
import {homeSummary} from '../src/core/home-summary.js';
test('Home snapshot identifies the real loaded inventory and import instant',()=>{
 const account={id:'7654321',name:'Invocador',guild:'Guilda',importedAt:'2026-11-18T10:20:00Z',units:[{},{}],runes:[{}],artifacts:[]};
 assert.deepEqual(homeSummary(account),{id:'7654321',name:'Invocador',guild:'Guilda',importedAt:'2026-11-18T10:20:00.000Z',units:2,runes:1,artifacts:0,isDemo:false});
});
test('Home does not invent snapshot data for a guest or an unknown import date',()=>{
 assert.equal(homeSummary(null),null);
 assert.deepEqual(homeSummary({name:'Conta',importedAt:'invalid'}),{id:null,name:'Conta',guild:null,importedAt:null,units:0,runes:0,artifacts:0,isDemo:false});
 assert.equal(homeSummary({importedAt:null,isDemo:true}).importedAt,null);
 assert.equal(homeSummary({isDemo:true}).isDemo,true);
 assert.equal(homeSummary({importedAt:0}).importedAt,null);
});
