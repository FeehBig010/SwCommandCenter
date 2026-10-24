import test from 'node:test';
import assert from 'node:assert/strict';
import {extractAccountPresets,classifyDeck} from '../src/core/decks.js';
import {blankConfig,DEFAULT_OPTIONS} from '../src/core/data.js';
import {teamFromGameDeck,syncAccountTeams,syncCairosPlans} from '../src/core/account-teams.js';
import {diagnoseTeam} from '../src/core/diagnostics.js';
import {applyDiagnosticPlan,plannedReservations,accountStamp} from '../src/core/loadouts.js';
import {equippedBuild,optimize} from '../src/core/optimizer.js';
import {leaderImpact,minimumSpeedForTick} from '../src/utils/speedTuner.js';
import {arenaContest} from '../src/core/arena.js';
import {effectiveSurvival,cairosChecklist} from '../src/core/cairos-checklist.js';
import {ALL_CAIROS_PROFILES,makeCairosTeam} from '../src/core/cairos.js';
const options={...DEFAULT_OPTIONS,depth:'fast'};
const base={hp:10000,atk:800,def:650,spd:100,cr:15,cd:50,res:15,acc:0};
const rune=(id,slot,owner=0,spd=0,hp=100)=>({id,slot,owner,set:1,stars:6,level:15,main:[1,hp],innate:[],subs:spd?[[8,spd,0,0]]:[],locked:false});
function fixture(count=3){const units=Array.from({length:count},(_,i)=>({id:i+1,master:[18311,16111,28212,13413,13911][i%5],name:['Mihyang','Anavel','Solveig','Lushen','Julie'][i%5],level:40,element:i%5+1,base:{...base,spd:120-i},runeIds:Array.from({length:6},(_,j)=>i*10+j+1),artifactIds:[]}));const account={id:'qa',importedAt:'2026-10-22T12:00:00Z',units,runes:units.flatMap(u=>u.runeIds.map((id,j)=>rune(id,j+1,u.id))),artifacts:[],accountPresets:[]};const team={id:'team',gameMode:'siege',name:'Teste',priority:1,order:'off',configs:units.slice(0,3).map(u=>({...blankConfig(u),sets:[],basis:'total',objective:'spd'}))};return {account,team};}

