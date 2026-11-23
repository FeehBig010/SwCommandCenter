import test from 'node:test';
import assert from 'node:assert/strict';
import {blankConfig,DEFAULT_OPTIONS} from '../src/core/data.js';
import {prepareOptimizerTeam,optimizerAreaTeams,optimizerPresets,optimizerActionLabel,importedPreset,resultForTeams} from '../src/core/optimizer-context.js';
import {auditPresets} from '../src/core/optimizer-audit.js';
import {optimizeAdvanced} from '../src/core/advanced-optimizer.js';
import {equippedTeamBuilds,speedSyncValid,teamTurnPreview} from '../src/core/optimizer.js';
import {canonicalMonsterId,collabMapping,equivalentSkillIds} from '../src/core/CollabMapping.js';
import {monsterBase} from '../src/core/monster-search.js';
import {monsterOpener,monsterLeader} from '../src/core/monsterDatabase.js';
import skills from '../src/core/monster-skills.json' with {type:'json'};
const options={...DEFAULT_OPTIONS,depth:'fast',minLevel:0,maxGrindsGems:true};
function fixture(area='siege'){
 const n=area==='arena'?4:3,base={hp:10000,def:650,atk:800,spd:100,cr:15,cd:50,res:15,acc:0};
 const units=Array.from({length:n},(_,i)=>({id:i+1,master:13413,name:`Unidade ${i+1}`,base:{...base},level:40,stars:6,element:3,artifactIds:[],runeIds:Array.from({length:6},(_,s)=>i*6+s+1)}));
 const runes=units.flatMap((u,i)=>u.runeIds.map((id,s)=>({id,owner:u.id,set:1,slot:s+1,stars:6,level:15,main:[1,100],innate:[],subs:[[8,20-i*2,0,0],[2,5,0,0],[4,5,0,0],[6,5,0,0]],locked:false})));
 const preset={id:'json-deck',gameMode:area,sourceKey:'defense_deck_list',mode:'defense',arenaContext:'regular',unitIds:units.map(u=>u.id),missingIds:[]};
 const account={id:'test',importedAt:'today',units,runes,crafts:[],artifacts:[],accountPresets:[preset]};
 const team={id:'team',name:'Preset',mode:'defense',active:true,gameMode:area,sourceDeckId:preset.id,sourceAccountId:account.id,configs:units.map(u=>({...blankConfig(u),strictSets:false})),towerSpd:0,guildSpd:99,leaderSpd:99,leaderIndex:0,combatScenario:{enemies:[],events:[]}};
 return {account,team:prepareOptimizerTeam(team),options};
}
const loose=(id,old,patch={})=>({...structuredClone(old),id,owner:0,...patch});
test('audit uses loose upgrades, preserves main stats, sets and all vital floors without mutating SWEX',()=>{
 const {account,team}=fixture();const old=account.runes[3];account.runes.push(loose(100,old,{subs:old.subs.map(s=>s[0]===2?[2,15,0,0]:s)}));
 account.runes.push(loose(101,old,{main:[2,63],subs:[[8,100,0,0],[2,99,0,0]]}));
 account.runes.push(loose(102,old,{owner:999,subs:old.subs.map(s=>s[0]===2?[2,50,0,0]:s)}));
 const before=structuredClone({account,team}),result=auditPresets(account,[team],options);
 assert.equal(result.audit.changes.length,1);assert.equal(result.audit.changes[0].slot,4);assert.equal(result.audit.changes[0].runeId,100);assert.ok(result.audit.changes[0].gains.hp>0);
 assert.ok(!result.builds.some(b=>b.runeIds.includes(101)||b.runeIds.includes(102)));assert.equal(new Set(result.builds.flatMap(b=>b.runeIds)).size,18);assert.ok(result.audit.syncValid);assert.deepEqual({account,team},before);
});
test('reserved, game-locked, unit-locked and locally locked runes cannot be changed or suggested',()=>{
 for(const kind of ['reserved','game','unit','local']){
  const {account,team}=fixture(),old=account.runes[3];account.runes.push(loose(100,old,{subs:old.subs.map(s=>s[0]===2?[2,15,0,0]:s)}));
  const opts={...options};let reserved=[];
  if(kind==='reserved')reserved=[100];if(kind==='game'){account.runes.at(-1).locked=true;opts.respectLocks=true;}
  if(kind==='unit')opts.localLocks={unitIds:account.units.map(u=>u.id),runeIds:[]};if(kind==='local')opts.localLocks={unitIds:[],runeIds:[100]};
  assert.equal(auditPresets(account,[team],opts,()=>{},reserved).audit.changes.length,0,kind);
 }
});
test('craft plans use actual stock once globally, report incremental grind gain and leave actual builds untouched',()=>{
 const {account,team}=fixture();account.crafts=[{id:501,kind:'grind',set:1,stat:8,grade:5,ancient:false,quantity:1}];
 const before=structuredClone(account),original=equippedTeamBuilds(account,team,options),result=auditPresets(account,[team],options);
 assert.equal(result.audit.craftUsed[501],1);assert.equal(result.audit.craftPlans.flatMap(p=>p.steps).length,1);assert.equal(result.audit.craftPlans[0].gains.spd,5);
 assert.deepEqual(result.builds.map(b=>b.stats.total),original.map(b=>b.stats.total));assert.deepEqual(account,before);assert.ok(result.audit.craftSyncValid);
 account.crafts=[];assert.equal(auditPresets(account,[team],options).audit.craftPlans.length,0);
});
test('gems respect existing enchant slot, set, Ancient status and incremental potential',()=>{
 const {account,team}=fixture();account.runes[0].subs=[[8,20,0,0],[10,1,1,0],[4,5,0,0],[6,5,0,0]];
 account.crafts=[{id:601,kind:'gem',set:1,stat:10,grade:5,ancient:false,quantity:1},{id:602,kind:'grind',set:13,stat:8,grade:5,ancient:false,quantity:10},{id:603,kind:'grind',set:1,stat:8,grade:5,ancient:true,quantity:10}];
 const result=auditPresets(account,[team],options),steps=result.audit.craftPlans.flatMap(p=>p.steps);
 assert.equal(steps.length,1);assert.equal(steps[0].craftId,601);assert.equal(steps[0].index,1);assert.equal(result.audit.craftPlans[0].gains.cd,9);
});
test('speed sync rejects a raw upgrade that reverses turns; Turn 2 accepts it',()=>{
 const {account,team}=fixture(),old=account.runes[9];account.runes[3].main=[2,63];account.runes[15].main=[6,63];account.runes.push(loose(100,old,{subs:old.subs.map(s=>s[0]===8?[8,90,0,0]:s[0]===2?[2,30,0,0]:s)}));
 assert.equal(auditPresets(account,[team],options).audit.changes.length,0);
 const raw=prepareOptimizerTeam({...team,optimizerSpeedSync:false});assert.equal(auditPresets(account,[raw],options).audit.changes.length,1);
 assert.equal(speedSyncValid({},[{...raw,configs:raw.configs.map(c=>({...c,lockSpeedSync:true,maxTick:1}))}]),true);
});
test('automatic boosters and cascades use real ticks as the eliminatory sync condition',()=>{
 const {account,team}=fixture();account.units[0].master=11513;team.configs[0].masterId=11513; // Bernard
 account.units[1].master=18913;team.configs[1].masterId=18913; // Tiana
 const prepared=prepareOptimizerTeam(team),builds=equippedTeamBuilds(account,prepared,options),assignments=Object.fromEntries(builds.map(b=>[b.key,b]));
 assert.ok(speedSyncValid(assignments,[prepared]));const preview=teamTurnPreview(account,prepared,options,builds);assert.ok(preview.scenario.log.some(e=>e.type==='boost'||e.type==='tiana'));
 const slow=structuredClone(assignments);slow[prepared.configs[2].key].stats.combat.spd=20;slow[prepared.configs[2].key].stats.combat.rawSpd=20;assert.equal(speedSyncValid(slow,[prepared]),false);
});
test('manual construction uses only unassigned loose runes and ignores imaginary max stones',()=>{
 const {account,team}=fixture();delete team.sourceDeckId;team.optimizerSpeedSync=false;
 for(const rune of account.runes.slice())account.runes.push(loose(rune.id+100,rune));
 const result=optimizeAdvanced(account,[team],options);assert.equal(result.builds.length,3);assert.ok(result.builds.every(b=>b.runeIds.every(id=>id>100)));assert.ok(result.builds.every(b=>!b.upgrades?.length));assert.equal(result.options.maxGrindsGems,false);
});
test('area filtering includes Siege attacks and defenses while excluding other modes and Interserver and malformed slot counts',()=>{
 const {account,team}=fixture();const sourceAttack={...account.accountPresets[0],id:'attack',sourceKey:'deck_list',mode:'attack'};
 const arena={...sourceAttack,id:'arena',gameMode:'arena',unitIds:[1,2,3,4]},inter={...arena,id:'inter',arenaContext:'interserver'},bad={...account.accountPresets[0],id:'bad',unitIds:[1,2,3,4]};account.accountPresets.push(sourceAttack,arena,inter,bad);
 const other=[team,{...team,id:'attack',sourceDeckId:'attack'},{...team,id:'wrong',gameMode:'arena',configs:[...team.configs,blankConfig()]},{...team,id:'manual',sourceDeckId:null}];
 assert.deepEqual(optimizerAreaTeams(other,account,'siege').map(t=>t.id),['team','attack','manual']);assert.deepEqual(optimizerPresets(account,'siege').map(p=>p.id),['json-deck','attack']);assert.deepEqual(optimizerPresets(account,'arena').map(p=>p.id),['arena']);
 assert.equal(resultForTeams({teamIds:['arena-team'],builds:[]},[team]),null);assert.equal(resultForTeams({teamIds:[team.id],builds:[]},[team]).teamIds[0],team.id);
 assert.equal(optimizerActionLabel([team],account),'Procurar Melhorias (Auditoria)');assert.equal(optimizerActionLabel([other[3]],account),'Construir Time (Buscar Runas)');assert.equal(importedPreset({...team,configs:team.configs.map((c,i)=>i===0?{...c,unitId:999}:c)},account),null);
 assert.throws(()=>optimizeAdvanced(account,[{...team,gameMode:'siege',configs:[...team.configs,blankConfig()]}],options),/incompatível/);
});
test('maxed towers and automatic actual leader ignore stale manual bonuses for player and opponent',()=>{
 const {team}=fixture('arena');team.configs[0].masterId=24511;team.arenaScenario={enemyBase:100,enemyRuneSpd:150,swift:true,enemyMaster:24511,enemyTower:0,enemyLeader:99};
 const p=prepareOptimizerTeam({...team,towerSpd:99,guildSpd:99,leaderSpd:99});assert.equal(p.towerSpd,15);assert.equal(p.guildSpd,0);assert.equal(p.leaderSpd,0);assert.deepEqual(p.leader,monsterLeader(24511));assert.equal(p.arenaScenario.enemyTower,15);assert.equal(p.arenaScenario.enemyLeader,24);assert.equal(p.enemyCombatSpd,314);
});
test('64 verified Collab IDs share canonical base, leader, opener and skills without merging instances/elements',()=>{
 assert.equal(Object.keys(collabMapping).length,64);assert.equal(canonicalMonsterId(26311),26811);assert.notEqual(canonicalMonsterId(26313),26811);
 for(const [id,target] of Object.entries(collabMapping)){assert.equal(Number(id)%10,target%10);assert.deepEqual(monsterBase(id),monsterBase(target));assert.deepEqual(monsterLeader(id),monsterLeader(target));assert.deepEqual(monsterOpener(id),monsterOpener(target));assert.deepEqual(equivalentSkillIds(skills,id),equivalentSkillIds(skills,target));}
 assert.equal(canonicalMonsterId(99991),99991);assert.equal(canonicalMonsterId(29311),29711);assert.equal(canonicalMonsterId(29312),29312);
});
test('incomplete and overlapping presets fail safely with empty results instead of inventing equipment',()=>{
 const {account,team}=fixture();account.units[0].runeIds.pop();const missing=auditPresets(account,[team],options);assert.equal(missing.builds.length,0);assert.ok(missing.failures.length);
 const f=fixture(),overlap={...f.team,id:'duplicate',configs:f.team.configs.map(c=>({...c,key:c.key+'-other'}))};assert.match(auditPresets(f.account,[f.team,overlap],options).failures[0].reason,/compartilham/);
});

