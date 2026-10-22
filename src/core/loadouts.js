import {lockContext} from './locks.js';
export const accountStamp=account=>`${account?.id||''}:${account?.importedAt||''}`;
export function currentRuneIds(account,team,config,unit){
 return team.plannedRunes?.accountStamp===accountStamp(account)&&Array.isArray(team.plannedRunes.byConfig?.[config.key])?team.plannedRunes.byConfig[config.key]:unit.runeIds;
}
export function plannedReservations(teams,account,exceptId){
 return [...new Set(teams.filter(t=>t.active!==false&&t.id!==exceptId&&t.plannedRunes?.accountStamp===accountStamp(account)).flatMap(t=>Object.values(t.plannedRunes.byConfig).flat()))];
}
export function applyDiagnosticPlan(account,team,report,options,reservedIds=[]){
 if(report?.signature!==diagnosticSignature(account,team,options,reservedIds)||!report.improvement?.builds?.length)throw new Error('Diagnóstico desatualizado. Aguarde uma nova análise.');
 const locks=lockContext(account,options);
 const own=new Set(team.configs.map(c=>c.unitId)),used=new Set(),blocked=new Set(reservedIds),byConfig={};
 for(const build of report.improvement.builds){
  if(locks.units.has(build.unitId)&&JSON.stringify(build.runeIds.slice().sort((a,b)=>a-b))!==JSON.stringify(account.units.find(u=>u.id===build.unitId)?.runeIds.slice().sort((a,b)=>a-b)))throw new Error('Monstro travado.');
  if(!team.configs.some(c=>c.key===build.key&&c.unitId===build.unitId)||build.runeIds.length!==6)throw new Error('Build incompatível.');
  const slots=new Set();
  for(const id of build.runeIds){const r=account.runes.find(r=>r.id===id);if(!r||locks.runes.has(id)&&!account.units.find(u=>u.id===build.unitId)?.runeIds.includes(id)||used.has(id)||blocked.has(id)||r.owner&&!own.has(r.owner)||options.respectLocks&&r.locked)throw new Error('Runas indisponíveis. Atualize o diagnóstico.');used.add(id);slots.add(r.slot);}
  if(slots.size!==6)throw new Error('Build incompleta.');byConfig[build.key]=build.runeIds;
 }
 if(Object.keys(byConfig).length!==team.configs.filter(c=>c.enabled!==false).length)throw new Error('Diagnóstico incompleto.');
 return {...team,plannedRunes:{accountStamp:accountStamp(account),byConfig,appliedAt:new Date().toISOString()}};
}
export function diagnosticSignature(account,team,options,reservedIds=[]){
 return JSON.stringify([accountStamp(account),team,options,[...new Set(reservedIds)].sort((a,b)=>a-b)]);
}
