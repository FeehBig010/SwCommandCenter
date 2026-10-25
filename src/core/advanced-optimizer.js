import {optimize} from './optimizer.js';
import {optimizeClone} from './clone-optimizer.js';
import {auditPresets} from './optimizer-audit.js';
import {importedPreset,prepareOptimizerTeam} from './optimizer-context.js';
export function optimizeAdvanced(account,input,options,onProgress=()=>{},reservedIds=[],{matchTargets=false}={}){
 const teams=input.filter(t=>t.active!==false).map(prepareOptimizerTeam),actualOptions={...options,maxGrindsGems:false};
 if(teams.some(t=>!['siege','arena'].includes(t.gameMode)||t.configs.length!==({siege:3,arena:4}[t.gameMode])))throw new Error('Composição incompatível com Siege (3 slots) ou Arena (4 slots).');
 if(!teams.length)throw new Error('Ative ao menos um time para buscar.');
 if(matchTargets&&teams.length===1&&teams[0].target_goals&&teams[0].optimizerSpeedSync)return optimizeClone(account,teams[0],actualOptions,onProgress,reservedIds);
 const audits=teams.filter(t=>importedPreset(t,account)),manual=teams.filter(t=>!importedPreset(t,account));
 const audited=audits.length?auditPresets(account,audits,actualOptions,onProgress,reservedIds):null;
 if(!manual.length)return audited;
 const equipped=new Set(account.units.flatMap(u=>u.runeIds||[]));
 const loose={...account,runes:account.runes.filter(r=>!r.owner&&!equipped.has(r.id)),units:account.units.map(u=>({...u,runeIds:[]}))};
 const built=optimize(loose,manual,{...actualOptions,equipped:false},onProgress,[...reservedIds,...(audited?.builds||[]).flatMap(b=>b.runeIds)]);
 return audited?{...built,builds:[...audited.builds,...built.builds],failures:[...audited.failures,...built.failures],audit:audited.audit,status:built.builds.length?'audited':built.status,checked:audited.checked+built.checked,elapsed:audited.elapsed+built.elapsed}:built;
}
