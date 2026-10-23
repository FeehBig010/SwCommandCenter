import test from 'node:test';
import assert from 'node:assert/strict';
import {monsterImageSources,resolveMonsterImageSources} from '../src/core/monsters.js';
import {LOCAL_MONSTER_ROOT,LOCAL_MONSTER_MANIFEST,localMonsterImage,localGameImage} from '../src/core/monster-assets.js';
test('all known monster sources prefer the sparse local checkout while preserving CDN alternatives',()=>{
 assert.equal(localGameImage('skills','skill_test.png'),'/assets/imagens_sw/herders/static/herders/images/skills/skill_test.png');assert.equal(localGameImage('../','skill_test.png'),null);
 const sources=monsterImageSources(19614);assert.equal(sources[0],`${LOCAL_MONSTER_ROOT}unit_icon_0035_3_0.png`);assert.ok(sources.some(s=>s.startsWith('https://swarfarm.com/')));
 for(const unsafe of ['../test.png','..png','https://other.test/file.png','bad/file.png','bad.svg','<script>.png'])assert.equal(localMonsterImage(unsafe),null);assert.equal(localMonsterImage('unit_icon_test.png'),`${LOCAL_MONSTER_ROOT}unit_icon_test.png`);
});
test('a shared local manifest resolves new IDs and changed filenames without contacting the remote API',async()=>{
 const calls=[],fetcher=async(url,options)=>{calls.push({url,options});assert.equal(url,LOCAL_MONSTER_MANIFEST);return {ok:true,json:async()=>({version:1,monsters:{99991:'unit_icon_new_a.png',99992:'unit_icon_new_b.png',19614:'unit_icon_changed.png'}})};};
 const [a,b,c]=await Promise.all([resolveMonsterImageSources(99991,{fetcher}),resolveMonsterImageSources(99992,{fetcher}),resolveMonsterImageSources(19614,{fetcher})]);assert.equal(calls.length,1);assert.equal(calls[0].options.cache,'no-store');assert.equal(a[0],`${LOCAL_MONSTER_ROOT}unit_icon_new_a.png`);assert.equal(b[0],`${LOCAL_MONSTER_ROOT}unit_icon_new_b.png`);assert.equal(c[0],`${LOCAL_MONSTER_ROOT}unit_icon_changed.png`);assert.deepEqual(monsterImageSources(99991),a);
});
test('offline local manifests preserve bundled sources, and unknown units still use the existing API fallback',async()=>{
 const calls=[],fetcher=async url=>{calls.push(url);return url===LOCAL_MONSTER_MANIFEST?{ok:false}:{ok:true,json:async()=>({results:[{com2us_id:99993,image_filename:'unit_icon_api.png'}]})};};const known=await resolveMonsterImageSources(19615,{fetcher});assert.ok(known.length>0);assert.equal(calls.length,1);const newer=await resolveMonsterImageSources(99993,{fetcher});assert.equal(calls.length,2);assert.equal(newer[0],`${LOCAL_MONSTER_ROOT}unit_icon_api.png`);
});
