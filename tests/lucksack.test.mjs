import test from 'node:test';import assert from 'node:assert/strict';
import {estimateRealDamage} from '../src/core/damage.js';
import {calculateDamage,applySkillProfile} from '../src/utils/damageCalculator.js';
import {normalizeCrafts,simulateRuneCraft,craftCeiling} from '../src/core/rune-crafts.js';
import {scanAccount,applyScanSuggestion,runeEfficiency} from '../src/core/accountDiagnostic.js';
import {blankConfig} from '../src/core/data.js';
import {appendProgression,progressionSnapshot,progressionForAccount,normalizeProgression} from '../src/core/progression.js';
const base={hp:10000,atk:1000,def:500,spd:100,cr:100,cd:100,acc:50,res:15},unit={id:1,master:13413,name:'Lushen',element:3,base,runeIds:[1,2,3,4,5,6],artifactIds:[]};
function rune(id,slot,subs=[[8,3,0,0],[2,8,0,0],[4,8,0,0],[12,8,0,0]]){return {id,slot,subs,set:13,stars:6,level:15,ancient:false,owner:1,main:[1,100],innate:[]};}
test('damage modifiers use effective DEF, Brand, glancing and per-hit artifact additions',()=>{
 const stats={total:base},settings={enabled:true,multiplier:4,hits:3,enemyDef:1000,variance:1,critMode:'critical'},effects={totals:{additionalSpd:100,additionalHp:1},unknown:[]};
 const normal=estimateRealDamage(unit,stats,settings,effects),armor=estimateRealDamage(unit,stats,{...settings,armorBreak:true},effects),marked=estimateRealDamage(unit,stats,{...settings,brand:true},effects),glance=estimateRealDamage(unit,stats,{...settings,glancing:true},effects);
 assert.equal(armor.effectiveEnemyDef,300);assert.ok(armor.total>normal.total);assert.equal(normal.additionalDamage,600);assert.equal(marked.additionalDamage,750);assert.equal(marked.skillDamage,Math.floor(4000*2*1000/4640*1.25)*3);assert.equal(glance.critChance,0);assert.ok(glance.total<normal.total);
 const resisted=estimateRealDamage(unit,stats,{...settings,enemyRes:100},effects),minimum=estimateRealDamage(unit,stats,{...settings,enemyRes:0},effects);assert.equal(resisted.total,minimum.total);assert.equal(resisted.debuffChance,50);assert.equal(minimum.debuffChance,85);
});
test('validated skill profiles do not invent coefficients for unsupported monsters',()=>{
 const profile=applySkillProfile({skillUps:50},13413,3);assert.equal(profile.hits,3);assert.equal(profile.multiplier,.68);assert.equal(profile.ignoreDefense,true);assert.equal(profile.skillUps,30);
 assert.equal(calculateDamage({unit,stats:{total:base},settings:{skill:3},profile:true}).hits,3);assert.throws(()=>applySkillProfile({},99999,1),/sem multiplicador/);assert.throws(()=>calculateDamage({unit:{...unit,master:13911},stats:{total:base},settings:{skill:3,selfHp:99},profile:true}),/HP cheio/);
});
test('SWEX craft parsing preserves only recognized item metadata and quantities',()=>{
 const parsed=normalizeCrafts([{craft_item_id:1,craft_type:2,craft_type_id:130805,quantity:2,session_key:'secret'},{craft_item_id:2,craft_type:6,craft_type_id:130805,quantity:1},{craft_item_id:3,craft_type:99,craft_type_id:130805}]);assert.equal(parsed.length,2);assert.deepEqual(parsed[0],{id:1,kind:'grind',set:13,stat:8,grade:5,ancient:false,quantity:2});assert.equal(parsed[1].ancient,true);assert.equal(craftCeiling('grind',8,true),6);assert.equal(craftCeiling('gem',2,true),15);assert.equal(craftCeiling('gem',1,true),null);
});
test('craft simulation enforces stock, ancient compatibility, one gem slot and no mutation',()=>{
 const r=rune(1,2),original=JSON.stringify(r),grind={id:1,set:13,kind:'grind',stat:8,grade:5,ancient:false,quantity:1};
 const applied=simulateRuneCraft(r,grind,{index:0});assert.equal(applied.rune.subs[0][3],5);assert.equal(JSON.stringify(r),original);assert.throws(()=>simulateRuneCraft(r,grind,{index:0,used:applied.used}),/estoque/);assert.throws(()=>simulateRuneCraft({...r,ancient:true},grind,{index:0}),/incompatível/);
 const ancient=simulateRuneCraft({...r,ancient:true},{...grind,ancient:true},{index:0});assert.equal(ancient.rune.subs[0][3],6);
 const gem={...grind,id:2,kind:'gem',stat:10,quantity:2},swapped=simulateRuneCraft(r,gem,{index:3});assert.equal(swapped.rune.subs[3][2],1);assert.throws(()=>simulateRuneCraft(swapped.rune,{...gem,stat:11},{index:2}),/Somente um slot/);assert.throws(()=>simulateRuneCraft({...r,level:9},gem,{index:3}),/revelados/);assert.throws(()=>simulateRuneCraft({...r,slot:1},{...gem,stat:6},{index:3}),/não permitido/);
});
test('hidden-rune scan protects locks/reservations/sets and validates safe local application',()=>{
 const equipped=Array.from({length:6},(_,i)=>({...rune(i+1,i+1),set:i<4?13:15})),treasure={...rune(10,2,[[8,18,0,0],[2,8,0,0],[4,8,0,0],[12,8,0,0]]),owner:0},account={id:'A',importedAt:'2026-10-22',units:[unit],runes:[...equipped,treasure,{...treasure,id:11,locked:true},{...treasure,id:12,owner:99}],artifacts:[]};
 const config={...blankConfig(unit),basis:'total',goals:{spd:140},sets:[13]},team={id:'t',name:'Siege',gameMode:'siege',configs:[config]},scan=scanAccount(account,[team]);assert.deepEqual(scan.treasures.map(r=>r.id),[10]);assert.equal(scan.suggestions.length,1);assert.equal(scan.suggestions[0].gains[0].gain,15);
 const next=applyScanSuggestion(account,[team],{},[],scan.suggestions[0]);assert.equal(next.plannedRunes.byConfig[config.key][1],10);assert.equal(account.runes[1].id,2);assert.equal(scanAccount(account,[next]).suggestions.length,0);assert.equal(scanAccount(account,[team],{},[10]).treasures.length,0);assert.throws(()=>applyScanSuggestion(account,[team],{},[10],scan.suggestions[0]),/desatualizada/);assert.ok(runeEfficiency(treasure)>0);
 const bad={...account,runes:[...equipped,{...treasure,set:15}]};assert.equal(scanAccount(bad,[team]).suggestions.length,0);
});
test('weekly progression replaces same-week snapshots and isolates account history',()=>{
 const account={id:'a',units:[unit],runes:[rune(1,1)],artifacts:[]},one=progressionSnapshot(account,'2026-10-12T10:00:00Z'),two={...one,capturedAt:'2026-10-15T10:00:00Z',meanEfficiency:90},three={...two,capturedAt:'2026-10-19T10:00:00Z',meanEfficiency:95};let rows=appendProgression([],one);rows=appendProgression(rows,two);assert.equal(rows.length,1);rows=appendProgression(rows,three);rows=appendProgression(rows,{...three,accountId:'b'});assert.equal(progressionForAccount(rows,'a').length,2);assert.equal(progressionForAccount(rows,'b').length,1);assert.equal(Object.hasOwn(normalizeProgression({...three,session_key:'secret'}),'session_key'),false);assert.throws(()=>normalizeProgression({...three,runes:-1}),/inválido/);
});
test('cloud progression contracts scope user/account and whitelist weekly metrics',async()=>{
 const {saveProgressionCloud,loadProgressionCloud}=await import('../src/lib/account-cloud.js'),calls=[],snapshot={accountId:'a',capturedAt:'2026-10-22T12:00:00Z',units:1,runes:6,artifacts:0,meanEfficiency:85,fastRunes:1};
 const client={from(table){calls.push(['from',table]);return {upsert:async(row,options)=>{calls.push(['upsert',row,options]);return {error:null};},select(columns){calls.push(['select',columns]);return this;},eq(key,value){calls.push(['eq',key,value]);return this;},order(key,options){calls.push(['order',key,options]);return this;},async limit(n){calls.push(['limit',n]);return {data:[{payload:{...snapshot,session_key:'secret'}}],error:null};}};}};
 await saveProgressionCloud(client,'owner',{...snapshot,session_key:'secret'});const saved=calls.find(c=>c[0]==='upsert');assert.equal(saved[1].user_id,'owner');assert.equal(saved[1].week,'2026-10-19');assert.equal(Object.hasOwn(saved[1].payload,'session_key'),false);assert.equal(saved[2].onConflict,'user_id,account_id,week');const loaded=await loadProgressionCloud(client,'owner','a');assert.deepEqual(loaded,[normalizeProgression(snapshot)]);assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='user_id'&&c[2]==='owner'));assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='account_id'&&c[2]==='a'));await assert.rejects(saveProgressionCloud(null,null,snapshot),/Entre/);
});
test('normalized private backups retain craft quantities without arbitrary SWEX fields',async()=>{
 const {normalizeAccount}=await import('../src/core/data.js'),{accountSnapshot}=await import('../src/core/account-snapshot.js');const raw={wizard_info:{wizard_id:1},runes:[],unit_list:[{unit_id:1,unit_master_id:13413,con:700,atk:1000,def:500,spd:100,runes:[{rune_id:1,slot_no:2,set_id:13,class:6,upgrade_curr:15,pri_eff:[8,42],sec_eff:[[2,8,0,0]]}]}],rune_craft_item_list:[{craft_item_id:1,craft_type:2,craft_type_id:130805,quantity:2,session_key:'secret'}]};const snapshot=accountSnapshot(normalizeAccount(raw));assert.equal(snapshot.crafts[0].quantity,2);assert.doesNotMatch(JSON.stringify(snapshot),/secret|session_key/);
});
