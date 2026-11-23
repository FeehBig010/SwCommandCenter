import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBuildLabRequest,prepareBuildLabTeam,resolveBuildLabProtection,resultProtectionConflicts} from '../src/core/build-lab-request.js';
import {canonicalMonsterId} from '../src/core/CollabMapping.js';

test('recognizes the three Siege aliases and extracts explicit battle targets',()=>{
 const value=parseBuildLabRequest('Monte Pure Vanilla Cookie, Mihyang líder e Ciri. Maior dano sem corte. Preservando o Deck 17. Alvo 230 SPD e 1200 DEF.');
 assert.equal(value.kind,'siege-first-rotation');
 assert.equal(value.protectDeck,17);
 assert.equal(value.targetSpd,230);
 assert.equal(value.targetDef,1200);
 assert.equal(value.requireNoCut,true);
 assert.equal(canonicalMonsterId(26311),26811);
});
test('does not invent enemy DEF or accept unsupported generic teams',()=>{
 const request=parseBuildLabRequest('Adriana, Mihyang e Rigna, alvo 280 SPD');
 assert.equal(request.targetDef,null);
 assert.throws(()=>parseBuildLabRequest('Lushen, Galleon e Tiana, 230 SPD e 1200 DEF'),/Neste MVP/);
});
test('recognizes defense buff disabled without overriding the SWEX',()=>{
 const value=parseBuildLabRequest('Adriana, Mihyang, Rigna, alvo 230 SPD, 1200 DEF, sem buff de DEF');
 assert.equal(value.defenseBuff,false);
});
const unit=(id,master,name)=>({id,master,name,level:40,artifactIds:[]});
const account={
 units:[unit(100,26311,'Pure Vanilla Cookie'),unit(101,18311,'Mihyang'),unit(102,29711,'Rigna')],
 accountPresets:[{id:'s17',name:'Deck 17',gameMode:'siege',equipment:[{unitId:900,runeIds:[1,2,3,4,5,6],artifactIds:[20,21]}]}],
};
test('creates an independent Siege team without mutating account or existing teams',()=>{
 const before=JSON.stringify(account);
 const resolved=prepareBuildLabTeam(account,[],parseBuildLabRequest('Adriana, Mihyang e Rigna'));
 assert.equal(resolved.reused,false);
 assert.equal(resolved.team.gameMode,'siege');
 assert.equal(resolved.team.leaderIndex,1);
 assert.deepEqual(resolved.team.configs.map(c=>c.unitId),[100,101,102]);
 assert.equal(JSON.stringify(account),before);
});
test('protects Deck 17 equipment and rejects missing or ambiguous presets',()=>{
 const team=prepareBuildLabTeam(account,[],parseBuildLabRequest('Adriana, Mihyang e Rigna')).team;
 const protectedSet=resolveBuildLabProtection(account,team,17);
 assert.equal(protectedSet.preset.name,'Deck 17');
 assert.deepEqual(protectedSet.runeIds,[1,2,3,4,5,6]);
 assert.deepEqual(protectedSet.artifactIds,[20,21]);
 assert.throws(()=>resolveBuildLabProtection(account,team,56),/não foi localizado/);
});
test('flags a current or alternate build when it shares protected runes',()=>{
 const report={alternatives:[{kind:'current',builds:[{runeIds:[1,8],artifactIds:[]}]},{kind:'damage',builds:[{runeIds:[7,8],artifactIds:[22]}]}]};
 const conflicts=resultProtectionConflicts(report,{runeIds:[1,2],artifactIds:[20]});
 assert.deepEqual(conflicts[0].runeIds,[1]);
 assert.deepEqual(conflicts[1].runeIds,[]);
});
