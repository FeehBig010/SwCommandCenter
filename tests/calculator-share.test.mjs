import test from 'node:test';
import assert from 'node:assert/strict';
import {quickTeam,quickConfig} from '../src/core/quick-calculator.js';
import {catalogLeader} from '../src/core/leader-catalog.js';
const share=await import('../src/core/calculator-share.js').catch(()=>({}));
function fixture(mode='siege'){
 const team=quickTeam(mode);team.configs=team.configs.map((c,i)=>({...quickConfig(i?18913:15713,'SECRET_LABEL'),key:`PRIVATE_KEY_${i}`,manual:{...quickConfig(i?18913:15713).manual,sheet:{...quickConfig(i?18913:15713).manual.sheet,spd:220+i}},sets:[3,15],unitId:91827364,firstTurnSkillSlot:3,firstTurnSkillLevel:2,skillupProfile:'bernard-2a-reference',skillBoostBonus:4,combat:{speedBuff:true,artifactSpdBuff:12}}));
 return {...team,name:'SECRET_TEAM',accountId:'SECRET_ACCOUNT',notes:'SECRET_NOTES',leader:catalogLeader(15713),leaderIndex:0,leaderKey:'PRIVATE_KEY_0',towerSpd:10,guildSpd:5,customTowerSpd:true,inputTick:7,gamePlacement:team.configs.map((_,i)=>team.configs.length-1-i),combatScenario:{enemies:[{master:16613,label:'SECRET_ENEMY',spd:250,combat:{hpPercent:70}}],events:[{afterKey:'PRIVATE_KEY_0',type:'boost',targets:[`ally:${team.configs.length-1}`],amount:30}]},plannedRunes:{secret:'SECRET_RUNES'},configs:team.configs};
}
test('share roundtrip retains portable math and creates fresh canonical manual teams',()=>{
 assert.equal(typeof share.encodeCalculatorShare,'function');
 for(const mode of ['siege','arena','rta','cairos','dimensional','toa','rift','solo']){
  const original=fixture(mode),before=structuredClone(original),payload=share.encodeCalculatorShare(original);assert.match(payload,/^[A-Za-z0-9_-]+$/);
  const result=share.decodeCalculatorShare(payload),again=share.decodeCalculatorShare(payload);
  assert.equal(result.gameMode,mode);assert.equal(result.configs.length,original.configs.length);assert.equal(result.configs[0].manual.sheet.spd,220);assert.equal(result.configs[0].combat.artifactSpdBuff,12);assert.deepEqual(result.gamePlacement,original.gamePlacement.map(i=>result.configs[i].key));
  assert.equal(result.leaderKey,result.configs[0].key);assert.deepEqual(result.leader,original.leader);assert.notEqual(result.configs[0].key,again.configs[0].key);assert.notEqual(result.id,again.id);assert.equal(result.configs[0].unitId,null);assert.equal(result.configs[0].firstTurnSkillLevel,2);assert.equal(result.combatScenario.events[0].afterKey,'ally:0');assert.equal(result.configs[0].label,'Seara');assert.deepEqual(original,before);
 }
});
test('whitelist strips nested private values and reconstructs enemy labels',()=>{
 const team=fixture();team.configs[0].combat.credentials={token:'SECRET_CREDENTIAL'};team.configs[0].manual.sheet.private='SECRET_PRIVATE';team.enemyReference={masterId:18913,label:'SECRET_REF',baseSpd:96,runeSpd:150,swift:true,leaderSpd:24,artifactSpd:5};
 const payload=share.encodeCalculatorShare(team),json=Buffer.from(payload,'base64url').toString();
 for(const secret of ['SECRET_','PRIVATE_KEY','91827364','unitId','accountId','plannedRunes','leaderKey'])assert.equal(json.includes(secret),false,secret);
 const decoded=share.decodeCalculatorShare(payload);assert.equal(decoded.enemyReference.label,'Tiana');assert.equal(decoded.combatScenario.enemies[0].label,'Leo');assert.equal(decoded.sourceAccountId,undefined);
});
test('partial slots preserve original ally indexes and reject malformed or excessive payloads',()=>{
 const team=fixture();team.configs[1]=quickConfig();team.configs[1].enabled=false;
 assert.equal(share.decodeCalculatorShare(share.encodeCalculatorShare(team)).combatScenario.events[0].targets[0],'ally:2');
 for(const value of ['', 'not+url', 'a'.repeat(32769),Buffer.from('{').toString('base64url'),Buffer.from('{"version":99}').toString('base64url')])assert.throws(()=>share.decodeCalculatorShare(value));
 const bad=fn=>{const value=fixture();fn(value);assert.throws(()=>share.encodeCalculatorShare(value));};
 bad(t=>t.gameMode='unknown');bad(t=>t.configs[0].masterId=999999);bad(t=>t.configs[0].manual.sheet.spd=Infinity);bad(t=>t.configs[0].manual.sheet.spd=-1);bad(t=>t.leaderIndex=99);bad(t=>t.combatScenario.events[0].afterKey='secret-key');bad(t=>t.combatScenario.events=Array(21).fill(t.combatScenario.events[0]));bad(t=>t.combatScenario.enemies=Array(6).fill(t.combatScenario.enemies[0]));bad(t=>t.gamePlacement=[0,0,1]);bad(t=>t.inputTick=0);bad(t=>t.configs[0].firstTurnSkillLevel=100);
});
test('empty slots and anonymous numeric enemies remain portable without invented identities',()=>{
 const team=quickTeam();team.configs[0]=quickConfig(15713,'private');team.combatScenario={enemies:[{master:0,label:'Private enemy',spd:300}],events:[{afterKey:'ally:0',type:'reduce',targets:['enemy:0'],amount:20}]};
 const result=share.decodeCalculatorShare(share.encodeCalculatorShare(team));assert.equal(result.configs[1].masterId,null);assert.equal(result.configs[1].enabled,false);assert.equal(result.combatScenario.enemies[0].master,0);assert.equal(result.combatScenario.enemies[0].label,'Inimigo');
});
test('decoder validates tampered numeric, identity, event and leader fields rather than trusting version',()=>{
 const document=JSON.parse(Buffer.from(share.encodeCalculatorShare(fixture()),'base64url').toString());
 for(const mutate of [d=>d.team.configs[0].masterId=999999,d=>d.team.configs[0].manual.sheet.spd='Infinity',d=>d.team.configs[0].combat.hpPercent=-1,d=>d.team.leaderMasterId=18913,d=>d.team.combatScenario.events[0].targets=['enemy:9'],d=>d.team.combatScenario.events[0].type='__proto__',d=>d.team.configs=Array(9).fill(d.team.configs[0])]){const copy=structuredClone(document);mutate(copy);assert.throws(()=>share.decodeCalculatorShare(Buffer.from(JSON.stringify(copy)).toString('base64url')));}
 const copy=structuredClone(document);copy.team.configs[0].token='SECRET';copy.team.configs[0].manual.base.notes='SECRET';copy.team.accountId='SECRET';assert.equal(JSON.stringify(share.decodeCalculatorShare(Buffer.from(JSON.stringify(copy)).toString('base64url'))).includes('SECRET'),false);
});
test('new near-tie policy and physical placement survive with fresh keys',()=>{const t=quickTeam('siege');t.includePartial=true;t.referencePolicy='near-tie';t.gamePlacement=[...t.configs].reverse().map(c=>c.key);const loaded=share.decodeCalculatorShare(share.encodeCalculatorShare(t));assert.equal(loaded.referencePolicy,'near-tie');assert.deepEqual(loaded.gamePlacement,[...loaded.configs].reverse().map(c=>c.key));});
test('sharing a snapshot preserves tower and guild bonuses without importing private equipment',async()=>{const {quickPreview}=await import('../src/core/quick-calculator.js');const t=fixture();t.speedMode='snapshot';t.customTowerSpd=false;t.towerSpd=0;t.guildSpd=5;t.combatScenario={enemies:[],events:[]};const before=quickPreview(t,{includeReference:false}).actors.map(a=>a.spd);const loaded=share.decodeCalculatorShare(share.encodeCalculatorShare(t));assert.deepEqual(quickPreview(loaded,{includeReference:false}).actors.map(a=>a.spd),before);assert.equal(loaded.plannedRunes,undefined);});
test('share URL never forwards query credentials or unrelated account parameters',()=>{assert.equal(typeof share.calculatorShareUrl,'function');const url=share.calculatorShareUrl(quickTeam('siege'),'https://alice:secret@example.com/app?code=SECRET&account=PRIVATE#/quick');const parsed=new URL(url);assert.equal(parsed.username,'');assert.equal(parsed.password,'');assert.deepEqual([...parsed.searchParams.keys()],['calc']);assert.equal(parsed.hash,'#/quick');assert.ok(!url.includes('SECRET')&&!url.includes('PRIVATE')&&!url.includes('secret'));assert.throws(()=>share.calculatorShareUrl(quickTeam(),'javascript:alert(1)'));});
