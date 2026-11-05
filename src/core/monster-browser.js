import {monsterPickerOptions} from './monster-variants.js';
import grades from './monster-natural-stars.json' with {type:'json'};
import {canonicalMonsterId} from './CollabMapping.js';
import {monsterSearchText,normalizeSearch} from './monster-search.js';
export function monsterNaturalStars(option){
 const stars=Number(option.naturalStars??option.natural_stars??grades.stars[option.master]??grades.stars[canonicalMonsterId(option.master)]);
 return Number.isInteger(stars)&&stars>=1&&stars<=5?stars:null;
}
export function indexMonsterBrowser(options){return monsterPickerOptions(options).map(option=>({option,text:monsterSearchText(option),stars:monsterNaturalStars(option)}));}
export function filterMonsterBrowser(index,{query='',stars=[],elements=[]}={}){
 const tokens=normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
 return index.filter(row=>(!stars.length||stars.includes(row.stars))&&(!elements.length||elements.includes(Number(row.option.element)))&&tokens.every(t=>row.text.includes(t))).map(row=>row.option);
}
export function toggleMonsterFilter(values,value){return values.includes(value)?values.filter(v=>v!==value):[...values,value];}
