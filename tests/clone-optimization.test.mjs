import test from 'node:test';import assert from 'node:assert/strict';
import {makeTeam,blankConfig,DEFAULT_OPTIONS,restoreTeam} from '../src/core/data.js';
import {copySiegeToPersonal} from '../src/core/siege-central.js';
import {prepareCloneSearch,optimizeClone} from '../src/core/clone-optimizer.js';
import {targetDistance,targetIssue,targetSetReport,rebindTargetGoals} from '../src/core/target-goals.js';
import {equippedBuild,teamTurnPreview} from '../src/core/optimizer.js';
const options={...DEFAULT_OPTIONS,depth:'fast',minLevel:0};
function fixture(speeds=[130,120,110],targets=speeds){
 const base={hp:10000,atk:800,def:600,spd:100,cr:15,cd:50,res:15,acc:0};
 const account={id:'own',importedAt:'now',towers:{glorySpd:0,guildSpd:0},artifacts:[],runes:[],units:[13413,13911,19614].map((master,i)=>({id:i+1,master,name:['Lushen','Julie','Iris'][i],level:40,element:master%10,base:{...base},artifactIds:[],runeIds:Array.from({length:6},(_,s)=>i*6+s+1)}))};
 for(const [i,u] of account.units.entries())for(let slot=1;slot<=6;slot++)account.runes.push({id:i*6+slot,slot,owner:u.id,set:slot<=4?13:15,stars:6,level:15,main:slot===2?[8,speeds[i]-100]:[1,100],innate:[],subs:[]});
 const source={...makeTeam('siege'),name:'Ataque da guilda',mode:'attack',autoOpener:false,configs:account.units.map((u,i)=>({...blankConfig(),masterId:u.master,label:u.name,basis:'total',sets:[13,15],goals:{hp:10500,atk:800,def:600,spd:targets[i],cr:15,cd:50,res:15,acc:0}}))};
 return {account,source,team:copySiegeToPersonal({name:source.name,team:source},account).team};
}
test('attack cloning snapshots original goals and sets independently and never overwrites SWEX base stats',()=>{
 const {account,source,team}=fixture(),inventory=structuredClone(account);assert.equal(team.target_goals.version,1);assert.deepEqual(team.target_goals.configs.map(c=>c.goals.spd),[130,120,110]);assert.deepEqual(team.target_goals.configs.map(c=>c.sets),[[13,15],[13,15],[13,15]]);
 source.configs[0].goals.spd=999;source.configs[0].sets[0]=3;team.configs[0].goals.spd=200;assert.equal(team.target_goals.configs[0].goals.spd,130);assert.deepEqual(team.target_goals.configs[0].sets,[13,15]);
 const restored=restoreTeam(JSON.parse(JSON.stringify(team)));assert.deepEqual(restored.target_goals,team.target_goals);assert.equal(equippedBuild(account,team,team.configs[0]).stats.total.spd,130);assert.deepEqual(account,inventory);
 const defense=copySiegeToPersonal({name:'Defesa',team:{...source,mode:'defense'}},account).team;assert.equal(defense.target_goals,undefined);
});
test('target preparation restores source timing/order, validates copies, and does not change mutable editor goals',()=>{
 const {account,team}=fixture();team.configs.reverse();team.configs[0].goals.spd=999;const before=structuredClone(team),prepared=prepareCloneSearch(team,account);
 assert.deepEqual(prepared.configs.map(c=>c.masterId),[13413,13911,19614]);assert.equal(prepared.configs[2].goals.spd,110);assert.ok(prepared.configs.every(c=>c.lockSpeedSync&&c.matchTarget));assert.deepEqual(team,before);
 team.configs[0].masterId=99999;assert.match(targetIssue(team,account),/composição mudou/i);assert.throws(()=>prepareCloneSearch(team,account),/composição mudou/i);
});
test('distance measures normalized closeness on both sides of targets and respects bonus/total stat bases',()=>{
 const stats={bonus:{hp:100},total:{hp:10100}},goal={goals:{hp:200},basis:'bonus',sets:[]};assert.equal(targetDistance(stats,goal),.5);assert.equal(targetDistance({bonus:{hp:300},total:{hp:10300}},goal),.5);
 assert.ok(targetDistance(stats,{...goal,basis:'total',goals:{hp:10200}})<.01);assert.equal(targetSetReport({17:2},[17,17])[0].missing,2);
});
test('joint matching finds the exact target without rune reuse and returns integer ticks while leaving the inventory intact',()=>{
 const {account,team}=fixture(),before=structuredClone(account),result=optimizeClone(account,team,options);
 assert.equal(result.status,'met');assert.equal(result.builds.length,3);assert.equal(new Set(result.builds.flatMap(b=>b.runeIds)).size,18);assert.equal(result.cloneMatching.distance,0);assert.equal(result.cloneMatching.orderValid,true);assert.deepEqual(result.builds.map(b=>b.stats.total.spd),[130,120,110]);assert.ok(result.cloneMatching.turns.every(t=>Number.isInteger(t.tick)));assert.deepEqual(account,before);
});
test('turn order eliminates a numerically perfect inverted build; the closest feasible order is suggested instead',()=>{
 const {account,team}=fixture([130,120,110],[110,120,130]),result=optimizeClone(account,team,options);
 assert.equal(result.status,'approximate');assert.equal(result.cloneMatching.orderValid,true);assert.deepEqual(result.builds.map(b=>b.stats.total.spd),[130,120,110]);assert.ok(Math.abs(result.cloneMatching.distance-(20/110+20/130))<1e-9);
});
test('locked or tick-impossible teams never produce an unsafe best-effort fallback',()=>{
 const {account,team}=fixture([110,120,130]);let result=optimizeClone(account,team,{...options,localLocks:{unitIds:[1,2,3]}});assert.equal(result.builds.length,0);assert.equal(result.cloneMatching.orderValid,false);
 const valid=fixture();valid.team.target_goals.configs[2].maxTick=1;result=optimizeClone(valid.account,valid.team,{...options,localLocks:{unitIds:[1,2,3]}});assert.equal(result.builds.length,0);
});
test('unreachable sets stay visible as target deficits; matching never invents max grinds or rejects all approximations for strict numeric goals',()=>{
 const {account,team}=fixture();for(const c of team.target_goals.configs){c.sets=[3,15];c.goals.hp=50000;}
 const result=optimizeClone(account,team,{...options,strictMode:true,maxGrindsGems:true});assert.equal(result.status,'approximate');assert.equal(result.builds.length,3);assert.equal(result.options.maxGrindsGems,false);assert.equal(result.options.strictMode,false);assert.ok(result.builds.every(b=>b.targetSets.some(s=>s.id===3&&!s.met)));assert.ok(result.builds.every(b=>b.upgrades.length===0));
});
test('reservations and restricted inventory remain hard constraints for clone matching',()=>{
 const {account,team}=fixture();let result=optimizeClone(account,team,options,()=>{},[1]);assert.equal(result.builds.length,0);
 const filtered={...account,runes:account.runes.filter(r=>r.id!==1)};result=optimizeClone(filtered,team,options);assert.equal(result.builds.length,0);
});

