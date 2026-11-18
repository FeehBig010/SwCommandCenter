import test from 'node:test';
import assert from 'node:assert/strict';
const journal=await import('../src/core/siege-battle-journal.js').catch(()=>({}));
const record={key:'local:counter',name:'Meu ataque',personalTeamId:'preset',team:{leaderIndex:0,configs:[1,2,3].map(i=>({masterId:10000+i,label:`Ataque ${i}`,unitId:99,runeIds:[1]}))},counter:{enemyDefense:[1,2,3].map(i=>({masterId:11000+i,label:`Defesa ${i}`})),siege:{defenseLeaderIndex:1}}};
test('journal API supports explicit local battles independently of legacy feedback',()=>{
 assert.equal(typeof journal.cleanSiegeBattle,'function');
 const result=journal.cleanSiegeBattle({record,outcome:'win',notes:' Boa luta ',id:'battle-1',foughtAt:'2026-01-01T12:00:00Z'});
 assert.equal(result.outcome,'win');assert.equal(result.notes,'Boa luta');assert.equal(result.counterKey,record.key);assert.equal(result.defenseLeaderIndex,1);
 assert.deepEqual(result.offense,[1,2,3].map(i=>({masterId:10000+i,label:`Ataque ${i}`})));assert.equal(JSON.stringify(result).includes('runeIds'),false);
 assert.throws(()=>journal.cleanSiegeBattle({record,outcome:'free_win'}));
 assert.throws(()=>journal.cleanSiegeBattle({record,outcome:'win',notes:'x'.repeat(1001)}));
 assert.throws(()=>journal.cleanSiegeBattle({record,outcome:'win',foughtAt:'invalid'}));
 assert.throws(()=>journal.cleanSiegeBattle({record,outcome:'win',foughtAt:'2999-01-01'}));
 assert.throws(()=>journal.cleanSiegeBattle({record:{...record,team:{configs:[]}},outcome:'win'}));
});
test('journal namespace isolates account owners and statistics never ingest feedback',()=>{
 assert.equal(typeof journal.siegeBattleJournalKey,'function');
 assert.notEqual(journal.siegeBattleJournalKey('account-A'),journal.siegeBattleJournalKey('account-B'));
 assert.match(journal.siegeBattleJournalKey('account-A'),/^siege-battle-journal:v1:/);
 assert.throws(()=>journal.siegeBattleJournalKey(null));
 assert.deepEqual(journal.siegeBattleStats([journal.cleanSiegeBattle({record,outcome:'win'}),journal.cleanSiegeBattle({record,outcome:'loss'}),{reaction:'free_win'},{outcome:'unrecorded'}]),{wins:1,losses:1,total:2,winRate:50});
 assert.deepEqual(journal.siegeBattleStats([]),{wins:0,losses:0,total:0,winRate:null});
});
test('editing a composition never attributes old matches to a new defense or offense',()=>{
 assert.equal(typeof journal.siegeBattlesForRecord,'function');
 const battle=journal.cleanSiegeBattle({record,outcome:'win'});
 assert.equal(journal.siegeBattlesForRecord([battle],record).length,1);
 const changed=structuredClone(record);changed.counter.enemyDefense[0].masterId=12000;
 assert.equal(journal.siegeBattlesForRecord([battle],changed).length,0);
 const changedOffense=structuredClone(record);changedOffense.team.configs[0].masterId=12000;
 assert.equal(journal.siegeBattlesForRecord([battle],changedOffense).length,0);
 assert.equal(battle.defense[0].masterId,11001);
});

test('legacy feedback outcomes cannot contribute to journal statistics',()=>{
 assert.deepEqual(journal.siegeBattleStats([{outcome:'win',reaction:'free_win'}]),{wins:0,losses:0,total:0,winRate:null});
});
test('malformed stored rows are ignored by views and statistics without crashing or counting fake wins',()=>{const valid=journal.cleanSiegeBattle({record,outcome:'loss'}),rows=[null,{version:1,outcome:'win',counterKey:record.key,defense:{},offense:[]},valid];assert.deepEqual(journal.siegeBattlesForRecord(rows,record),[valid]);assert.equal(journal.siegeBattleStats(rows).total,1);});
test('draft identity changes with the composition but not with unrelated notes',()=>{assert.equal(typeof journal.siegeBattleContextKey,'function');const changed=structuredClone(record);changed.team.configs[0].masterId=13000;assert.notEqual(journal.siegeBattleContextKey(record),journal.siegeBattleContextKey(changed));assert.equal(journal.siegeBattleContextKey(record),journal.siegeBattleContextKey({...record,description:'Outra observação'}));});
test('old composition matches remain readable as history without affecting current-composition statistics',()=>{assert.equal(typeof journal.siegeBattleHistoryForRecord,'function');const battle=journal.cleanSiegeBattle({record,outcome:'win'}),changed=structuredClone(record);changed.team.configs[0].masterId=13000;assert.equal(journal.siegeBattlesForRecord([battle],changed).length,0);assert.deepEqual(journal.siegeBattleHistoryForRecord([null,battle],changed),[battle]);assert.equal(journal.siegeBattleHistoryForRecord([battle],{...changed,key:'another-counter'}).length,0);});
