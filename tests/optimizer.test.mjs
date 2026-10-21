import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAccount,blankConfig,DEFAULT_OPTIONS} from '../src/core/data.js';
import {calculateStats,optimize,generateCandidates,runeVector} from '../src/core/optimizer.js';
const unit={id:1,name:'Teste',base:{hp:10000,def:500,atk:600,spd:100,cr:15,cd:50,res:15,acc:0},runeIds:[],artifactIds:[]};
function rune(id,slot,set=13,main=[2,20]){return {id,slot,set,level:15,owner:0,locked:false,main,innate:[0,0],subs:[]};}
function config(u=unit){return {...blankConfig(u),sets:[13,0],goals:{hp:10000,def:'',atk:'',spd:'',cr:'',cd:'',res:'',acc:''}};}
test('main, innate and grind are summed once; percentage is applied to base HP',()=>{
 const r={...rune(1,1,1,[1,1000]),innate:[2,5],subs:[[2,20,1,10],[8,10,0,5]]};
 assert.equal(runeVector(r)[2],35);const s=calculateStats(unit,[r,rune(2,2,1,[8,42])],{hp:1500});
 assert.equal(s.bonus.hp,7500);assert.equal(s.total.hp,17500);assert.equal(s.bonus.spd,57);
});
test('SWEX import deduplicates equipped runes and discards session/account/social information',()=>{
 const r={rune_id:123,slot_no:1,set_id:13,pri_eff:[1,100],prefix_eff:[0,0],sec_eff:[],upgrade_curr:15,class:6};
 const a=normalizeAccount({unit_list:[{unit_id:1,unit_master_id:19614,con:100,atk:50,def:60,spd:100,runes:[r]}],runes:[r],session_key:'SHOULD_NOT_SURVIVE',friend_list:[{name:'Private'}]});
 assert.equal(a.runes.length,1);assert.equal(a.runes[0].owner,1);assert.equal(a.units[0].base.hp,1500);assert.equal(a.units[0].name,'Molly');assert.ok(!JSON.stringify(a).includes('SHOULD_NOT_SURVIVE'));assert.ok(!('friend_list' in a));
});
test('joint allocation has six distinct slots per monster and never reuses a rune',()=>{
 const u2={...unit,id:2,name:'Outro'};const runes=Array.from({length:18},(_,i)=>rune(i+1,i%6+1,13,[2,20]));
 const account={units:[unit,u2],runes,artifacts:[]};const teams=[{id:'t',name:'Equipe',priority:1,order:'off',configs:[config(),config(u2)]}];const r=optimize(account,teams,{...DEFAULT_OPTIONS,depth:'fast'});
 assert.equal(r.status,'met');const ids=r.builds.flatMap(b=>b.runeIds);assert.equal(ids.length,12);assert.equal(new Set(ids).size,12);for(const b of r.builds)assert.equal(new Set(b.runeIds.map(id=>runes.find(r=>r.id===id).slot)).size,6);
});
test('missing units and duplicate units cannot silently become results',()=>{
 const a={units:[unit],runes:[],artifacts:[]};assert.throws(()=>optimize(a,[{configs:[{...config(),unitId:null}]}],DEFAULT_OPTIONS),/não encontrado/);assert.throws(()=>optimize(a,[{configs:[config(),config()]}],DEFAULT_OPTIONS),/mais de uma vez/);
});
test('mandatory sets, mains, reserved runes and game locks are honored',()=>{
 const runes=Array.from({length:6},(_,i)=>rune(i+1,i+1));const a={units:[unit],runes,artifacts:[]};
 assert.equal(generateCandidates(a,unit,{...config(),sets:[3,0]},DEFAULT_OPTIONS).candidates.length,0);
 assert.equal(generateCandidates(a,unit,{...config(),mains:{2:8,4:0,6:0}},DEFAULT_OPTIONS).candidates.length,0);
 assert.equal(generateCandidates(a,unit,config(),DEFAULT_OPTIONS,new Set([1])).candidates.length,0);
 runes[0].locked=true;assert.equal(generateCandidates(a,unit,config(),{...DEFAULT_OPTIONS,respectLocks:true}).candidates.length,0);
});
test('unmet numerical targets are explicitly approximate, not a false success',()=>{
 const a={units:[unit],runes:Array.from({length:6},(_,i)=>rune(i+1,i+1)),artifacts:[]};const c=config();c.goals.hp=999999;const r=optimize(a,[{id:'t',name:'Time',priority:1,configs:[c]}],{...DEFAULT_OPTIONS,depth:'fast'});assert.equal(r.status,'approximate');assert.ok(r.builds[0].goals[0].missing>0);
});
test('impossible simultaneous equipment assignment does not return duplicated gear',()=>{
 const u2={...unit,id:2,name:'Outro'};const a={units:[unit,u2],runes:Array.from({length:6},(_,i)=>rune(i+1,i+1)),artifacts:[]};const r=optimize(a,[{id:'t',name:'Time',priority:1,configs:[config(),config(u2)]}],{...DEFAULT_OPTIONS,depth:'fast'});assert.equal(r.status,'conflict');assert.equal(r.builds.length,0);
});

