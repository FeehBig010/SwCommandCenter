import {DIMENSIONS,PVE_STAGES,canonicalPveStage,isPveStage} from './pve-stages.js';
const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const area=(gameMode,dungeon)=>({gameMode,dungeon});
const unknown=()=>area(null,null);
const beasts={1001:'ice-beast',2001:'fire-beast',3001:'wind-beast',4001:'light-beast',5001:'dark-beast'};
function dimensionById(id){const region=DIMENSIONS.find(d=>d[3]===Math.floor(id/1000));if(!region)return null;const kind=Math.floor(id%1000/100);return [1,2,3].includes(kind)&&!(region[3]===6&&kind===3)?area('dimensional',`${region[0]}-${{1:'runes',2:'2a',3:'predator'}[kind]}`):null;}
export function lookupPveDeck(node={},path=''){
 const text=fold([path,node.area,node.game_mode,node.mode,node.content_name,node.dungeon_name,node.name,node.deck_name].join(' '));
 const saved=node.sourceKey==='deck_list',recent=node.sourceKey==='deck_recent_list',type=Number(saved?node.deck_type:node.type),seq=Number(saved?node.deck_seq:node.sub_type);
 const id=Number(node.dungeon_id??node.content_id),pathIds=path.split('/').filter(s=>/^\d{4}$/.test(s)).map(Number);
 const ids=Number.isFinite(id)?[id]:pathIds;
 const riftNamespace=/elemental.?rift|rift.?dungeon|(?:^|[^a-z])rift(?:$|[^a-z])/.test(text)&&!/raid/.test(text);
 if(riftNamespace){const beast=ids.map(id=>beasts[id]).find(Boolean);if(beast)return area('rift',beast);}
 // Dimension IDs are distinct from elemental Halls; 1101 != Hall of Dark 1001.
 const dimension=ids.map(dimensionById).find(Boolean);if(dimension)return dimension;
 const normal={8001:'gb',9001:'db',6001:'nb'},abyss={8011:'gbah',9011:'dbah',6011:'nbah',9501:'sf10',9502:'pc10'};
 for(const dungeonId of ids){if(abyss[dungeonId])return area('cairos',abyss[dungeonId]);if(normal[dungeonId]){const floor=Number(node.floor??node.floor_no??node.stage??node.stage_id);return area('cairos',`${normal[dungeonId]}${floor>=12?'ah':'10'}`);}}
 // Structured source types take priority over player-assigned deck titles.
 if(saved&&type===24){const targets={1:'gbah',2:'dbah',3:'nbah',4:'sf10',5:'pc10'};return targets[Math.floor(seq/100)]?area('cairos',targets[Math.floor(seq/100)]):unknown();}
 if(saved&&type===25){const beast=beasts[Math.floor(seq/100)*1000+1];return beast?area('rift',beast):unknown();}
 if(saved&&type===26){const region=DIMENSIONS.find(([, , ,code])=>code===({1:2,2:1,3:3,4:4,5:5,6:6})[Math.floor(seq/100)]);return region?area('dimensional',`${region[0]}-runes`):unknown();}
 if(saved&&type===27)return seq>=100?area('toa','toahell'):unknown();
 if(saved&&type===6)return area('toa',({1:'toan',2:'toah',3:'toahell'})[Number(node.difficulty)]||'toa-saved');
 if(saved&&type===3)return area('rift','r5');
 if(saved&&[4,5,7,8,9,10,11,18,23].includes(type))return unknown(); // Labyrinth/other content is never a dimensional dungeon.
 if(recent&&type===16)return dimensionById(seq)||unknown();
 if(recent&&type===8)return beasts[seq]?area('rift',beasts[seq]):unknown();
 if(recent&&type===9)return area('rift','r5');
 if(recent&&[4,5,20].includes(type))return area('toa',({4:'toan',5:'toah',20:'toahell'})[type]);
 if(recent&&type===3){const targets={6:'nb10',8:'gb10',9:'db10',11:'sf10',12:'pc10',1901:'gbah',1902:'gbah',2001:'dbah',2002:'dbah',2101:'nbah',2102:'nbah',2201:'sf10',2202:'sf10',2301:'pc10',2302:'pc10'};return targets[seq]?area('cairos',targets[seq]):unknown();}
 if(recent&&[1,15,22,23,24,25,27].includes(type))return unknown();
 for(const [gameMode,stages] of Object.entries(PVE_STAGES))for(const [stage] of stages)if(new RegExp(`(?:^|[^a-z0-9])${stage}(?:$|[^a-z0-9])`).test(text))return area(gameMode,stage);
 for(const old of ['gb12','db12','nb12'])if(text.includes(old))return area('cairos',canonicalPveStage(old));
 for(const [id] of DIMENSIONS)if(text.includes(id)){const kind=/2a|second.?awaken|secondary.?awaken|despertar/.test(text)?'2a':/predator|predador/.test(text)?'predator':'runes';return isPveStage('dimensional',`${id}-${kind}`)?area('dimensional',`${id}-${kind}`):unknown();}
 if(/sacreon/.test(text))return area('dimensional',/2a|despertar/.test(text)?'sacreon-2a':'sacreon-runes');
 for(const [target,re] of [['ice-beast',/ice.?beast|fera.*gelo|besta.*gelo/],['fire-beast',/fire.?beast|fera.*fogo|besta.*fogo/],['wind-beast',/wind.?beast|fera.*vento|besta.*vento/],['light-beast',/light.?beast|fera.*luz|besta.*luz/],['dark-beast',/dark.?beast|fera.*trevas|besta.*escuridao/]])if(re.test(text))return area('rift',target);
 if(/toa|tower.of.ascension|trial.?tower/.test(text))return area('toa',/hell/.test(text)?'toahell':/hard|toah/.test(text)||Number(node.difficulty)===2?'toah':'toan');
 for(const [prefix,re] of [['gb',/giant|gigante/],['db',/dragon|dragao/],['nb',/necro/]])if(re.test(text))return area('cairos',`${prefix}${/b10|10/.test(text)?'10':'ah'}`);
 if(/sf10|steel|fortaleza/.test(text))return area('cairos','sf10');if(/pc10|punisher|cripta/.test(text))return area('cairos','pc10');
 if(/(?:^|[^a-z0-9])r5(?:$|[^a-z0-9])|raid/.test(text))return area('rift','r5');
 return null;
}
