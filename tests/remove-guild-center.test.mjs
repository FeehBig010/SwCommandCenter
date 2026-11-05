import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pageFromLocation} from '../src/lib/auth.js';
import {HOME_MODULES} from '../src/core/home-modules.js';
import {requiresLogin} from '../src/core/navigation-access.js';
test('retired Guild Center links resolve to existing personal counters and preserve private-route protections',()=>{
 for(const hash of ['#/guild-center','#guild-center','#/guild-center?legacy=1','#/guild'])assert.equal(pageFromLocation({hash}),'siege');
 assert.ok(!HOME_MODULES.some(m=>m.page==='guild-center'));assert.equal(HOME_MODULES.find(m=>m.title==='Counters Pessoais').page,'siege');
 assert.equal(requiresLogin('guild-intelligence'),true);assert.equal(requiresLogin('siege'),true);assert.equal(requiresLogin('siege',{id:'local'}),false);
});
test('Guild Center component and sidebar destination are disconnected without removing guild data services',async()=>{
 const sidebar=await readFile(new URL('../src/components/Sidebar.jsx',import.meta.url),'utf8'),app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(sidebar,/key:'guild-center'/);assert.doesNotMatch(app,/import\('\.\/components\/GuildCenter'\)/);assert.doesNotMatch(app,/page==='guild-center'/);
 assert.match(app,/page==='siege'/);assert.match(app,/readStore\('guildTemplates'\)/);assert.match(app,/readStore\('matchups'\)/);
});