test('game modes preserve hidden slots and specifications through resize and restore',async()=>{
 const {makeTeam,changeGameMode,restoreTeam}=await import('../src/core/data.js');
 let team=makeTeam('cairos');assert.equal(team.configs.length,5);
 team.configs[4].goals.hp=28001;team.configs[4].lockSpeedSync=true;
 const lastKey=team.configs[4].key;
 team=changeGameMode(team,'solo');assert.equal(team.configs.length,1);
 team=restoreTeam(JSON.parse(JSON.stringify(team)));
 team=changeGameMode(team,'arena');assert.equal(team.configs.length,4);
 team=changeGameMode(team,'cairos');assert.equal(team.configs.length,5);
 assert.equal(team.configs[4].key,lastKey);assert.equal(team.configs[4].goals.hp,28001);assert.equal(team.configs[4].lockSpeedSync,true);
 assert.equal(restoreTeam({configs:[blankConfig(),blankConfig(),blankConfig()]}).gameMode,'siege');
 assert.equal(makeTeam('siege').configs.length,3);
});
test('speed synchronization skips unlocked/excluded cards and checks nonadjacent assigned pairs',async()=>{
 const {speedSyncValid}=await import('../src/core/optimizer.js');
 const configs=Array.from({length:5},()=>({...blankConfig(),lockSpeedSync:true}));
 configs[1].lockSpeedSync=false;configs[3].enabled=false;
 const assignments=Object.fromEntries(configs.map((c,i)=>[c.key,{stats:{total:{spd:[200,300,180,400,160][i]}}}]));
 assert.equal(speedSyncValid(assignments,[{configs}]),true);
 assignments[configs[4].key].stats.total.spd=210;delete assignments[configs[2].key];
 assert.equal(speedSyncValid(assignments,[{configs}]),false);
 assignments[configs[4].key].stats.total.spd=200;
 assert.equal(speedSyncValid(assignments,[{configs}]),false);
});
test('joint optimizer enforces marked SPD order while leaving unmarked units free',()=>{
 const slow={...unit,id:1,base:{...unit.base,spd:100}};
 const fast={...unit,id:2,base:{...unit.base,spd:120}};
 const third={...unit,id:3,base:{...unit.base,spd:150}};
 const account={units:[slow,fast,third],runes:Array.from({length:18},(_,i)=>({...rune(i+1,i%6+1),owner:Math.floor(i/6)+1})),artifacts:[]};
 const a={...config(slow),lockSpeedSync:true},b={...config(fast),lockSpeedSync:true},c=config(third);
 const options={...DEFAULT_OPTIONS,equipped:false,depth:'fast'};
 const team={id:'t',name:'Test',priority:1,order:'off',configs:[a,c,b]};
 assert.equal(optimize(account,[team],options).status,'conflict');
 team.configs=[b,c,a];const result=optimize(account,[team],options);
 assert.equal(result.status,'met');assert.equal(new Set(result.builds.flatMap(b=>b.runeIds)).size,18);
});

