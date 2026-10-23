import test from 'node:test';
import assert from 'node:assert/strict';
import {quickTeam,quickConfig,autoTuneQuickTeam,quickPreview} from '../src/core/quick-calculator.js';
import {createInfographic,infographicFileName} from '../src/core/export-infographic.js';
import {accountStamp} from '../src/core/loadouts.js';

function team(area='siege'){
 const t=quickTeam(area);t.name='Guia de teste';t.configs=t.configs.map((_,i)=>quickConfig(i?13413:18913,i?'Lushen':'Tiana'));
 t.configs[0].manual.sheet.spd=300;return autoTuneQuickTeam(t);
}
test('infographic exports the current sheet and combat calculation rather than minimum goals',()=>{
 const t=team();t.configs[0].manual.sheet.hp=40000;t.configs[0].goals.hp=90000;t.configs[0].combat={artifactSpd:20};t.leader={stat:'def',value:44,scope:'arena'};t.leaderKey=t.configs[0].key;
 const before=structuredClone(t),data=createInfographic(t),first=data.monsters[0],hp=first.stats.find(s=>s.key==='hp');
 assert.equal(hp.total,40000);assert.equal(hp.base+hp.bonus,40000);assert.notEqual(hp.total,t.configs[0].goals.hp);
 assert.equal(first.combatSpd,quickPreview(t).actors[0].spd);assert.equal(first.artifactSpd,20);
 assert.equal(first.runeSpd,300-t.configs[0].manual.base.spd);assert.equal(first.activeLeader,true);assert.deepEqual(first.leader,t.leader);
 assert.ok(first.skills.length>=3);assert.ok(first.skills.every(s=>s.icon&&s.name));assert.deepEqual(t,before);
});
test('manual plans keep unknown equipment empty and sets labelled as desired',()=>{
 const t=team();t.configs[0].sets=[3,15];const m=createInfographic(t).monsters[0];
 assert.deepEqual(m.runes,[null,null,null,null,null,null]);assert.deepEqual(m.artifacts,[null,null]);
 assert.equal(m.desiredSets,true);assert.deepEqual(m.sets.map(s=>s.name),['Swift','Will']);assert.equal(m.planning,true);assert.equal(m.level,40);assert.equal(m.stars,6);
});
test('SWEX snapshots resolve saved rune loadouts, exact slot order and preset artifacts',()=>{
 const t=team(),c=t.configs[0];c.unitId=91;t.sourceAccountId='account-test';t.sourceDeckId='saved-preset';
 const account={id:'account-test',importedAt:'test',units:[{id:91,master:18913,level:35,stars:5,runeIds:[1,2,3,4,5,6],artifactIds:[11],skillLevels:[{slot:1,level:4}]}],
  runes:Array.from({length:12},(_,i)=>({id:i+1,slot:i%6+1,set:i<6?3:13,level:i<6?12:15,stars:6})),
  artifacts:[{id:11,level:9,main:[101,50]},{id:12,level:15,main:[100,1500]}],accountPresets:[{id:'saved-preset',equipment:[{unitId:91,artifactIds:[12]}]}]};
 t.plannedRunes={accountStamp:accountStamp(account),byConfig:{[c.key]:[12,11,10,9,8,7]}};
 const m=createInfographic(t,account).monsters[0];
 assert.deepEqual(m.runes.map(r=>r.slot),[1,2,3,4,5,6]);assert.ok(m.runes.every(r=>r.set===13&&r.level===15));
 assert.deepEqual(m.artifacts,[{level:15,stat:'HP',value:1500},null]);assert.equal(m.level,35);assert.equal(m.stars,5);assert.equal(m.skills[0].level,4);assert.equal(m.planning,false);assert.equal(m.desiredSets,false);
 assert.ok(!JSON.stringify(m).includes('account-test'));assert.ok(!Object.hasOwn(m,'unitId'));assert.ok(!Object.hasOwn(m.runes[0],'id'));
 account.id='different-account';assert.ok(createInfographic(t,account).monsters[0].runes.every(r=>r===null));
});
test('unknown IDs and skill metadata export safely without borrowing equipment from a different monster',()=>{
 const t=team();t.configs[1].masterId=99991;t.configs[1].unitId=8;
 const account={units:[{id:8,master:18913,runeIds:[1]}],runes:[{id:1,slot:1,set:3}],artifacts:[]};
 const m=createInfographic(t,account).monsters[1];assert.equal(m.skills.length,0);assert.equal(m.leader,null);assert.equal(m.activeLeader,false);assert.ok(m.runes.every(r=>!r));
});
test('all calculator areas retain native slot counts, their own background and integer turns',()=>{
 for(const [area,count,bg] of [['siege',3,'siege-castle'],['arena',4,'arena-coliseum'],['cairos',5,'pve-dragon']]){
  const t=team(area);t.destination='dbah';const data=createInfographic(t);assert.equal(data.monsters.length,count);assert.ok(data.background.includes(bg));assert.equal(data.title,area==='siege'?'SIEGE':area.toUpperCase());assert.ok(data.turns.every(t=>Number.isInteger(t.tick)));
 }
 assert.equal(infographicFileName(123),'sw_infographic_123.png');
});
test('incomplete, invalid or unsafe teams never receive an invented safe guide',()=>{
 const t=team();t.enemyCombatSpd=999;const data=createInfographic(t);assert.equal(data.safe,false);assert.equal(data.orderLabel,'Ordem não validada');
 t.configs[1].masterId=null;assert.throws(()=>createInfographic(t),/Selecione/);
 const invalid=team();invalid.configs[0].manual.sheet.spd='bad';assert.throws(()=>createInfographic(invalid),/inválido/);
});

