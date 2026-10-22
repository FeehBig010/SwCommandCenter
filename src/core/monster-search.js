import metadata from './monster-metadata.json' with {type:'json'};
const aliases={Totemist:['Totemista','Totemistas'], 'Panda Warrior':['Panda','Guerreiro Panda'],Paladin:['Paladino','Paladina'],Ifrit:['Ifrit'],Oracle:['Oráculo'], 'Fairy King':['Rei das Fadas'], 'Sea Emperor':['Imperador do Mar'], 'Dragon Knight':['Cavaleiro Dragão'], 'Occult Girl':['Garota Oculta'], 'Sky Dancer':['Dançarina do Céu'], 'Beast Rider':['Amazona Bestial'], 'Battle Angel':['Anjo de Batalha']};
export const normalizeSearch=text=>String(text??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export function monsterFamilies(master){const family=metadata.monsters[Number(master)]?.family;return metadata.families[family]||[];}
export function monsterBase(master){return metadata.monsters[Number(master)]?.base||null;}
// Element-preserving collab pairs, not unrelated awakened names.
const collabs=[[263,268,'Pure Vanilla Cookie'],[264,269,'Hollyberry Cookie'],[240,245,'Ryu'],[242,247,'M. Bison']];
export function collabSearchTerms(master){const id=Number(master),prefix=Math.floor(id/100),element=id%10;const pair=collabs.find(([a,b])=>prefix===a||prefix===b);if(!pair)return [];const other=(prefix===pair[0]?pair[1]:pair[0])*100+10+element;return [pair[2],metadata.monsters[other]?.name||''];}
export function monsterSearchText(option){const family=monsterFamilies(option.master);return normalizeSearch([option.name,option.detail,option.family,...collabSearchTerms(option.master),...family,...family.flatMap(name=>aliases[name]||[])].join(' '));}
export function filterMonsterOptions(options,query){const tokens=normalizeSearch(query).trim().split(/\s+/).filter(Boolean);return options.filter(o=>{const text=monsterSearchText(o);return tokens.every(token=>text.includes(token));});}