// Phase 2 fixtures are synthetic: no personal account exports are required.
const engine=await import('../src/core/optimizer.js');
const {combatSpeed,firstTurns,speedSyncValid,runeVariants,MAX_GRIND}=engine;
function upgradedRune(overrides={}){
 return {...rune(901,2,13,[2,63]),stars:6,subs:[[8,6,0,2],[4,8,0,3],[9,6,0,0],[11,8,0,0]],...overrides};
}
function assignment(spd,sheet=spd){return {stats:{total:{spd:sheet},combat:{spd}}};}
test('combat SPD combines fractional Swift, tower and leader bonuses before one ceiling',()=>{
 const u={...unit,base:{...unit.base,spd:101}};
 const counts={3:4};const stats=engine.statsFromVector(u,Array(13).fill(0),counts);
 assert.equal(stats.total.spd,127);
 assert.equal(combatSpeed(u,stats,counts,{towerSpd:15,leaderSpd:24}),166);
 assert.equal(combatSpeed(u,stats,counts),127);
 assert.equal(stats.total.spd,127,'combat calculation must not mutate sheet stats');
 assert.equal(combatSpeed(unit,{total:{spd:150}},{},{towerSpd:15,leaderSpd:24}),189);
 assert.equal(combatSpeed(unit,{total:{spd:150}},{},{towerSpd:0,leaderSpd:0}),150);
});
test('combat sync uses combat rather than sheet SPD and breaks ties by visual order',()=>{
 const a={...config(),lockSpeedSync:true},b={...config(),lockSpeedSync:true};const team={configs:[a,b]};
 const assignments={[a.key]:assignment(180,150),[b.key]:assignment(180,170)};
 assert.equal(speedSyncValid(assignments,[team]),true);
 assignments[b.key]=assignment(181,140);assert.equal(speedSyncValid(assignments,[team]),false);
 assert.deepEqual(firstTurns([{key:'a',spd:200},{key:'b',spd:200}]).map(t=>t.key),['a','b']);
});
test('7% ticks retain overflow, advance after actions, and resolve enemy ties conservatively',()=>{
 const turns=firstTurns([{key:'a',spd:300},{key:'b',spd:290},{key:'enemy',spd:280,enemy:true}]);
 assert.deepEqual(turns.map(t=>[t.key,t.tick]),[['a',5],['b',6],['enemy',7]]);
 assert.equal(turns[1].atb,121.8);
 assert.deepEqual(firstTurns([{key:'ally',spd:200},{key:'enemy',spd:200,enemy:true}]).map(t=>t.key),['enemy','ally']);
 assert.throws(()=>firstTurns([{key:'bad',spd:0}]),/positiva/);
 assert.throws(()=>firstTurns([{key:'bad',spd:NaN}]),/finita/);
});
test('enemy cutting validates a complete first rotation including unlocked actors',()=>{
 const a={...config(),lockSpeedSync:true},b={...config(),lockSpeedSync:true},free=config();
 const team={configs:[a,free,b],enemyCombatSpd:295};
 const assignments={[a.key]:assignment(300),[free.key]:assignment(310),[b.key]:assignment(290)};
 assert.equal(speedSyncValid(assignments,[team]),false);
 team.enemyCombatSpd=280;assert.equal(speedSyncValid(assignments,[team]),true);
 team.enemyCombatSpd=290;assert.equal(speedSyncValid(assignments,[team]),false);
 b.enabled=false;assert.equal(speedSyncValid(assignments,[team]),true);
 b.enabled=true;delete assignments[b.key];assert.equal(speedSyncValid(assignments,[team]),true,'partial beam must remain expandable');
});
test('max grinds replace, rather than add to, existing grinds and leave nongrindable stats alone',()=>{
 const r=upgradedRune();const before=structuredClone(r);const projected=runeVariants(r,true)[0];
 assert.deepEqual(projected.subs,[[8,6,0,5],[4,8,0,10],[9,6,0,0],[11,8,0,0]]);
 assert.equal(runeVector(projected)[8],11);assert.deepEqual(r,before);
 const better=upgradedRune({subs:[[8,6,0,6],[4,8,0,12],[9,6,0,0],[11,8,0,0]]});
 assert.equal(runeVariants(better,true)[0].subs[0][3],6);
 assert.equal(runeVariants(better,true)[0].subs[1][3],12);
});
test('gem alternatives never combine two swaps or duplicate a main, innate or other substat',()=>{
 const r=upgradedRune({innate:[6,7]});const variants=runeVariants(r,true);
 assert.ok(variants.length>4);
 for(const v of variants){
  assert.ok(v.subs.filter((e,i)=>e[0]!==r.subs[i][0]).length<=1);
  assert.ok(v.subs.filter(e=>e[2]).length<=1);
  assert.equal(new Set(v.subs.map(e=>e[0])).size,4);
  assert.ok(v.subs.every(e=>e[0]!==r.main[0]&&e[0]!==r.innate[0]));
  for(const e of v.subs)if(!MAX_GRIND[e[0]])assert.equal(e[3],0);
 }
 assert.ok(variants.some(v=>v.subs.some(e=>e[0]===1&&e[1]===580)));
});
test('previously enchanted runes can only re-gem that same substat index',()=>{
 const r=upgradedRune({subs:[[8,6,0,2],[4,8,1,3],[9,6,0,0],[11,8,0,0]]});
 const variants=runeVariants(r,true);assert.ok(variants.length>1);
 for(const v of variants)for(const i of [0,2,3])assert.equal(v.subs[i][0],r.subs[i][0]);
 const improved=variants.find(v=>v.subs[1][0]===1);
 assert.deepEqual(improved.subs[1],[1,580,1,550],'a changed stat must not inherit the old grind');
 const same=variants.find(v=>v.subs[1][0]===4&&v.subs[1][1]===13&&v.subs[1][2]===1);
 assert.deepEqual(same.subs[1],[4,13,1,10]);
});
test('slot restrictions, grade, Ancient and unrevealed substat constraints are respected',()=>{
 for(const slot of [1,3]){
  const r=upgradedRune({slot,main:slot===1?[3,160]:[5,160]});
  const forbidden=slot===1?[5,6]:[3,4];
  assert.ok(runeVariants(r,true).every(v=>v.subs.every((e,i)=>e[0]===r.subs[i][0]||!forbidden.includes(e[0]))));
 }
 for(const patch of [{stars:5},{stars:undefined},{ancient:true}]){
  const r=upgradedRune(patch);assert.deepEqual(runeVariants(r,true),[r]);
 }
 assert.equal(runeVariants(upgradedRune({level:9}),true).length,1);
 assert.equal(runeVariants(upgradedRune({subs:[[8,6,0,0]]}),true).length,1);
 const r=upgradedRune();assert.deepEqual(runeVariants(r,false),[r]);
});
test('SWEX import retains Ancient classification so regular stones cannot be applied',()=>{
 const raw={rune_id:1,slot_no:2,set_id:13,pri_eff:[8,42],prefix_eff:[0,0],sec_eff:[],upgrade_curr:15,class:16};
 const a=normalizeAccount({unit_list:[{unit_id:1,unit_master_id:19614,con:100}],runes:[raw]});
 assert.equal(a.runes[0].ancient,true);assert.equal(a.runes[0].stars,6);
 assert.deepEqual(runeVariants(a.runes[0],true),[a.runes[0]]);
});
test('optimizer projects attainable gem variants, exports the plan, and preserves current inventory',()=>{
 const runes=Array.from({length:6},(_,i)=>upgradedRune({id:i+1,slot:i+1,main:[2,63],subs:[[8,6,1,2],[4,8,0,3],[9,6,0,0],[11,8,0,0]]}));
 const account={units:[unit],runes,artifacts:[]},before=structuredClone(account);
 const c={...config(),sets:[0,0],goals:{...config().goals,hp:'',spd:90}};
 const team={id:'t',name:'T',priority:1,towerSpd:15,leaderSpd:24,configs:[c]};
 const opts={...DEFAULT_OPTIONS,depth:'fast'};
 const current=optimize(account,[team],opts);
 assert.equal(current.status,'approximate');assert.equal(current.builds[0].stats.total.spd,148);
 const projected=optimize(account,[team],{...opts,maxGrindsGems:true});
 assert.equal(projected.status,'met');assert.ok(projected.builds[0].stats.bonus.spd>=90);
 assert.equal(projected.builds[0].stats.combat.spd,projected.builds[0].stats.total.spd+39);
 assert.equal(projected.builds[0].upgrades.length,6);
 for(const upgrade of projected.builds[0].upgrades){assert.ok(upgrade.subs.filter(e=>e[2]).length<=1);}
 assert.equal(new Set(projected.builds[0].runeIds).size,6);assert.deepEqual(account,before);
});
test('combat bonuses reach joint allocation while sheet goals stay unchanged',()=>{
 const u2={...unit,id:2,base:{...unit.base,spd:120}};
 const runes=Array.from({length:12},(_,i)=>({...rune(i+1,i%6+1),owner:Math.floor(i/6)+1}));
 const a={...config(),lockSpeedSync:true},b={...config(u2),lockSpeedSync:true};
 const team={id:'t',name:'T',priority:1,configs:[a,b],towerSpd:15,leaderSpd:24};
 const account={units:[unit,u2],runes,artifacts:[]},options={...DEFAULT_OPTIONS,equipped:false,depth:'fast'};
 assert.equal(optimize(account,[team],options).status,'conflict');
 team.configs=[b,a];team.enemyCombatSpd=138;
 const result=optimize(account,[team],options);assert.equal(result.status,'met');
 assert.equal(result.builds.find(b=>b.unitId===1).stats.total.spd,100);
 assert.equal(result.builds.find(b=>b.unitId===1).stats.combat.spd,139);
 team.enemyCombatSpd=139;assert.equal(optimize(account,[team],options).status,'conflict');
 team.towerSpd=-1;assert.throws(()=>optimize(account,[team],options),/inválidos/);
 team.towerSpd=Infinity;assert.throws(()=>optimize(account,[team],options),/inválidos/);
});
test('ATB threshold distinguishes adjacent integer speeds without floating point drift',()=>{
 assert.equal(firstTurns([{key:'142',spd:142}])[0].tick,11);
 assert.equal(firstTurns([{key:'143',spd:143}])[0].tick,10);
 assert.equal(firstTurns([{key:'200',spd:200}])[0].atb,112);
});
test('simulated variants still share a physical rune identity in joint allocation',()=>{
 const u2={...unit,id:2};
 const account={units:[unit,u2],runes:Array.from({length:6},(_,i)=>upgradedRune({id:i+1,slot:i+1})),artifacts:[]};
 const result=optimize(account,[{id:'t',name:'T',priority:1,configs:[config(),config(u2)]}],{...DEFAULT_OPTIONS,depth:'fast',maxGrindsGems:true});
 assert.equal(result.status,'conflict');assert.equal(result.builds.length,0);
});
test('a gem does not manufacture an above-cap roll or re-enchant a native stat in place',()=>{
 const r=upgradedRune({subs:[[8,30,1,5],[4,8,0,3],[9,6,0,0],[11,8,0,0]]});
 for(const v of runeVariants(r,true))if(v.subs[0][0]===8)assert.deepEqual(v.subs[0],[8,30,1,5]);
 const native=upgradedRune();
 for(const v of runeVariants(native,true))for(let i=0;i<4;i++){
  if(v.subs[i][0]===native.subs[i][0])assert.equal(v.subs[i][2],0);
 }
});
