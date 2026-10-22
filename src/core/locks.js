const ids=rows=>[...new Set((Array.isArray(rows)?rows:[]).filter(id=>Number.isSafeInteger(id)&&id>0))];
export function normalizeLocks(raw={}){return {unitIds:ids(raw.unitIds),runeIds:ids(raw.runeIds)};}
export function lockContext(account,options={}){const locks=normalizeLocks(options.localLocks),units=new Set(locks.unitIds),runes=new Set(locks.runeIds);for(const u of account.units)if(units.has(u.id))for(const id of u.runeIds)runes.add(id);for(const r of account.runes)if(units.has(r.owner))runes.add(r.id);return {units,runes};}
export function toggleLocalLock(locks,kind,id){const clean=normalizeLocks(locks),key=kind==='unit'?'unitIds':'runeIds';clean[key]=clean[key].includes(id)?clean[key].filter(x=>x!==id):[...clean[key],id];return clean;}