test('SWEX classification handles all areas, public dungeon IDs and opaque five-unit metadata',()=>{
 for(const [id,dungeon] of [[8001,'gb10'],[9001,'db10'],[6001,'nb10'],[8011,'gbah'],[9011,'dbah'],[6011,'nbah'],[9501,'sf10'],[9502,'pc10']])assert.equal(classifyDeck({dungeon_id:id},'',5).dungeon,dungeon);
 assert.equal(classifyDeck({deck_name:'Dragão DB12'},'',5).dungeon,'dbah');assert.equal(classifyDeck({name:'Dragon squad'},'/arena/0',4).gameMode,'arena');assert.equal(classifyDeck({},'/Siege/0',3).gameMode,'siege');assert.equal(classifyDeck({deck_type:999},'',5).dungeon,null);
 const a=fixture(5).account;assert.equal(extractAccountPresets({dungeon_id:9001,decks:[{monster_ids:[1,2,3,4,5]}]},a.units)[0].dungeon,'db10');assert.equal(extractAccountPresets({9011:[{monster_ids:[1,2,3,4,5]}]},a.units)[0].dungeon,'dbah');const raw={dragons:[{deck_id:1,dungeon_id:9001,monster_ids:[1,999,3,4,5],session_key:'SECRET'}],arena:[{deck_id:2,monster_ids:[1,2,3,4]}]};const decks=extractAccountPresets(raw,a.units);assert.equal(decks[0].unitIds[1],null);assert.deepEqual(decks[0].missingIds,[999]);assert.ok(!JSON.stringify(decks).includes('SECRET'));
 const moved=extractAccountPresets({arena:[{deck_id:0,monster_ids:[2,3,4,5]},raw.arena[0]]},a.units);assert.equal(decks[1].id,moved[1].id);
});
test('auto-import uses exact account copies/equipped mains, correct slot counts, and refreshes existing decks',()=>{
 const {account}=fixture(5);account.accountPresets=extractAccountPresets({arena:[{deck_id:2,monster_ids:[1,2,3,4]}],siege:[{deck_id:3,monster_ids:[1,2,3]}],db12:[{deck_id:4,monster_ids:[1,2,3,4,5]}]},account.units);
 const teams=syncAccountTeams(account);assert.deepEqual(teams.map(t=>t.configs.length),[4,3]);assert.equal(teams[1].configs[0].mains[2],1);assert.equal(teams[1].leader.stat,'spd');assert.match(teams[1].name,/Mihyang - Anavel/);
 const plans=syncCairosPlans(account);assert.equal(plans.dbah.configs.length,5);assert.equal(plans.dbah.configs[4].unitId,5);assert.equal(makeCairosTeam(ALL_CAIROS_PROFILES.find(p=>p.id==='dbah'),account).sourceDeckId,plans.dbah.sourceDeckId);
 teams[0].autoName=false;teams[0].name='Manual';teams[0].configs[0].goals.hp=30000;const updated=syncAccountTeams({...account,importedAt:'next'},[...teams,{id:'custom',configs:[]}],true);assert.equal(updated.length,3);const restored=updated.find(t=>t.gameMode==='arena');assert.equal(restored.name,'Manual');assert.equal(restored.configs[0].goals.hp,30000);assert.equal(restored.sourceImportedAt,'next');assert.equal(syncAccountTeams({...account,accountPresets:[]},teams,false).length,0);const manual={...teams[0],sourceDeckId:null,plannedRunes:{accountStamp:'old',byConfig:{}}};assert.equal(syncAccountTeams(account,[manual],true)[0].plannedRunes,null);assert.equal(syncCairosPlans({...account,accountPresets:[]},{dbah:{...plans.dbah,plannedRunes:{accountStamp:'old',byConfig:{}}}},true).dbah.plannedRunes,null);
});
test('background diagnosis proposes only current-team/loose runes, applies locally and rejects stale plans',()=>{
 const {account,team}=fixture(1);account.runes.push(...Array.from({length:6},(_,j)=>rune(101+j,j+1,0,3)),...Array.from({length:6},(_,j)=>rune(201+j,j+1,999,100)));
 const before=structuredClone(account),report=diagnoseTeam(account,team,options);assert.equal(report.status,'improvement');assert.ok(report.improvement.gains.some(g=>g.stat==='SPD'&&g.gain===18));assert.ok(report.improvement.builds[0].runeIds.every(id=>id<200));
 const applied=applyDiagnosticPlan(account,team,report,options);assert.deepEqual(account,before);assert.equal(equippedBuild(account,applied,applied.configs[0],options).stats.combat.spd,138);assert.equal(diagnoseTeam(account,applied,options).status,'ready');assert.equal(equippedBuild({...account,importedAt:'new'},applied,applied.configs[0],options).stats.combat.spd,120);
 assert.throws(()=>applyDiagnosticPlan(account,{...team,name:'Changed'},report,options),/desatualizado/);assert.throws(()=>applyDiagnosticPlan(account,team,report,{...options,artifacts:false}),/desatualizado/);
 const forged=structuredClone(report);forged.improvement.builds[0].runeIds[0]=201;assert.throws(()=>applyDiagnosticPlan(account,team,forged,options),/indisponíveis/);
 assert.equal(diagnoseTeam(account,team,options,[101,102,103,104,105,106]).improvement,null);assert.deepEqual(plannedReservations([applied],account,'other'),applied.plannedRunes.byConfig[team.configs[0].key]);assert.equal(plannedReservations([applied],{...account,importedAt:'new'}).length,0);
});
test('diagnosis flags integer order and enemy cuts instead of claiming a perfect team',()=>{
 const {account,team}=fixture(3);team.enemyCombatSpd=300;const report=diagnoseTeam(account,team,options);assert.equal(report.status,'alert');assert.match(report.message,/corte/);
 team.active=false;assert.equal(diagnoseTeam(account,team,options).status,'pending');
});
test('balanced allocation avoids starving one team; priority receives first tier of runes',()=>{
 const u1={id:1,master:0,name:'A',base,runeIds:[],artifactIds:[]},u2={...u1,id:2,name:'B'};
 const account={units:[u1,u2],runes:Array.from({length:6},(_,i)=>[rune(i+1,i+1,0,0,1000),rune(i+11,i+1,0,0,100)]).flat(),artifacts:[]};
 const teams=[u1,u2].map((u,i)=>({id:String(i),name:u.name,priority:1,configs:[{...blankConfig(u),sets:[],basis:'total',objective:'hp'}]}));
 const balanced=optimize(account,teams,options);const hp=balanced.builds.map(b=>b.stats.total.hp);assert.equal(hp[0],hp[1]);assert.equal(new Set(balanced.builds.flatMap(b=>b.runeIds)).size,12);
 teams[0].priorityFocus=true;const priority=optimize(account,teams,options);assert.ok(priority.builds[0].stats.total.hp>priority.builds[1].stats.total.hp);assert.equal(priority.builds[0].runeIds.filter(id=>id<=6).length,6);
});
test('free queue searches more than ten teams/fifty monsters and skips inactive drafts',()=>{
 const {account}=fixture(51);const teams=account.units.map(u=>({id:String(u.id),priority:1,configs:[{...blankConfig(u),sets:[]}]}));teams.push({id:'inactive',active:false,configs:[blankConfig()]});const result=optimize(account,teams,{...options,equipped:false});assert.equal(result.builds.length,51);assert.equal(new Set(result.builds.flatMap(b=>b.runeIds)).size,306);
});
test('leader deltas include rounding, element/mode scope, HP base and capped critical chance',()=>{
 const unit={master:18311,element:1,base:{...base,spd:101}},stats={total:{...base,spd:150,cr:95}},team={gameMode:'siege',towerSpd:15,leader:{stat:'spd',scope:'guild',value:28,element:0}};
 const speed=leaderImpact(unit,stats,{},team);assert.equal(speed.bonus.spd,speed.combat.spd-leaderImpact(unit,stats,{},{...team,leader:null}).combat.spd);assert.equal(leaderImpact(unit,stats,{},{...team,gameMode:'arena'}).bonus.spd,0);assert.equal(leaderImpact(unit,stats,{},{...team,leader:{stat:'hp',scope:'general',value:44}}).bonus.hp,4400);assert.equal(leaderImpact(unit,stats,{},{...team,leader:{stat:'cr',scope:'general',value:24}}).bonus.cr,5);assert.equal(leaderImpact(unit,stats,{},{...team,leader:{stat:'spd',scope:'element',value:24,element:2}}).bonus.spd,0);assert.equal(minimumSpeedForTick(10),143);
});
test('Arena race includes base/Swift/leader/tower and conservative enemy ties',()=>{
 const {account,team}=fixture(4);team.gameMode='arena';team.configs.push({...blankConfig(account.units[3]),sets:[]});
 const race=arenaContest(account,team,options,{enemyBase:100,enemyRuneSpd:20});assert.equal(race.wins,false);assert.equal(race.enemyCombatSpd,120);assert.equal(arenaContest(account,team,options,{enemyBase:100,enemyRuneSpd:0}).wins,true);
 const full=arenaContest(account,team,options,{enemyBase:100,enemyRuneSpd:20,swift:true,enemyLeader:33,enemyTower:15});assert.equal(full.enemyCombatSpd,193);assert.ok(full.turns.every(t=>Number.isInteger(t.tick)));assert.equal(arenaContest(account,team,options).complete,false);
});
test('Arena Nemesis damage moves healer before remaining allies in an explicit branch',()=>{
 const {account,team}=fixture(3);team.gameMode='arena';account.units[0].base.spd=300;account.units[1].base.spd=100;account.units[2].base.spd=90;
 const noDamage=arenaContest(account,team,options,{enemyBase:10,healerSpd:80,nemesis:3,damage:0});const damage=arenaContest(account,team,options,{enemyBase:10,healerSpd:80,nemesis:3,damage:50});assert.equal(noDamage.antiCut.cut,false);assert.equal(damage.antiCut.cut,true);
});
test('Cairos checklist validates five-unit integer order, actual caps, EHP and pending boss data',()=>{
 const {account,team}=fixture(5);team.gameMode='cairos';team.configs=account.units.map(u=>({...blankConfig(u),sets:[]}));const profile=ALL_CAIROS_PROFILES.find(p=>p.id==='gbah');let r=cairosChecklist(account,team,profile,options);assert.equal(r.order,true);assert.equal(r.beforeBoss,null);assert.equal(r.members.length,5);assert.equal(r.members[0].accMet,false);assert.equal(r.members[0].crMet,false);assert.equal(r.members[0].survives,null);
 team.boss={spd:400,rawDamage:1000000};r=cairosChecklist(account,team,profile,options);assert.equal(r.beforeBoss,false);assert.equal(r.members[0].survives,false);team.configs[0].requireCritical=false;team.configs[0].requireAccuracy=false;assert.equal(cairosChecklist(account,team,profile,options).members[0].crMet,true);
 const plain=effectiveSurvival(10000,1000,{rawDamage:10000}),broken=effectiveSurvival(10000,1000,{rawDamage:10000,defBreak:true}),ignore=effectiveSurvival(10000,1000,{rawDamage:10000,ignoreDefense:true});assert.ok(plain.ehp>broken.ehp&&broken.ehp>ignore.ehp);const reduced=effectiveSurvival(10000,1000,{rawDamage:10000,element:2,critical:true},{totals:{reductionFire:20,receivedCritReduction:10}});assert.ok(reduced.ehp>plain.ehp);assert.equal(effectiveSurvival(100,0,{rawDamage:114}).survives,false);assert.throws(()=>effectiveSurvival(10,5,{spd:-1}),/inválido/);
});

