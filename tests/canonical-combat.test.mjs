import test from 'node:test';
import assert from 'node:assert/strict';
import {blankConfig,DEFAULT_OPTIONS} from '../src/core/data.js';
import {monsterRecord} from '../src/core/monsterDatabase.js';
import {canonicalMonsterId} from '../src/core/CollabMapping.js';
import {quickSkillOptions} from '../src/core/quick-skill-effects.js';
import {quickPreview} from '../src/core/quick-calculator.js';
import {balanceTiming,searchTeamBalance} from '../src/core/team-balance.js';
import {equippedTeamBuilds,optimize,teamTurnPreview} from '../src/core/optimizer.js';

function fixture(adriana=26811,rigna=29711){
 const runes=[];
 const units=[adriana,18311,rigna].map((master,i)=>{
  const record=monsterRecord([26811,18311,29711][i]),id=i+1,runeIds=[];
  for(let slot=1;slot<=6;slot++){
   const runeId=i*6+slot;
   runeIds.push(runeId);
   runes.push({id:runeId,slot,set:1,owner:id,main:slot===2?[8,[162,80,68][i]]:[1,100],innate:[],subs:[],level:15,stars:6});
  }
  return {...record,id,master,element:1,runeIds,artifactIds:[]};
 });
 const account={units,runes,artifacts:[]};
 const configs=units.map((unit,i)=>({...blankConfig(unit),key:'AMR'[i],enabled:true,sets:[],firstTurnSkillSlot:i===0?3:2,lockSpeedSync:true}));
 const team={id:'audit',name:'Siege',gameMode:'siege',speedMode:'snapshot',configs,leaderKey:'M',leader:monsterRecord(18311).leader,towerSpd:15,guildSpd:0,enemyCombatSpd:230,autoOpener:true,optimizerSpeedSync:true};
 return {account,team};
}
const options={...DEFAULT_OPTIONS,equipped:false,minLevel:0,depth:'fast'};
const timeline=preview=>preview.turns.map(turn=>[turn.enemy?'enemy':turn.key,turn.tick,turn.spd,turn.atb]);

test('Siege preview, balance and optimizer agree on the tick-7 rotation and share 18 exclusive runes',()=>{
 for(const [adriana,rigna] of [[26811,29711],[26311,29311]]){
  const {account,team}=fixture(adriana,rigna),before=structuredClone({account,team});
  const builds=equippedTeamBuilds(account,team,options);
  const preview=teamTurnPreview(account,team,options,builds);
  const balance=searchTeamBalance(account,team,options).baseline.timing.preview;
  const manual={...team,configs:team.configs.map((config,i)=>({...config,manual:{base:account.units[i].base,sheet:builds[i].stats.total}}))};
  assert.deepEqual(timeline(preview),timeline(balance));
  assert.deepEqual(timeline(preview),timeline(quickPreview(manual)));
  assert.deepEqual(preview.turns.map(t=>[t.enemy?'enemy':t.key,t.tick]),[['A',5],['M',7],['R',8],['enemy',9]]);
  assert.equal(preview.cut,false);
  assert.equal(balance.cut,false);
  assert.equal(quickPreview(manual).cut,false);
  assert.ok(preview.scenario.risks.some(risk=>risk.includes('Mihyang')));
  assert.deepEqual(preview.scenario.risks,balance.scenario.risks);
  const result=optimize(account,[team],options);
  assert.equal(result.status,'met');
  assert.equal(new Set(result.builds.flatMap(build=>build.runeIds)).size,18);
  assert.ok(result.builds.every(build=>build.runeIds.length===6));
  assert.deepEqual(timeline(teamTurnPreview(account,team,options,result.builds)),timeline(preview));
  assert.deepEqual({account,team},before);
 }
});

test('Adriana applies SPD only on S3 and an enabled explicit first-turn buff overrides automation',()=>{
 const {account,team}=fixture();
 const explicit={afterKey:'ally:0',type:'speed_buff',targets:['ally:0','ally:1','ally:2']};
 team.combatScenario={events:[explicit,{...explicit,occurrence:2}]};
 let preview=teamTurnPreview(account,team,options);
 assert.equal(preview.scenario.log.filter(e=>e.type==='speed_buff'&&e.tick===5).length,1);
 assert.ok(!preview.scenario.log.some(e=>e.type==='boost'));
 team.combatScenario={events:[{...explicit,enabled:false}]};
 assert.equal(teamTurnPreview(account,team,options).scenario.log.filter(e=>e.type==='speed_buff').length,1);
 team.configs[0].firstTurnSkillSlot=1;
 preview=teamTurnPreview(account,team,options);
 assert.equal(preview.scenario.log.filter(e=>e.type==='speed_buff').length,0);
 assert.equal(preview.cut,true);
 assert.equal(preview.turns.find(t=>t.enemy).tick,7);
 assert.equal(optimize(account,[team],options).status,'conflict');
});