test('Quick Calculator transfer resolves Collab equivalents, preserves goals and never copies manual sheets into builds',async()=>{
 const {quickTeam,selectQuickMonster}=await import('../src/core/quick-calculator.js');const {quickOptimizerPlan}=await import('../src/core/quick-optimizer-plan.js');
 const {account}=fixture();account.units[0].master=26311;account.units[0].base={...monsterBase(26311)};account.units[0].name='Pure Vanilla Cookie';
 const q=quickTeam('siege');q.configs=q.configs.map((c,i)=>selectQuickMonster(c,{master:i?13413:26811,name:i?'Lushen':'Adriana'}));q.configs[0].manual.sheet.spd=250;q.configs[0].goals.hp=30000;
 const before=structuredClone({q,account}),plan=quickOptimizerPlan(q,account);assert.equal(plan.sourceDeckId,null);assert.equal(plan.origin,'calculator');assert.equal(plan.configs[0].masterId,26311);assert.equal(plan.configs[0].goals.spd,250);assert.equal(plan.configs[0].goals.hp,30000);assert.ok(plan.configs.every(c=>!c.manual));assert.equal(new Set(plan.configs.map(c=>c.unitId)).size,3);assert.deepEqual({q,account},before);
 assert.throws(()=>quickOptimizerPlan(q,null),/SWEX/);assert.throws(()=>quickOptimizerPlan({...q,configs:q.configs.map(c=>({...c,masterId:99999}))},account),/cópia/);
});

test('max towers are included once in combat damage and stale manual tower/leader damage fields are ignored',async()=>{
 const {estimateRealDamage}=await import('../src/core/damage.js');const {account,team}=fixture();const build=equippedTeamBuilds(account,team,options)[0],unit=account.units[0];
 assert.ok(build.stats.combat.atk>build.stats.total.atk);assert.equal(build.stats.combat.cd,build.stats.total.cd+25);
 const settings={enabled:true,multiplier:1,critMode:'normal',ignoreDefense:true,variance:1};
 assert.equal(estimateRealDamage(unit,build.stats,settings).total,estimateRealDamage(unit,build.stats,{...settings,towerAtk:99,leaderAtk:99,towerCd:99}).total);
});
