import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateRealDamage} from '../src/core/damage.js';
import {blankConfig} from '../src/core/data.js';
import {monsterRecord} from '../src/core/monsterDatabase.js';
import {siegeRotationDamage} from '../src/core/siege-damage.js';
import {resolvedDamageSkill} from '../src/core/quick-skill-effects.js';

const unit={element:1,base:{atk:1000}};
const stats={total:{hp:10000,atk:1000,def:1000,spd:200,cr:50,cd:50}};
const hit=(settings={},totals={},combat)=>estimateRealDamage(unit,{...stats,combat},{variance:1,...settings},{totals});

test('documented skillup and defense terms reproduce the 360 and 1488 reference hits',()=>{
 assert.equal(hit({skillUps:20,critMode:'critical'}).total,360);
 assert.equal(hit({skillUps:20,critMode:'critical',ignoreDefense:true}).total,1488);
 assert.equal(hit({skillUps:20,critMode:'normal',enemyDef:1000}).total,254);
 assert.equal(hit({skillUps:20,enemyDef:1000}).total,307);
 assert.equal(hit({ignoreDefensePercent:50,armorBreak:true}).effectiveEnemyDef,150);
});

test('damage potency truncates and already resolved combat SPD is consumed once',()=>{
 const result=hit({attackBuff:true,defenseBuff:true,speedBuff:true,selfHp:50},{atkBuff:11,defBuff:11,spdBuff:24,spdLostHp:20},{spd:300,rawSpd:200});
 assert.equal(result.combat.atk,1550);
 assert.equal(result.combat.def,1770);
 assert.equal(result.combat.spd,300);
 assert.equal(hit({speedBuff:true},{spdBuff:24}).combat.spd,274);
});

test('element and co-op add within the damage bonus and additional remains outside defense and variance',()=>{
 const result=hit({attackKind:'coop',enemyElement:1,enemyDef:0,critMode:'normal',variance:1.028},{damageWater:20,coopDamage:20,additionalAtk:10});
 assert.equal(result.skillDamage,1260);
 assert.equal(result.additionalDamage,100);
});



function fixture(adriana=26811,rigna=29711){
 const runes=[];
 const units=[adriana,18311,rigna].map((master,i)=>{
  const unit=monsterRecord(master),id=i+1,runeIds=[];
  for(let slot=1;slot<=6;slot++){
   const runeId=i*6+slot;runeIds.push(runeId);
   runes.push({id:runeId,slot,set:1,owner:id,main:slot===2?[8,[162,80,73][i]]:[1,100],innate:[],subs:[],level:15,stars:6});
  }
  return {...unit,id,element:1,runeIds,artifactIds:[],skillLevels:[{slot:i===0?3:2,level:i===0?2:5}]};
 });
 const account={units,runes,artifacts:[]};
 const configs=units.map((unit,i)=>({...blankConfig(unit),key:'AMR'[i],enabled:true,sets:[],firstTurnSkillSlot:i===0?3:2}));
 const team={id:'damage',gameMode:'siege',configs,leaderKey:'M',leader:monsterRecord(18311).leader,towerSpd:15,guildSpd:0,
  combatScenario:{enemies:[{master:18311,spd:230}]},gamePlacement:['A','M','R']};
 const target={key:'enemy:0',def:1000,element:1,defenseBuff:true};
 return {account,team,target};
}

