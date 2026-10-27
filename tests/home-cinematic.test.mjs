import test from 'node:test';
import assert from 'node:assert/strict';
import {stat,readFile} from 'node:fs/promises';
import {HOME_MODULES,homeCardFromKey} from '../src/core/home-modules.js';

test('card keyboard navigation wraps predictably and leaves native Enter/Space activation alone',()=>{
 assert.equal(homeCardFromKey('ArrowLeft',0),2);
 assert.equal(homeCardFromKey('ArrowRight',2),0);
 assert.equal(homeCardFromKey('ArrowRight',0),1);
 assert.equal(homeCardFromKey('Home',2),0);
 assert.equal(homeCardFromKey('End',0),2);
 for(const key of ['Enter',' ','Tab','Escape'])assert.equal(homeCardFromKey(key,1),null);
});
test('opening images stay local and within a bounded art budget without replacing the original assets',async()=>{
 const images=new Set([...HOME_MODULES.flatMap(m=>[m.image,m.scene]),'/art/home/guild-crest.webp']);
 let total=0;
 for(const path of images){assert.ok(path.startsWith('/art/home/'));const file=new URL('../public'+path,import.meta.url);const data=await readFile(file);assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');total+=(await stat(file)).size;}
 assert.ok(total<1000000,`Home artwork exceeds 1 MB: ${total}`);
 for(const file of ['arena-coliseum.png','pve-dimensional.png','siege-castle.png','portal-ciri.png'])assert.ok((await stat(new URL('../public/art/'+file,import.meta.url))).size>0);
});
