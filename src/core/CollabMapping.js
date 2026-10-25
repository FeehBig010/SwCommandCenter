import equivalents from './collab-equivalents.json' with {type:'json'};
// Exact master IDs only. Never merge account unit instances or elemental variants.
export const collabMapping=Object.freeze({...equivalents.ids});
export const collabOriginals=Object.freeze(Object.fromEntries(Object.entries(collabMapping).map(([collab,original])=>[original,Number(collab)])));
export function canonicalMonsterId(input){const id=Number(input);return collabMapping[id]||id;}
export function equivalentMonsters(a,b){return canonicalMonsterId(a)===canonicalMonsterId(b);}
export function equivalentSkillIds(catalog,master){return catalog.monsters[canonicalMonsterId(master)]||catalog.monsters[master]||[];}
