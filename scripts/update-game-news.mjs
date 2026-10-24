import {readFile,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {fetchHiveNews} from '../server/hive-news.js';
import {normalizeNewsFeed} from '../src/core/game-updates.js';

const destination=fileURLToPath(new URL('../public/game-updates.json',import.meta.url));
let previous=null;try{previous=normalizeNewsFeed(JSON.parse(await readFile(destination,'utf8')));}catch{}
const feed=await fetchHiveNews({previous});
await writeFile(`${destination}.tmp`,`${JSON.stringify(feed,null,2)}\n`);await rename(`${destination}.tmp`,destination);
