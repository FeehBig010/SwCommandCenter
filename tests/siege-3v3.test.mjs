import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures/siege-rotation.mjs';
import * as feature from '../src/core/siege-3v3.js';
import {normalizeArtifactSubstats} from '../src/core/artifacts.js';
import {skillLevels} from '../src/core/skill-levels.js';

const defenders=()=>[18311,13911,18311].map((master,i)=>({master,spd:[230,170,160][i],hp:1000,def:1000,mode:'none',defenseBuff:i===0,required:i===0}));
const run=(patch={})=>{const {account,team}=fixture();return feature.validateSiege3v3(account,team,{defenders:defenders(),...patch});};

test('3v3 yields six actors, explicit targets and both strip timelines',()=>{
 const result=run({attackTargets:{M:0,R:0},ignorePercent:50});
 const report=result.reports[0],branch=report.branches[0];
 assert.equal(report.status,'READY');
 assert.equal(new Set(branch.turns.map(t=>t.key)).size,6);
 assert.equal(branch.targets[0].outcome,'reaches');
 assert.deepEqual(branch.targets.slice(1).map(t=>t.range),[[0,0],[0,0]]);
 assert.ok(report.branches[1].events.some(e=>e.type==='boost'&&e.amount===15));
});

test('cut, unknown early effect, incomplete input, artifact SPD and modeled passive are distinguished',()=>{
 const d=defenders();d[2]={...d[2],spd:230,combat:{speedBuff:true,artifactSpdBuff:20}};
 assert.equal(run({defenders:d,attackTargets:{M:0,R:0}}).reports[0].status,'BLOCKED');
 d[2].mode='unknown';
 assert.equal(run({defenders:d}).reports[0].status,'REVIEW REQUIRED');
 assert.equal(run({defenders:d.slice(0,2)}).status,'REVIEW REQUIRED');
 const leo=defenders();leo[1]={...leo[1],master:16613,spd:220,mode:'leo_attack',target:'ally:0'};
 const report=run({defenders:leo}).reports[0];
 assert.ok(report.branches[0].events.some(e=>e.type==='reduce'&&e.source==='enemy:1'));
});

test('protected preset blocks conflicting equipment and branch-dependent damage is conditional',()=>{
 const {account,team}=fixture();
 account.accountPresets=[{id:'protected',name:'Defesa fixa',unitIds:[91],equipment:[{unitId:91,runeIds:[1],artifactIds:[101]}]}];
 const raw={defenders:defenders(),protectedPresets:['protected']};
 const before=structuredClone({account,team});
 const result=feature.validateSiege3v3(account,team,raw);
 assert.equal(result.reports[0].status,'BLOCKED');
 assert.equal(result.reports[0].conflicts.length,2);
 assert.deepEqual({account,team},before);
 const d=defenders();d[0].hp=7000;
 assert.equal(run({defenders:d,ignorePercent:50}).reports[0].status,'CONDITIONAL');
});

test('real export tuple skills and artifact subeffects are retained',()=>{
 assert.deepEqual(skillLevels([[16101,7],[16106,5],[16111,2]]),[{slot:1,level:7},{slot:2,level:5},{slot:3,level:2}]);
 assert.equal(normalizeArtifactSubstats({sec_effects:[[206,5,0,0,0]]})[0].key,'spdBuff');
});

test('a damage-triggered passive is flagged even when the defender is slower',()=>{
 const d=defenders();d[2].master=16615;
 assert.equal(run({defenders:d,ignorePercent:50}).reports[0].status,'REVIEW REQUIRED');
});

test('an elimination requiring the supplied ignore DEF remains conditional',()=>{
 const d=defenders();d[0].hp=8000;d[0].defenseBuff=false;
 const report=run({defenders:d,ignorePercent:100}).reports[0];
 assert.equal(report.status,'CONDITIONAL');
 assert.equal(report.branches[0].targets[0].ignoreDependency,true);
});