test('copied opener events and artifact SPD remain part of the hard tick check',()=>{
 const {account,source}=fixture([140,120,110]);account.units[0].master=18913;account.units[0].name='Tiana';source.configs[0].masterId=18913;source.configs[0].label='Tiana';source.autoOpener=true;source.configs[0].combat={artifactSpd:7};source.configs[0].maxTick=10;
 const team=copySiegeToPersonal({name:source.name,team:source},account).team,locked={...options,localLocks:{unitIds:[1,2,3]}},result=optimizeClone(account,team,locked);
 assert.equal(result.status,'met');assert.equal(result.builds[0].stats.combat.spd,147);assert.equal(result.cloneMatching.turns[0].tick,10);
 const preview=teamTurnPreview(account,prepareCloneSearch(team,account),locked,result.builds);assert.equal(preview.scenario.log.filter(e=>e.type==='tiana').length,1);
 team.target_goals.configs[0].combat.artifactSpd=0;assert.equal(optimizeClone(account,team,locked).builds.length,0);
});

test('exported plan targets rebind to fresh config keys without accepting foreign metadata',()=>{
 const {account,team}=fixture();team.target_goals.secret='not-allowed';const configs=team.configs.map(c=>({...c,key:crypto.randomUUID()}));
 const restored={...team,configs,target_goals:rebindTargetGoals(team.target_goals,team.configs,configs)};assert.deepEqual(restored.target_goals.configs.map(c=>c.key),configs.map(c=>c.key));assert.deepEqual(restored.target_goals.configs.map(c=>c.goals.spd),[130,120,110]);assert.equal(restored.target_goals.secret,undefined);assert.equal(targetIssue(restored,account),'');
 configs[0].masterId=99999;assert.throws(()=>rebindTargetGoals(team.target_goals,team.configs,configs),/não correspondem/);
});
