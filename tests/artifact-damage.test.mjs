import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAccount,blankConfig,DEFAULT_OPTIONS} from '../src/core/data.js';
import {artifactEffects,normalizeArtifactSubstats,estimateRealDamage,optimize,equippedDamagePreview} from '../src/core/optimizer.js';
import {normalizeDamageSettings} from '../src/core/damage.js';
const unit={id:1,master:13413,name:'Lushen',element:3,base:{hp:20000,atk:1000,def:1000,spd:200,cr:100,cd:100,res:15,acc:0},runeIds:[1,2,3,4,5,6],artifactIds:[10,11]};
const stats={total:{...unit.base},combat:{spd:200}};
const effects=totals=>({totals,unknown:[],artifactIds:[10]});
const scenario=extra=>({...normalizeDamageSettings(),enabled:true,...extra});
test('SWEX artifact parsing supports sec_eff, named/numeric artifact_substats and drops private/invalid fields',()=>{
 const subs=normalizeArtifactSubstats({sec_eff:[[218,.3],[221,100],[999,5]],artifact_substats:{219:999},session_key:'secret'});
 assert.deepEqual(subs,[{id:218,key:'additionalHp',value:.3},{id:221,key:'additionalSpd',value:100},{id:999,key:null,value:5}]);
 assert.deepEqual(normalizeArtifactSubstats({artifact_substats:{critS2:20,'305':10}}).map(e=>e.key).sort(),['critS2','reductionFire']);
 assert.equal(normalizeArtifactSubstats({sec_eff:[[219,NaN],[221,-1],[0,5],['password','secret']]}).length,0);
 const raw={unit_list:[{unit_id:1,unit_master_id:13413,con:100,artifacts:[{rid:10,pri_effect:[101,100],sec_eff:[[219,10]],session:'secret'}]}],runes:[{rune_id:1,slot_no:1,pri_eff:[3,100]}],artifacts:[{rid:10,sec_eff:[[219,99]]},{rid:11,occupied_id:1,pri_effect:[100,1500],artifact_substats:{218:1}}]};
 const a=normalizeAccount(raw);assert.equal(a.artifacts.length,2);assert.equal(a.artifacts.find(e=>e.id===10).subs[0].value,10);assert.ok(!JSON.stringify(a).includes('secret'));
});
test('artifact aggregation sums equipped secondary values exactly once and retains unknown effect IDs',()=>{
 const a={artifacts:[{id:10,subs:[{id:219,key:'additionalAtk',value:10},{id:999,key:null,value:5}]},{id:11,sec_eff:[[219,20],[400,15]]},{id:12,sec_eff:[[219,1000]]}]};
 const e=artifactEffects(a,{...unit,artifactIds:[10,10,11]});assert.equal(e.totals.additionalAtk,30);assert.equal(e.totals.critS1,15);assert.deepEqual(e.unknown,[{id:999,value:5}]);assert.deepEqual(artifactEffects(a,unit,false),{totals:{},unknown:[],artifactIds:[]});
});
test('additional HP/ATK/DEF/SPD damage applies per hit without crit, skill multipliers or enemy DEF',()=>{
 const e=effects({additionalHp:1,additionalAtk:10,additionalDef:20,additionalSpd:100});
 const d=estimateRealDamage(unit,stats,scenario({multiplier:0,hits:3,enemyDef:99999,critMode:'critical'}),e);
 assert.equal(d.skillDamage,0);assert.equal(d.additionalDamage,2100);assert.equal(d.total,2100);
 const other=estimateRealDamage(unit,stats,scenario({multiplier:100,hits:3,enemyDef:0,critMode:'normal'}),e);assert.equal(other.additionalDamage,2100);
});
test('skill-specific CD and enemy HP condition are conditional, not permanent sheet CD',()=>{
 const e=effects({critS1:40,critS2:20,critEnemyHighHp:30,critEnemyLowHp:10,critLostHp:20});
 const d=estimateRealDamage(unit,stats,scenario({skill:2,selfHp:50,enemyHp:100}),e);assert.equal(d.effectiveCritDamage,160);
 const low=estimateRealDamage(unit,stats,scenario({skill:2,selfHp:50,enemyHp:0}),e);assert.equal(low.effectiveCritDamage,140);assert.ok(low.total<d.total);assert.equal(stats.total.cd,100);
 const noCrit=estimateRealDamage(unit,stats,scenario({critMode:'normal'}),e),plain=estimateRealDamage(unit,stats,scenario({critMode:'normal'}));assert.equal(noCrit.skillDamage,plain.skillDamage);
});
test('lost HP stats and buff effects affect combat coefficients without mutating base or sheet stats',()=>{
 const before=structuredClone(stats),e=effects({atkLostHp:20,defLostHp:10,spdLostHp:10,atkBuff:20,atkDefBuff:10,spdBuff:50});
 const d=estimateRealDamage(unit,stats,scenario({selfHp:50,attackBuff:true,defenseBuff:true,speedBuff:true}),e);
 assert.ok(Math.abs(d.combat.atk-1815)<1e-8);assert.ok(Math.abs(d.combat.def-1858.5)<1e-8);assert.ok(Math.abs(d.combat.spd-304.5)<1e-8);assert.deepEqual(stats,before);
});
test('elemental damage reduction, critical damage reduction and per-skill recovery remain distinct',()=>{
 const e=effects({reductionFire:20,receivedCritReduction:10,healS2:25,critS2:20});
 const d=estimateRealDamage(unit,stats,scenario({enemyElement:2,incomingDamage:10000,incomingCritical:true,healing:1000,skill:2}),e);
 assert.equal(d.defense.received,7200);assert.equal(d.healing.total,1250);assert.equal(d.critChance,0);
 const normal=estimateRealDamage(unit,stats,scenario({enemyElement:1,incomingDamage:10000,skill:1,healing:1000}),e);assert.equal(normal.defense.received,10000);assert.equal(normal.healing.total,1000);
});
test('damage scenario validation refuses nonfinite/negative coefficients and invalid hit counts',()=>{
 for(const extra of [{hits:0},{hits:1.5},{multiplier:NaN},{enemyHp:101},{selfHp:-1}])assert.throws(()=>normalizeDamageSettings(extra),/inválido/);
 assert.throws(()=>estimateRealDamage(unit,{total:{...unit.base,atk:NaN}},scenario()),/inválidos/);
});
test('optimizer results and equipped card preview agree, honor artifact toggle and keep enemy units out of allocation',()=>{
 const a={units:[unit],runes:unit.runeIds.map((id,i)=>({id,slot:i+1,set:1,level:15,owner:1,main:[0,0],innate:[0,0],subs:[]})),artifacts:[{id:10,main:[101,100],subs:[{id:219,key:'additionalAtk',value:10}]}]};
 const c={...blankConfig(unit),sets:[],objective:'damage',damage:scenario({hits:3,multiplier:1})},team={id:'t',name:'Ofensa',mode:'attack',configs:[c],enemyDefense:[{masterId:19614,label:'Molly'}]},options={...DEFAULT_OPTIONS,depth:'fast'};
 const result=optimize(a,[team],options);assert.equal(result.builds.length,1);assert.equal(result.builds[0].role,'offense');assert.deepEqual(result.builds[0].enemyDefense,team.enemyDefense);assert.equal(result.builds[0].damage.total,equippedDamagePreview(a,c,team,options).total);assert.ok(result.builds[0].damage.additionalDamage>0);
 c.artifacts=false;const off=optimize(a,[team],options).builds[0];assert.equal(off.damage.additionalDamage,0);assert.ok(off.damage.total<result.builds[0].damage.total);assert.deepEqual(off.artifactIds,[]);
});

test('Cairos wave clear includes equipped artifact additional damage and honors excluded artifact IDs',async()=>{
 const {cairosWaveReport,CAIROS_PROFILES}=await import('../src/core/cairos.js');
 const a={units:[unit],artifacts:[{id:10,main:[101,100],subs:[{id:219,key:'additionalAtk',value:20}]}]};
 const build={key:'wave',unitId:unit.id,stats,artifactIds:[10]};
 const withArtifacts=cairosWaveReport(a,[build],'wave',CAIROS_PROFILES[0],{});
 assert.ok(withArtifacts.waves[0].enemies.every(e=>e.additionalDamage===600));
 const noArtifacts=cairosWaveReport(a,[{...build,artifactIds:[]}],'wave',CAIROS_PROFILES[0],{});
 assert.ok(noArtifacts.waves[0].enemies.every(e=>e.additionalDamage===0));
 assert.ok(withArtifacts.waves[0].enemies[0].damage>noArtifacts.waves[0].enemies[0].damage);
});
