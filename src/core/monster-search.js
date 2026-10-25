import metadata from './monster-metadata.json' with {type:'json'};
import {canonicalMonsterId,collabOriginals} from './CollabMapping.js';
const aliases={Totemist:['Totemista','Totemistas'], 'Panda Warrior':['Panda','Guerreiro Panda'],Paladin:['Paladino','Paladina'],Ifrit:['Ifrit'],Oracle:['Oráculo'], 'Fairy King':['Rei das Fadas'], 'Sea Emperor':['Imperador do Mar'], 'Dragon Knight':['Cavaleiro Dragão'], 'Occult Girl':['Garota Oculta'], 'Sky Dancer':['Dançarina do Céu'], 'Beast Rider':['Amazona Bestial'], 'Battle Angel':['Anjo de Batalha']};
export const normalizeSearch=text=>String(text??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export function monsterFamilies(master){const family=metadata.monsters[Number(master)]?.family;return metadata.families[family]||[];}
export function monsterBase(master){return metadata.monsters[canonicalMonsterId(master)]?.base||metadata.monsters[Number(master)]?.base||null;}
// Element-preserving collab pairs, not unrelated awakened names.
export function collabSearchTerms(master){const id=Number(master),canonical=canonicalMonsterId(id),other=canonical!==id?canonical:collabOriginals[id];return other?[metadata.monsters[other]?.name||'',...monsterFamilies(other)]:[];}
export function monsterSearchText(option){const family=monsterFamilies(option.master);return normalizeSearch([option.name,option.detail,option.family,...collabSearchTerms(option.master),...family,...family.flatMap(name=>aliases[name]||[])].join(' '));}
export function filterMonsterOptions(options,query){const tokens=normalizeSearch(query).trim().split(/\s+/).filter(Boolean);return options.filter(o=>{const text=monsterSearchText(o);return tokens.every(token=>text.includes(token));});}
