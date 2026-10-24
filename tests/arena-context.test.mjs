import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAccount,makeTeam,blankConfig} from '../src/core/data.js';
import {arenaContextOf,isArenaContext,arenaMatchups,arenaCloudRows} from '../src/core/arena-context.js';
import {presetsForArea,teamsForArea} from '../src/core/deckManager.js';
import {syncAccountTeams,teamFromGameDeck,reconcileStoredPresets} from '../src/core/account-teams.js';
import {cleanAccountPayload,restoreAccountPayload} from '../src/core/clean-account-payload.js';
import {accountSnapshot} from '../src/core/account-snapshot.js';
import {portableTeam,copyTeamToOptimizer,cleanMatchup,cleanCloudPayload} from '../src/core/hub.js';
const raw=()=>({wizard_id:123,runes:[],unit_list:[1,2,3,4].map((id)=>({unit_id:id,unit_master_id:13413,unit_level:40,class:6,attribute:3,con:700,atk:800,def:600,spd:100,runes:[{rune_id:id,slot_no:2,set_id:3,class:6,upgrade_curr:15,pri_eff:[8,42],sec_eff:[]}]})),defense_deck_info:{deck_id:1,unit_id_list:[1,null,3,4]},server_arena_defense_deck_info:{deck_id:1,unit_id_list:[1,2,null,4]},world_arena_deck_list:[{unit_id_list:[4,3,2,1]}],deck_list:[{deck_id:2,deck_type:1,unit_id_list:[1,2,3,4]},{deck_id:3,game_mode:'arena',arena_context:'interserver',unit_id_list:[1,2,3,4]}]});
const team=context=>({...makeTeam('arena'),arenaContext:context,name:`Time ${context}`,configs:Array.from({length:4},()=>({...blankConfig(),masterId:13413,label:'Lushen'}))});
const counter=(context,outcome)=>cleanMatchup({offense:team(context),name:`Counter ${context}`,outcome,enemyDefense:Array.from({length:4},()=>({masterId:13413,label:'Lushen'}))});
test('one SWEX import separates native Regular, Interserver and RTA defenses and preserves null slots',()=>{
 const account=normalizeAccount(JSON.parse(JSON.stringify(raw()))),presets=account.accountPresets;
 assert.equal(presetsForArea(presets,'arena').length,2);assert.equal(presetsForArea(presets,'arena',null,'interserver').length,2);
 assert.equal(presets.filter(p=>p.gameMode==='rta').length,1);
 const regular=presets.find(p=>p.sourceKey==='defense_deck_info'),inter=presets.find(p=>p.sourceKey==='server_arena_defense_deck_info');
 assert.equal(regular.arenaContext,'regular');assert.equal(inter.arenaContext,'interserver');assert.equal(inter.mode,'defense');
 assert.deepEqual(regular.unitIds,[1,null,3,4]);assert.deepEqual(inter.unitIds,[1,2,null,4]);assert.notEqual(regular.id,inter.id);
 const teams=syncAccountTeams(account);assert.equal(teamsForArea(teams,'arena',null,'regular').length,2);assert.equal(teamsForArea(teams,'arena',null,'interserver').length,2);
 assert.throws(()=>teamFromGameDeck(inter,account,teams.find(t=>t.sourceDeckId===regular.id)),/outro contexto/);
});
test('inherited tags and flat rows with equal deck IDs stay separate; unknown context never leaks',()=>{
 const r=raw();r.defense_deck_list=[{deck_id:77,game_mode:'arena',arena_context:'regular',unit_id:1,pos_id:1},{deck_id:77,game_mode:'arena',arena_context:'interserver',unit_id:2,pos_id:1}];r.saved={is_interserver:1,defense_deck_info:{unit_id_list:[1,2,3,4]}};r.deck_list.push({game_mode:'arena',arenaContext:'future-mode',unit_id_list:[1,2,3,4]});
 const a=normalizeAccount(r),flat=a.accountPresets.filter(p=>p.sourceKey==='defense_deck_list');assert.equal(flat.length,2);assert.notEqual(flat[0].arenaContext,flat[1].arenaContext);
 assert.ok(a.accountPresets.some(p=>p.id.includes('saved/')&&p.arenaContext==='interserver'));
 assert.equal(syncAccountTeams(a).some(t=>t.arenaContext==='unknown'),false);
 assert.equal(isArenaContext({gameMode:'arena',arenaContext:'future-mode'},'regular'),false);
});
test('both backup formats and legacy cache reconciliation retain Arena context',()=>{
 const a=normalizeAccount(raw());
 for(const restored of [restoreAccountPayload(cleanAccountPayload(a),'owner'),accountSnapshot(a)]){
  assert.equal(presetsForArea(restored.accountPresets,'arena',null,'regular').length,2);
  assert.equal(presetsForArea(restored.accountPresets,'arena',null,'interserver').length,2);
 }
 const teams=syncAccountTeams(a),old=teams.map(({arenaContext,...t})=>({...t,configs:t.configs.map(c=>({...c,goals:{...c.goals,hp:45678}}))}));
 const result=reconcileStoredPresets(a,old).teams;assert.equal(result.length,teams.length);assert.ok(result.find(t=>t.sourceDeckId.includes('server_arena')).arenaContext==='interserver');assert.equal(result[0].configs[0].goals.hp,45678);
 assert.equal(arenaContextOf({gameMode:'arena'}),'regular');assert.equal(arenaContextOf({sourceKey:'server_arena_defense_deck_info',arenaContext:'regular'}),'interserver');
});
test('counters, outcomes and guild suggestions with the same roster cannot cross contexts',()=>{
 const regular=counter('regular','win'),inter=counter('interserver','loss');
 assert.deepEqual(arenaMatchups([regular,inter],'regular').map(c=>c.outcome),['win']);assert.deepEqual(arenaMatchups([regular,inter],'interserver').map(c=>c.outcome),['loss']);
 const rows=[{id:'regular',kind:'counter',payload:regular},{id:'inter',kind:'counter',payload:inter},{id:'suggestion',kind:'template',payload:{version:1,team:portableTeam(team('interserver'))}}];
 assert.deepEqual(arenaCloudRows(rows,'regular').map(r=>r.id),['regular']);assert.deepEqual(arenaCloudRows(rows,'interserver').map(r=>r.id),['inter','suggestion']);
 assert.equal(cleanCloudPayload('counter',inter).arenaContext,'interserver');assert.equal(copyTeamToOptimizer(inter.offense,null).arenaContext,'interserver');
 assert.throws(()=>cleanMatchup({...inter,arenaContext:'regular'}),/mesmo contexto/);assert.throws(()=>portableTeam(team('future-mode')),/inválido/);
 assert.equal(arenaMatchups([{...regular,enemyDefense:regular.enemyDefense.slice(0,3)}],'regular').length,0);
 assert.deepEqual(arenaCloudRows([], 'interserver'),[]);assert.deepEqual(teamsForArea([], 'arena',null,'interserver'),[]);
});

test('legacy guild counters with no trustworthy context are quarantined instead of classified as Regular',()=>{
 const legacy=counter('regular','win');delete legacy.arenaContext;delete legacy.offense.arenaContext;
 assert.equal(arenaMatchups([legacy],'regular').length,0);assert.deepEqual(arenaCloudRows([{kind:'plan',payload:{team:legacy.offense}}],'regular'),[]);
 const local=cleanMatchup(legacy);assert.equal(local.arenaContext,'unknown');assert.equal(arenaMatchups([local],'regular').length,0);
 assert.throws(()=>cleanCloudPayload('counter',legacy),/contexto/);assert.throws(()=>cleanCloudPayload('counter',local),/contexto/);
});