test('catalog/guild cards retain unknown actual stats and keep goals separately labelled',()=>{
 const t=team();delete t.configs[0].manual;delete t.configs[1].manual;delete t.configs[2].manual;t.mode='defense';t.configs[1].goals.hp=35000;t.exportContext={title:'Counter / guild template'};
 t.configs.push({...quickConfig(),enabled:false});const data=createInfographic(t);
 assert.equal(data.monsters.length,3);assert.equal(data.subtitle,'DEFENSE GUIDE');assert.equal(data.context,'Counter / guild template');assert.equal(data.turns.length,0);assert.equal(data.safe,false);
 const m=data.monsters[1];assert.equal(m.statsKnown,false);assert.equal(m.combatSpd,null);assert.ok(m.stats.every(s=>s.total===null&&s.bonus===null));assert.ok(m.stats[0].base>0);assert.equal(m.goals.find(g=>g.key==='hp').value,35000);
});
test('account guides use selected optimizer builds and artifact flags instead of equipped stats/goals',()=>{
 const t=team(),unit={id:91,master:18913,level:40,stars:6,base:{...t.configs[0].manual.base},runeIds:[1,2,3,4,5,6],artifactIds:[20]};
 t.configs=t.configs.slice(0,1).map(c=>({...c,unitId:91,manual:undefined}));t.configs[0].goals.hp=90000;
 const account={id:'a',units:[unit],runes:Array.from({length:12},(_,i)=>({id:i+1,slot:i%6+1,set:i<6?3:13,main:[1,100],innate:[],subs:[],level:15,stars:6})),artifacts:[{id:20,main:[100,1500],level:15,subs:[]}]};
 const build={key:t.configs[0].key,unitId:91,teamId:t.id,runeIds:[7,8,9,10,11,12],artifactIds:[],stats:{total:{...unit.base,hp:22222,spd:250},combat:{...unit.base,spd:280}}};
 const data=createInfographic(t,account,{builds:[build],options:{artifacts:false}}),m=data.monsters[0];
 assert.equal(m.selectedBuild,true);assert.equal(m.stats[0].total,22222);assert.equal(m.combatSpd,280);assert.ok(m.runes.every(r=>r.set===13));assert.ok(m.artifacts.every(a=>!a));assert.equal(data.turns[0].name,'Tiana');
 const equipped=createInfographic(t,account);assert.equal(equipped.monsters[0].selectedBuild,false);assert.ok(equipped.monsters[0].runes.every(r=>r.set===3));assert.notEqual(equipped.monsters[0].stats[0].total,22222);
});
test('Rift, dimensional, ToA and RTA exports keep all members and area art',()=>{
 for(const [area,count,image] of [['rift',6,'pve-rift'],['dimensional',4,'pve-dimensional'],['toa',5,'pve-toa'],['rta',4,'arena-coliseum']]){
  const t=team();t.gameMode=area;t.configs=Array.from({length:count},()=>({...quickConfig(13413,'Lushen'),manual:undefined}));
  const data=createInfographic(t);assert.equal(data.monsters.length,count);assert.ok(data.background.includes(image));assert.equal(data.turns.length,0);
 }
});
