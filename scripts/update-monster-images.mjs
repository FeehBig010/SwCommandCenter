import {readFile,writeFile,rename} from 'node:fs/promises';
import {MONSTER_IMAGE_INDEX_URL,parseCommunityPortraitIndex} from '../src/core/monster-image-index.js';

// Public image metadata only. No SWEX input or account information is read.
const response=await fetch(MONSTER_IMAGE_INDEX_URL,{signal:AbortSignal.timeout(30000)});
if(!response.ok)throw new Error(`Image index HTTP ${response.status}; previous snapshot preserved.`);
const current=parseCommunityPortraitIndex(await response.json());
if(!current||Object.keys(current).length<1000)throw new Error('Incomplete image index; previous snapshot preserved.');
const destination=new URL('../src/core/monster-images.json',import.meta.url),previous=JSON.parse(await readFile(destination,'utf8'));
const images=Object.fromEntries(Object.entries({...previous,...current}).sort(([a],[b])=>Number(a)-Number(b)));
const temp=new URL(`${destination.href}.${process.pid}.tmp`);
await writeFile(temp,`${JSON.stringify(images)}\n`);await rename(temp,destination);
console.log(`Updated ${Object.keys(images).length} public monster image IDs from ${MONSTER_IMAGE_INDEX_URL}`);