test('Ciri and Rigna share skill metadata while preserving exact forms',()=>{
 assert.equal(canonicalMonsterId(29311),29711);
 assert.equal(canonicalMonsterId(29701),29701);
 assert.notEqual(canonicalMonsterId(29312),29711);
 assert.equal(monsterRecord(29311).master,29311);
 assert.equal(monsterRecord(29311).base.spd,106);
 assert.deepEqual(quickSkillOptions(29311),quickSkillOptions(29711));
 assert.deepEqual(quickSkillOptions(29711).map(s=>[s.slot,s.isPassive]),[[1,false],[2,false],[3,true]]);
});

test('calculator handoff retains explicit enemies, leader, tick policy and game placement',async()=>{
 const {quickOptimizerPlan}=await import('../src/core/quick-optimizer-plan.js');
 const {prepareOptimizerTeam}=await import('../src/core/optimizer-context.js');
 const {account,team}=fixture();
 team.towerSpd=10;
 team.guildSpd=5;
 team.useRtaTickRate=true;
 team.gamePlacement=['A','R','M'];
 delete team.enemyCombatSpd;
 team.enemyDefense=[{masterId:15713,label:'Defesa',combatSpd:230}];
 const builds=equippedTeamBuilds(account,team,options),manual={...team,configs:team.configs.map((config,i)=>({...config,manual:{base:account.units[i].base,sheet:builds[i].stats.total}}))};
 const prepared=prepareOptimizerTeam(quickOptimizerPlan(manual,account));
 assert.equal(prepared.leaderKey,'M');
 assert.equal(prepared.towerSpd,10);
 assert.equal(prepared.guildSpd,5);
 assert.equal(prepared.useRtaTickRate,true);
 assert.deepEqual(prepared.gamePlacement,team.gamePlacement);
 const preview=teamTurnPreview(account,prepared,options);
 assert.deepEqual(timeline(preview),timeline(quickPreview(manual)));
 assert.deepEqual(timeline(preview),timeline(balanceTiming(prepared,equippedTeamBuilds(account,prepared,options)).preview));
 assert.equal(preview.turns.find(t=>t.key==='A').tick,23);
});

test('automatic S3 SPD expires after each recipient takes two turns',async()=>{
 const {scenarioForTeam,simulateCombat}=await import('../src/core/speedTuner.js');
 const {team}=fixture();
 const actors=[{key:'A',master:26811,rawSpd:300,spd:300},{key:'M',master:18311,rawSpd:225,spd:225}];
 const configured=scenarioForTeam(team,actors);
 const report=simulateCombat(configured.actors,{events:configured.events,maxTurns:8});
 const speeds=key=>report.turns.filter(t=>t.key===key).map(t=>t.spd).slice(0,4);
 assert.deepEqual(speeds('A'),[300,390,390,300]);
 assert.deepEqual(speeds('M'),[293,293,225]);
});

test('equal SPD respects game placement when validating an optimizer allocation',()=>{
 const {account,team}=fixture();
 const third=account.runes.find(rune=>rune.id===14);
 third.main=[8,73];
 team.gamePlacement=['A','R','M'];
 const preview=teamTurnPreview(account,team,options);
 assert.deepEqual(preview.turns.filter(t=>!t.enemy).map(t=>t.key),['A','R','M']);
 assert.equal(optimize(account,[team],options).status,'conflict');
 team.gamePlacement=['A','M','R'];
 const valid=optimize(account,[team],options);
 assert.equal(valid.status,'met');
 assert.deepEqual(timeline(teamTurnPreview(account,team,options,valid.builds)),timeline(balanceTiming(team,valid.builds).preview));
});

test('an explicit resolved Mihyang ATB event is replayed once and the unsupported strip remains conditional',()=>{
 const {account,team}=fixture();
 team.combatScenario={events:[{afterKey:'ally:1',type:'boost',targets:['ally:0','ally:1','ally:2'],amount:15}]};
 const builds=equippedTeamBuilds(account,team,options);
 const preview=teamTurnPreview(account,team,options,builds),balance=balanceTiming(team,builds).preview;
 assert.deepEqual(preview.scenario.log,balance.scenario.log);
 assert.deepEqual(preview.scenario.log.map(e=>[e.source,e.type,e.amount]),[['A','speed_buff',0],['M','boost',15]]);
 assert.equal(optimize(account,[team],options).status,'met');
 assert.ok(preview.scenario.risks.some(risk=>risk.includes('remoções e resistência')));
});
