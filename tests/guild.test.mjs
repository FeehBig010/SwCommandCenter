import test from 'node:test';
import assert from 'node:assert/strict';
import { bindTemplate, cleanTemplate, newTemplate, parseTemplateFile, templateDraft, templateFile, templateMissing, TEMPLATE_TYPE } from '../src/core/guild.js';
import { DEFAULT_OPTIONS } from '../src/core/data.js';
import { optimize } from '../src/core/optimizer.js';
import { monsterImageSources } from '../src/core/monsters.js';

function template(){
 const draft=newTemplate();draft.name='Defesa da liderança';
 draft.team.configs.forEach((c,i)=>Object.assign(c,{masterId:[19614,28515,28212][i],label:['Molly','Vritra','Solveig'][i],sets:[],goals:{...c.goals,hp:23500,spd:114},basis:'total'}));
 return cleanTemplate(draft);
}
function account(){return {id:'private',units:[19614,28515,28212].map((master,i)=>({id:i+1,master,name:['Molly','Vritra','Solveig'][i],level:40,base:{hp:10000,atk:600,def:500,spd:100,cr:15,cd:50,res:15,acc:0},runeIds:[],artifactIds:[]})),runes:Array.from({length:18},(_,i)=>({id:i+1,slot:i%6+1,set:13,level:15,main:[2,20],innate:[0,0],subs:[],owner:0})),artifacts:[]};}

test('template export is a portable whitelist with no account IDs, inventory or result data',()=>{
 const t=template();t.privateAccount='secret';t.team.configs[0].unitId=981;t.team.configs[0].runes=['private'];
 const file=templateFile([t]);assert.equal(file.type,TEMPLATE_TYPE);assert.equal(file.version,1);
 const body=JSON.stringify(file);assert.ok(!body.includes('private'));assert.ok(!body.includes('unitId'));assert.ok(!body.includes('runes'));
 const imported=parseTemplateFile(JSON.parse(body));assert.notEqual(imported[0].id,t.id);assert.deepEqual(imported[0].team,cleanTemplate(t).team);
});
test('templates reject incompatible files and invalid compositions before importing anything',()=>{
 const t=template();
 for(const raw of [{type:'d8stino-plan',version:1,templates:[t]},{type:TEMPLATE_TYPE,version:2,templates:[t]},{type:TEMPLATE_TYPE,version:1,templates:[]},{type:TEMPLATE_TYPE,version:1,templates:Array(101).fill(t)}])assert.throws(()=>parseTemplateFile(raw),/Template inválido/);
 const bad=structuredClone(t);bad.team.configs.pop();assert.throws(()=>parseTemplateFile({type:TEMPLATE_TYPE,version:1,templates:[t,bad]}),/três monstros/);
});
test('template validation enforces sets, valid slot mains, finite targets and selected monsters',()=>{
 for(const mutate of [t=>t.team.configs[0].sets=[13,3],t=>t.team.configs[0].sets=[25],t=>t.team.configs[0].sets=['bad'],t=>t.team.configs[0].sets=[true],t=>t.team.configs[0].goals=[],t=>t.team.configs[0].mains=null,t=>t.team.configs[0].basis='invalid',t=>t.team.configs[0].mains[2]=9,t=>t.team.configs[0].goals.hp=-1,t=>t.team.configs[0].goals.spd=Infinity,t=>t.team.configs[0].masterId=null,t=>t.name='',t=>t.description='x'.repeat(1001),t=>t.team.leaderSpd=101]){
  const t=template();mutate(t);assert.throws(()=>cleanTemplate(t),/Template inválido/);
 }
 const t=template();t.team.configs[0].sets=[1,1,1];assert.deepEqual(cleanTemplate(t).team.configs[0].sets,[1,1,1]);
});
test('binding matches exact monster master IDs, preserves requirements and never mutates the template',()=>{
 const t=template(),before=structuredClone(t),a=account();a.units.push({...a.units[0],id:4,master:19615,name:'Molly',level:50});
 const team=bindTemplate(t,a);assert.deepEqual(team.configs.map(c=>c.unitId),[1,2,3]);assert.equal(team.gameMode,'siege');
 assert.equal(new Set(team.configs.map(c=>c.key)).size,3);assert.deepEqual(team.configs[0].goals,t.team.configs[0].goals);assert.deepEqual(t,before);
});
test('duplicate template monsters use distinct copies; missing copies are reported rather than substituted',()=>{
 const t=template();t.team.configs[1]={...t.team.configs[0]};const a=account();
 const missing=bindTemplate(t,a);assert.deepEqual(templateMissing(missing),['Molly']);
 a.units.push({...a.units[0],id:4,level:35});const bound=bindTemplate(t,a);
 assert.deepEqual(bound.configs.map(c=>c.unitId),[1,4,3]);assert.deepEqual(templateMissing(bound),[]);
 assert.equal(templateMissing(bindTemplate(t,null)).length,3);
});
test('editing drafts gets independent keys without changing portable template requirements',()=>{
 const t=template(),draft=templateDraft(t);assert.equal(new Set(draft.team.configs.map(c=>c.key)).size,3);
 draft.team.configs[0].goals.hp=30000;assert.equal(t.team.configs[0].goals.hp,23500);
 assert.equal(cleanTemplate(draft).team.configs[0].goals.hp,30000);
});
test('joint template matching reports exact numeric deficits without reusing member runes',()=>{
 const a=account(),t=template(),before=structuredClone(a);
 const result=optimize(a,[bindTemplate(t,a)],{...DEFAULT_OPTIONS,depth:'fast',maxGrindsGems:false});
 assert.equal(result.status,'approximate');assert.equal(result.builds.length,3);
 for(const b of result.builds){assert.equal(b.goals.find(g=>g.key==='spd').missing,14);assert.equal(b.goals.find(g=>g.key==='hp').missing,1500);}
 const ids=result.builds.flatMap(b=>b.runeIds);assert.equal(new Set(ids).size,18);assert.deepEqual(a,before);
 const reserved=optimize(a,[bindTemplate(t,a)],{...DEFAULT_OPTIONS,depth:'fast'},undefined,[1]);
 assert.equal(reserved.status,'conflict');assert.equal(reserved.builds.length,0);
});
test('matching reports a successful team when all leadership targets are met',()=>{
 const t=template();t.team.configs.forEach(c=>{c.goals.hp=20000;c.goals.spd=100;});
 const result=optimize(account(),[bindTemplate(t,account())],{...DEFAULT_OPTIONS,depth:'fast'});
 assert.equal(result.status,'met');assert.ok(result.builds.every(b=>b.goals.every(g=>g.met)));
});
test('monster thumbnail sources use the real SWARFARM filename, with a public asset fallback',()=>{
 const sources=monsterImageSources(19614);
 assert.equal(sources[0],'/assets/imagens_sw/herders/static/herders/images/monsters/unit_icon_0035_3_0.png');
 assert.ok(sources.includes('https://swarfarm.com/static/herders/images/monsters/unit_icon_0035_3_0.png'));
 assert.ok(sources.some(source=>/^https:\/\/raw.githubusercontent.com\/swarfarm\/swarfarm\/master\/herders\/static\/herders\/images\/monsters\/unit_icon_/.test(source)));
 assert.deepEqual(monsterImageSources('bad'),[]);
});
