import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAccount,blankConfig,DEFAULT_OPTIONS,teamFromPreset} from '../src/core/data.js';
import {extractAccountPresets,firstTurns,optimize,teamTurnPreview,validateWaveClear} from '../src/core/optimizer.js';
import {CAIROS_PROFILES,makeCairosTeam,cairosWaveReport,WAVE_SKILLS} from '../src/core/cairos.js';
const unit={id:1,name:'Lushen',master:13413,element:3,level:40,base:{hp:10000,def:500,atk:1000,spd:100,cr:100,cd:100,res:15,acc:0},runeIds:[1,2,3,4,5,6],artifactIds:[10]};
const runes=Array.from({length:6},(_,i)=>({id:i+1,slot:i+1,set:1,level:15,owner:1,main:[3,100],innate:[0,0],subs:[],locked:false}));
const account={units:[unit],runes,artifacts:[{id:10,owner:1,main:[100,1500]}]};
const config=()=>({...blankConfig(unit),sets:[],basis:'total'});
test('deck extraction keeps original positions, account copies and only whitelisted metadata',()=>{
 const list={siege:[{deck_id:9,name:'Defesa',monster_ids:[2,999,1],session_key:'private'}],arena:{unit_id_list:[1,2,0,1]}};
 const presets=extractAccountPresets(list,[unit,{...unit,id:2}]);
 assert.equal(presets.length,2);assert.deepEqual(presets[0].unitIds,[2,null,1]);assert.deepEqual(presets[0].missingIds,[999]);assert.ok(!JSON.stringify(presets).includes('private'));
 const team=teamFromPreset(presets[0],{units:[unit,{...unit,id:2}]});
 assert.deepEqual(team.configs.map(c=>c.unitId),[2,null,1]);assert.equal(team.gameMode,'siege');assert.equal(team.configs[0].masterId,13413);assert.equal(team.configs[1].label,'Escolher monstro');
 assert.deepEqual(extractAccountPresets(null,[]),[]);assert.deepEqual(extractAccountPresets([{monster_ids:['garbage']}],[unit]),[]);
});
test('normalized SWEX contains accountPresets without session/social properties',()=>{
 const raw={unit_list:[{unit_id:1,unit_master_id:13413,con:100,runes:[{rune_id:1,slot_no:1,pri_eff:[3,100],sec_eff:[]}]}],runes:[],deck_list:[{deck_name:'Meu deck',monster_ids:[1,0,777],social:'private'}],session_key:'private'};
 const a=normalizeAccount(raw);assert.equal(a.accountPresets[0].name,'Meu deck');assert.deepEqual(a.accountPresets[0].unitIds,[1,null,null]);assert.ok(!JSON.stringify(a).includes('private'));
});
test('Speed Tick affects first-turn timing and invalid values fail explicitly',()=>{
 assert.equal(firstTurns([{key:'a',spd:200}],7)[0].tick,8);assert.equal(firstTurns([{key:'a',spd:200}],10)[0].tick,5);
 for(const tick of [0,-1,101,NaN])assert.throws(()=>firstTurns([{key:'a',spd:200}],tick),/Speed Tick/);
 assert.throws(()=>optimize(account,[{configs:[config()]}],{...DEFAULT_OPTIONS,speedTick:0}),/Speed Tick/);
});
test('turn preview uses equipped combat SPD, real builds and conservative enemy ties',()=>{
 const c=config(),team={configs:[c],towerSpd:15,leaderSpd:24,enemyCombatSpd:139};
 const preview=teamTurnPreview(account,team);assert.equal(preview.complete,true);assert.equal(preview.actors[0].spd,139);assert.equal(preview.cut,true);assert.equal(preview.source,'equipped');
 const build={key:c.key,unitId:1,stats:{combat:{spd:200}}};assert.equal(teamTurnPreview(account,team,{},[build]).cut,false);
 const missing=teamTurnPreview({...account,runes:runes.slice(1)},team);assert.equal(missing.complete,false);assert.equal(missing.cut,null);
});
test('Strict Mode rejects unmet numeric targets while ordinary mode reports deficits',()=>{
 const c=config();c.goals.hp=999999;const team={id:'t',configs:[c]};
 assert.equal(optimize(account,[team],{...DEFAULT_OPTIONS,depth:'fast'}).status,'approximate');
 const strict=optimize(account,[team],{...DEFAULT_OPTIONS,depth:'fast',strictMode:true});assert.equal(strict.status,'no_assignment');assert.match(strict.failures[0].reason,/Strict Mode/);
});
test('artifact switch changes optimizer stats per monster without changing global settings',()=>{
 const c=config(),team={id:'t',configs:[c]};const opts={...DEFAULT_OPTIONS,depth:'fast'};
 const on=optimize(account,[team],opts).builds[0];c.artifacts=false;const off=optimize(account,[team],opts).builds[0];
 assert.equal(on.stats.total.hp-off.stats.total.hp,1500);assert.deepEqual(on.artifactIds,[10]);assert.deepEqual(off.artifactIds,[]);assert.equal(opts.artifacts,true);
});
test('Cairos profiles have five independent slots and repeated Icarus require distinct copies',()=>{
 for(const p of CAIROS_PROFILES){assert.equal(p.members.length,5);assert.ok(p.waves[1].length&&p.waves[3].length);for(const enemies of Object.values(p.waves))for(const e of enemies)assert.ok(e.hp>0&&e.def>=0);}
 const p=CAIROS_PROFILES.find(p=>p.id==='pc10');const team=makeCairosTeam(p,{units:[{...unit,id:2,name:'Icaru',master:11031},{...unit,id:3,name:'Icaru',master:11011}]});
 assert.deepEqual(team.configs.slice(1,4).map(c=>c.unitId),[2,3,null]);assert.equal(new Set(team.configs.map(c=>c.key)).size,5);
});
test('wave damage adds ATK tower and leader on base ATK, preserves enemy stats and requires skill readiness',()=>{
 const stats={total:{atk:2000,cr:100,cd:100}},enemy={name:'Wave',hp:5000,def:1000,element:1};
 const skill={hits:3,multiplier:.68,ignoreDefense:true};
 const base=validateWaveClear(unit,stats,skill,[enemy],{towerAtk:20,leaderAtk:30,towerCd:20,variance:.9})[0];
 assert.equal(base.damage,Math.floor(2500*.68*2.2*1000/1140*.9)*3);assert.equal(base.clearInOneTurn,false);assert.equal(base.def,1000);
 const ready=validateWaveClear(unit,stats,skill,[{...enemy,hp:1}],{skillReady:true})[0];assert.equal(ready.clearInOneTurn,true);
 const buff=validateWaveClear(unit,stats,skill,[enemy],{attackBuff:50})[0];const plain=validateWaveClear(unit,stats,skill,[enemy])[0];assert.ok(buff.damage>plain.damage);
 assert.throws(()=>validateWaveClear(unit,stats,skill,[enemy],{towerAtk:-1}),/inválido/);assert.throws(()=>validateWaveClear(unit,stats,skill,[{...enemy,hp:0}]),/inválidos/);
});
test('wave estimates avoid guaranteed criticals with insufficient CR or elemental disadvantage',()=>{
 const stats={total:{atk:2000,cr:99,cd:200}},skill=WAVE_SKILLS[13413],enemy={hp:10000,def:600,element:5};
 const normal=validateWaveClear(unit,stats,skill,[enemy])[0];assert.equal(normal.guaranteedCrit,false);
 const advantage=validateWaveClear(unit,stats,skill,[{...enemy,element:1}])[0];assert.equal(advantage.guaranteedCrit,true);assert.ok(advantage.damage>normal.damage);
 const disadvantage=validateWaveClear(unit,{total:{...stats.total,cr:100}},skill,[{...enemy,element:2}])[0];assert.equal(disadvantage.guaranteedCrit,false);assert.equal(disadvantage.disadvantage,true);assert.ok(disadvantage.damage<normal.damage);
});
test('wave reports validate supported skills and Julie full HP and skill-up assumptions',()=>{
 const p=CAIROS_PROFILES[1],build={key:'a',unitId:1,stats:{total:{atk:2000,cr:100,cd:100}}};
 const report=cairosWaveReport(account,[build],'a',p,{});assert.equal(report.waves.length,2);assert.equal(report.attacker,'Lushen');assert.ok(report.waves[0].enemies.every(e=>!e.clearInOneTurn));
 const julie={...unit,master:13911,name:'Julie'};
 assert.throws(()=>cairosWaveReport({...account,units:[julie]},[build],'a',p,{fullHp:false}),/HP cheio/);
 assert.throws(()=>cairosWaveReport({...account,units:[julie]},[build],'a',p,{fullHp:true,skillUps:30}),/máximo 15/);
 assert.throws(()=>cairosWaveReport({...account,units:[{...unit,master:14513}]},[build],'a',p,{}),/disponível/);
});
