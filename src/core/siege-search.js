import {matchesDefense} from './siege.js';

export const normalizeSiegeSearch=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();

// Each query token must prefix a word in an enemy's name. Counter titles and
// attackers never make an unrelated defense match. Slots override free text.
export function filterSiegeDefenses(rows,{query='',slots=[]}={}){
 const selected=slots.filter(Boolean),tokens=normalizeSiegeSearch(query).split(/\s+/).filter(Boolean);
 return rows.filter(row=>{
  if(selected.length)return matchesDefense(row.members,selected);
  if(!tokens.length)return true;
  const names=row.members.map(m=>normalizeSiegeSearch(m.label).split(/[^\p{L}\p{N}]+/u));
  return tokens.every(token=>names.some(words=>words.some(word=>word.startsWith(token))));
 });
}

// Grouping may reorder a trio. Map by master AND occurrence so duplicate targets
// keep distinct ranks and a counter's slot indices never drift to another face.
export function siegeKillRanks(members,counter){
 const used=new Set(),ranks=Array(members.length).fill(null);
 for(const [rank,slot] of (counter?.siege?.killOrder||[]).entries()){
  const target=counter.enemyDefense[slot],occurrence=counter.enemyDefense.slice(0,slot).filter(m=>Number(m.masterId)===Number(target?.masterId)).length;
  const index=members.map((m,i)=>({m,i})).filter(({m})=>Number(m.masterId)===Number(target?.masterId))[occurrence]?.i;
  if(index!=null&&!used.has(index)){ranks[index]=rank+1;used.add(index);}
 }
 return ranks;
}

// The gallery's defense template can carry speed data that a counter omitted.
// Merge by occurrence, keeping that counter's own explicit observations first.
export function siegeCounterContext(record,members){
 if(!record.counter||!members?.length)return record;
 const enemyDefense=record.counter.enemyDefense.map((monster,slot)=>{
  const occurrence=record.counter.enemyDefense.slice(0,slot).filter(m=>Number(m.masterId)===Number(monster.masterId)).length;
  const known=members.filter(m=>Number(m.masterId)===Number(monster.masterId))[occurrence];
  return {...known,...monster};
 });
 return {...record,counter:{...record.counter,enemyDefense}};
}
