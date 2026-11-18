import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../src/core/quick-calculator.js';
const {quickConfig,quickTeam}=core;

test('only Bernard 2A has validated 30/31.5/34.5 ATB skillup progression',async()=>{
 const {resolvedQuickSkill}=await import('../src/core/quick-skill-effects.js').catch(()=>({}));
 assert.equal(typeof resolvedQuickSkill,'function');
 for(const [level,boost] of [[1,30],[2,31.5],[3,34.5]]){
  assert.equal(resolvedQuickSkill({...quickConfig(11533),firstTurnSkillLevel:level}).boost,boost);
  assert.equal(resolvedQuickSkill({...quickConfig(11513),firstTurnSkillLevel:level}).boost,30);
 }
 const owned={...quickConfig(11533),skillLevels:[{slot:3,level:2}]};assert.equal(resolvedQuickSkill(owned).boost,31.5);
 const comparison=resolvedQuickSkill({...quickConfig(11513),firstTurnSkillLevel:3,skillupProfile:'bernard-2a-reference'});
 assert.equal(comparison.boost,34.5);assert.equal(comparison.hypothetical,true);
 assert.equal(resolvedQuickSkill({...quickConfig(18913),firstTurnSkillLevel:3,skillBoostBonus:15}).boost,30);
});

test('level update removes legacy additive bonus and rejects levels outside skill metadata',async()=>{
 const {resolvedQuickSkill}=await import('../src/core/quick-skill-effects.js').catch(()=>({}));
 assert.equal(typeof resolvedQuickSkill,'function');
 const t=quickTeam();t.configs[0]={...quickConfig(11533),skillBoostBonus:15};
 assert.equal(typeof core.updateQuickSkillLevel,'function');
 const out=core.updateQuickSkillLevel(t,t.configs[0].key,3);
 assert.equal(out.configs[0].skillBoostBonus,0);assert.equal(resolvedQuickSkill(out.configs[0]).boost,34.5);
 assert.throws(()=>core.updateQuickSkillLevel(t,t.configs[0].key,4),/nível|Nível/i);
 assert.equal(t.configs[0].skillBoostBonus,15);
});