test('same snapshot compares both simulated Siege orders and explicit strip branches without changing gear',()=>{
 const {account,team,target}=fixture(),before=structuredClone({account,team,target});
 const branch={rignaIgnorePercent:50,mihyangStrips:1,defenseBuffRemovedAfterHit:1};
 const mihyangFirst=siegeRotationDamage(account,team,target,branch);
 const rignaFirst=siegeRotationDamage(account,{...team,gamePlacement:['A','R','M']},target,branch);
 assert.deepEqual(mihyangFirst.actions.map(a=>a.key),['A','M','R']);
 assert.deepEqual(rignaFirst.actions.map(a=>a.key),['A','R','M']);
 assert.deepEqual(mihyangFirst.actions.map(a=>a.hits.length),[0,3,1]);
 assert.deepEqual(mihyangFirst.actions.map(a=>a.level),[2,5,5]);
 assert.equal(mihyangFirst.actions[2].hits[0].enemyDef,1000);
 assert.equal(rignaFirst.actions[1].hits[0].enemyDef,1700);
 assert.equal(mihyangFirst.total,7380);
 assert.equal(rignaFirst.total,6245);
 assert.equal(mihyangFirst.preview.scenario.log.filter(e=>e.type==='attack_buff').length,1);
 assert.equal(mihyangFirst.preview.scenario.log.filter(e=>e.type==='speed_buff').length,1);
 assert.deepEqual(mihyangFirst.preview.scenario.log.filter(e=>e.type==='boost').map(e=>e.amount),[15]);
 assert.equal(mihyangFirst.actions[2].attackBuff,true);
 assert.equal(mihyangFirst.conditional,true);
 const manual=structuredClone(team);manual.configs[2].damage={attackBuff:true};
 assert.equal(siegeRotationDamage(account,manual,target,branch).total,mihyangFirst.total);
 for(const gamePlacement of [['A','M','R'],['A','R','M']]){
  assert.equal(siegeRotationDamage(account,{...team,gamePlacement},target,{rignaIgnorePercent:50,mihyangStrips:0}).total,5309);
 }
 const unverified=siegeRotationDamage(account,team,target,{mihyangStrips:0});
 assert.equal(unverified.total,null);
 assert.deepEqual(unverified.range,[4191,12375]);
 assert.ok(unverified.range[1]>unverified.range[0]);
 assert.ok(!unverified.preview.scenario.log.some(e=>e.type==='boost'));
 assert.deepEqual({account,team,target},before);
});

test('Ciri shares Rigna damage and skillups, while equal speed, Oblivion and glancing block the intrinsic critical',()=>{
 const original=fixture(),collab=fixture(26311,29311),branch={rignaIgnorePercent:50,mihyangStrips:0};
 assert.equal(siegeRotationDamage(original.account,original.team,original.target,branch).total,siegeRotationDamage(collab.account,collab.team,collab.target,branch).total);
 const {account,team,target}=original;
 const attack=(targetOverride={})=>siegeRotationDamage(account,team,{...target,...targetOverride},branch).actions.find(a=>a.key==='R');
 assert.deepEqual(attack().hits[0].critChance,[100,100]);
 assert.deepEqual(attack({glancing:true}).hits[0].critChance,[0,0]);
 const weakened=structuredClone(team);weakened.configs[2].combat={oblivion:true};
 assert.deepEqual(siegeRotationDamage(account,weakened,target,branch).actions.find(a=>a.key==='R').hits[0].critChance,[15,15]);
 team.combatScenario.enemies[0].spd=293;
 assert.equal(attack().speedGap,0);
 assert.deepEqual(attack().hits[0].critChance,[15,15]);
 assert.equal(resolvedDamageSkill({masterId:29311,firstTurnSkillSlot:1,firstTurnSkillLevel:4}).skillUps,10);
 assert.equal(resolvedDamageSkill({masterId:29311,firstTurnSkillSlot:1,firstTurnSkillLevel:7}).skillUps,25);
 assert.equal(resolvedDamageSkill({masterId:18301,firstTurnSkillSlot:2}),null);
});

test('first-attack critical damage affects only the first hit and late reduction covers the additional bucket',()=>{
 const critical=hit({hits:2,firstAttack:true,critMode:'critical',enemyDef:0},{firstAttackCrit:20});
 assert.equal(critical.skillDamage,1488+1313);
 const reduced=hit({critMode:'normal',enemyDef:0,brand:true,enemyDamageReduction:20},{additionalAtk:10});
 assert.equal(reduced.total,1024);
 assert.equal(reduced.additionalDamage,105);
});

test('a faster defending Ciri suppresses ordinary critical and conflicting intrinsic critical is conditional',()=>{
 const {account,team,target}=fixture();
 team.combatScenario.enemies[0]={master:29311,spd:310};
 const result=siegeRotationDamage(account,team,target,{rignaIgnorePercent:0,mihyangStrips:0});
 const action=key=>result.actions.find(action=>action.key===key);
 assert.deepEqual(action('R').hits[0].critChance,[0,0]);
 assert.deepEqual(action('M').hits[0].critChance,[0,100]);
 assert.equal(result.total,null);
});
