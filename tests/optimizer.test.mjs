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