test('native Siege and Arena defense arrays supplement deck_list with private metadata stripped',async()=>{
 const {normalizeAccount}=await import('../src/core/data.js');
 const raw={runes:[],unit_list:Array.from({length:4},(_,i)=>({unit_id:i+1,unit_master_id:18311,con:100,spd:100,runes:[{rune_id:i+1,slot_no:1,class:6,upgrade_curr:15,pri_eff:[1,100],sec_eff:[]}]})),guildsiege_defense_deck_unit_list:[{deck_id:88,unit_id_list:[1,999,3],secret:'PRIVATE'}],defense_unit_list:[{pos_id:4,unit_id:4},{pos_id:2,unit_id:2},{pos_id:3,unit_id:3},{pos_id:1,unit_id:1}],session_key:'PRIVATE'};
 const a=normalizeAccount(raw);assert.deepEqual(a.accountPresets.find(p=>p.gameMode==='siege').unitIds,[1,null,3]);assert.deepEqual(a.accountPresets.find(p=>p.gameMode==='arena').unitIds,[1,2,3,4]);assert.ok(!JSON.stringify(a).includes('PRIVATE'));
});

test('automatic diagnostics include area-specific Arena and Cairos failures',()=>{
 const {account,team}=fixture(5);team.gameMode='cairos';team.configs=account.units.map(u=>({...blankConfig(u),sets:[]}));const cairos=diagnoseTeam(account,team,options);assert.equal(cairos.status,'alert');assert.ok(cairos.warnings.some(w=>/cap de ACC/.test(w)));
 team.gameMode='arena';team.configs=team.configs.slice(0,4);team.arenaScenario={enemyBase:200};const arena=diagnoseTeam(account,team,options);assert.equal(arena.status,'alert');assert.ok(arena.warnings.some(w=>/primeiro turno/.test(w)));
});
