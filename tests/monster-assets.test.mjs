import test from 'node:test';
import assert from 'node:assert/strict';
import {monsterImageSources,resolveMonsterImageSources} from '../src/core/monsters.js';
import {LOCAL_MONSTER_ROOT,LOCAL_MONSTER_MANIFEST,localMonsterImage,localGameImage} from '../src/core/monster-assets.js';
import {MONSTER_IMAGE_INDEX_URL,COMMUNITY_MONSTER_CDN,SWARFARM_MONSTER_CDN,readPortraitIndex,parseCommunityPortraitIndex} from '../src/core/monster-image-index.js';
test('all known monster sources prefer the sparse local checkout while preserving CDN alternatives',()=>{
 assert.equal(localGameImage('skills','skill_test.png'),'/assets/imagens_sw/herders/static/herders/images/skills/skill_test.png');assert.equal(localGameImage('../','skill_test.png'),null);
 const sources=monsterImageSources(19614);assert.equal(sources[0],`${LOCAL_MONSTER_ROOT}unit_icon_0035_3_0.png`);assert.ok(sources.some(s=>s.startsWith('https://swarfarm.com/')));
 for(const unsafe of ['../test.png','..png','https://other.test/file.png','bad/file.png','bad.svg','<script>.png'])assert.equal(localMonsterImage(unsafe),null);assert.equal(localMonsterImage('unit_icon_test.png'),`${LOCAL_MONSTER_ROOT}unit_icon_test.png`);
});
test('a shared local manifest resolves new IDs and changed filenames without contacting the remote API',async()=>{
 const calls=[],fetcher=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url===MONSTER_IMAGE_INDEX_URL?{}:{version:1,monsters:{99991:'unit_icon_new_a.png',99992:'unit_icon_new_b.png',19614:'unit_icon_changed.png'}}};};
 const [a,b,c]=await Promise.all([resolveMonsterImageSources(99991,{fetcher}),resolveMonsterImageSources(99992,{fetcher}),resolveMonsterImageSources(19614,{fetcher})]);assert.equal(calls.length,2);assert.equal(calls[0].options.cache,'no-cache');assert.equal(a[0],`${LOCAL_MONSTER_ROOT}unit_icon_new_a.png`);assert.equal(b[0],`${LOCAL_MONSTER_ROOT}unit_icon_new_b.png`);assert.equal(c[0],`${LOCAL_MONSTER_ROOT}unit_icon_changed.png`);assert.deepEqual(monsterImageSources(99991),a);
});
test('offline local manifests preserve bundled sources, and unknown units still use the existing API fallback',async()=>{
 const calls=[],fetcher=async url=>{calls.push(url);return url===LOCAL_MONSTER_MANIFEST?{ok:false}:{ok:true,json:async()=>({results:[{com2us_id:99993,image_filename:'unit_icon_api.png'}]})};};const known=await resolveMonsterImageSources(19615,{fetcher});assert.ok(known.length>0);assert.equal(calls.length,2);const newer=await resolveMonsterImageSources(99993,{fetcher});assert.equal(calls.length,3);assert.equal(newer[0],`${SWARFARM_MONSTER_CDN}unit_icon_api.png`);
});
test('compound names normalize accents/parentheses and explicit collaboration aliases resolve actual filenames',async()=>{
 const {monsterSlug,portraitNameKeys}=await import('../src/core/monster-assets.js');assert.equal(monsterSlug('Magic Order Swordsinger (Água)'),'magic_order_swordsinger_water');assert.ok(portraitNameKeys('Magic Order Swordsinger (Água)',1).includes('magic_order_swordsinger_water'));assert.deepEqual(portraitNameKeys('',1),[]);assert.deepEqual(monsterImageSources(null,{name:'CHUN-LI (Água)',element:1}),monsterImageSources(24911));
});
test('Portuguese element suffixes produce English filenames before slugification',async()=>{
 const {monsterSlug}=await import('../src/core/monster-assets.js');
 for(const [pt,en] of [['Água','water'],['Fogo','fire'],['Vento','wind'],['Luz','light'],['Escuridão','dark'],['Trevas','dark']]){
  assert.equal(monsterSlug(`Hellhound (${pt})`),`hellhound_${en}`);
  assert.equal(monsterImageSources(null,{name:`Hellhound (${pt})`})[0],`${LOCAL_MONSTER_ROOT}hellhound_${en}.png`);
 }
 assert.equal(monsterSlug('  Hellhound ( ÁGUA )  '),'hellhound_water');
});
test('collaboration portraits always use originals by ID and localized name without changing the element',async()=>{
 const {collabPortraitTarget}=await import('../src/core/collab-mapping.js');
 for(const [source,target] of [[26311,26811],[26313,26813],[24012,24512],[24415,24915],[27411,27911]])assert.deepEqual(monsterImageSources(source),monsterImageSources(target));
 assert.deepEqual(monsterImageSources(null,{name:'Pure Vanilla Cookie'}),monsterImageSources(26811));
 assert.deepEqual(monsterImageSources(null,{name:'Pure Vanilla Cookie (Fogo)'}),monsterImageSources(26812));
 assert.deepEqual(monsterImageSources(null,{name:'Pure Vanilla Cookie',element:3}),monsterImageSources(26813));
 assert.deepEqual(monsterImageSources(99971,{name:'Magic Order Swordsinger (Água)'}),monsterImageSources(25201));
 assert.equal(collabPortraitTarget(19614,'Molly',4),null);
 const calls=[],fetcher=async url=>{calls.push(url);return {ok:true,json:async()=>url===MONSTER_IMAGE_INDEX_URL?{}:{version:1,monsters:{26314:'unit_icon_collab_should_not_render.png',26814:'unit_icon_original_light.png'}}};};
 const resolved=await resolveMonsterImageSources(26314,{name:'Pure Vanilla Cookie (Luz)',fetcher});assert.equal(resolved[0],`${LOCAL_MONSTER_ROOT}unit_icon_original_light.png`);assert.deepEqual(calls,[LOCAL_MONSTER_MANIFEST,MONSTER_IMAGE_INDEX_URL]);
 assert.deepEqual(monsterImageSources(29211,{name:'Geralt'}),monsterImageSources(29611));
});
test('new collaboration API portraits use a verified CDN filename if the local mirror does not contain it yet',async()=>{
 const urls=[],fetcher=async(url,opts)=>{urls.push({url,opts});if(url===LOCAL_MONSTER_MANIFEST)return {ok:true,json:async()=>({version:1,monsters:{},names:{}})};return {ok:true,json:async()=>({results:[{com2us_id:99994,image_filename:'unit_icon_recent_collab.png'}]})};};const sources=await resolveMonsterImageSources(99994,{name:'Collab (Luz)',element:4,fetcher});assert.equal(sources[0],'https://swarfarm.com/static/herders/images/monsters/unit_icon_recent_collab.png');assert.equal(urls.length,3);assert.ok(!urls.some(r=>r.opts?.method==='HEAD'));
});
test('one dynamic image index refreshes classics, recent families and unknown future IDs before stale local data',async()=>{
 const ids=[17111,18011,28911,28912,28913,28914,28915,30912,32911,99961],calls=[];
 const fresh=Object.fromEntries(ids.map(id=>[id,`unit_icon_current_${id}.png`]));
 const fetcher=async url=>{calls.push(url);return {ok:true,json:async()=>url===MONSTER_IMAGE_INDEX_URL?fresh:{version:1,monsters:Object.fromEntries(ids.map(id=>[id,`unit_icon_stale_${id}.png`]))}};};
 const results=await Promise.all(ids.map(id=>resolveMonsterImageSources(id,{fetcher})));
 assert.equal(calls.length,2);results.forEach((sources,i)=>assert.equal(sources[0],`${COMMUNITY_MONSTER_CDN}${fresh[ids[i]]}`));
});
test('updated static image index covers every elemental variant of the recent families and correct classics',async()=>{
 const {default:images}=await import('../src/core/monster-images.json',{with:{type:'json'}});
 assert.ok(Object.keys(images).length>=3070);
 for(const [family,icon] of [[289,'0133'],[309,'0166'],[329,'0181']])for(let element=1;element<=5;element++)assert.equal(images[family*100+10+element],`unit_icon_${icon}_1_${element}.png`);
 assert.equal(images[17111],'unit_icon_0019_0_4.png');assert.equal(images[18011],'unit_icon_0028_0_4.png');
});
test('failed index requests can retry while valid responses stay shared; unsafe filenames are ignored',async()=>{
 const previousNow=Date.now;let now=previousNow(),calls=0;Date.now=()=>now;
 try{const fetcher=async()=>{calls++;if(calls===1)throw new Error('Offline');return {ok:true,json:async()=>({'99962':'unit_icon_retry.png','99963':'../../bad.png'})};};
  assert.equal(await readPortraitIndex(fetcher,MONSTER_IMAGE_INDEX_URL,parseCommunityPortraitIndex),null);
  now+=10001;assert.deepEqual(await readPortraitIndex(fetcher,MONSTER_IMAGE_INDEX_URL,parseCommunityPortraitIndex),{'99962':'unit_icon_retry.png'});assert.equal(calls,2);
 }finally{Date.now=previousNow;}
});
