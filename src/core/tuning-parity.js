// Evidence comparison only. Combat calculations remain in speedTuner.js.
export const SWCALC_REFERENCE_REGISTRY=Object.freeze({schemaVersion:1,status:'BLOCKED',detail:'Nenhuma referência SWCALC externa certificada foi registrada.',scenarios:Object.freeze([])});
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
function canonical(value){
 if(value===null||typeof value==='boolean'||typeof value==='string')return value;
 if(finite(value))return value;
 if(Array.isArray(value))return value.map(canonical);
 if(object(value))return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
 throw new Error('Dado de referência não serializável ou não finito.');
}
export function tuningInputFingerprint(inputs){return JSON.stringify(canonical(inputs));}
function validInputs(i){
 if(!object(i)||!['siege','arena','rta'].includes(i.gameMode)||!finite(i.tickRate)||i.tickRate<=0||!finite(i.towerSpd)||i.towerSpd<0||!finite(i.guildSpd)||i.guildSpd<0||!Object.hasOwn(i,'leader')||i.leader!==null&&!object(i.leader)||typeof i.referencePolicy!=='string')return false;
 if(!['gamePlacement','allies','enemies','events'].every(k=>Array.isArray(i[k]))||!i.allies.length||i.allies.length+i.enemies.length>8)return false;
 const actors=[...i.allies,...i.enemies],keys=actors.map(a=>a?.key);
 if(new Set(keys).size!==keys.length||!actors.every(a=>object(a)&&typeof a.key==='string'&&a.key.length&&Number.isInteger(a.master)&&a.master>0&&finite(a.baseSpd)&&a.baseSpd>0&&finite(a.runeSpd)&&a.runeSpd>=0&&typeof a.swift==='boolean'&&object(a.combat)&&Object.hasOwn(a,'skill')&&(a.skill===null||object(a.skill)&&Number.isInteger(a.skill.slot)&&a.skill.slot>0&&Number.isInteger(a.skill.level)&&a.skill.level>0)))return false;
 return i.gamePlacement.length===i.allies.length&&new Set(i.gamePlacement).size===i.gamePlacement.length&&i.gamePlacement.every(k=>i.allies.some(a=>a.key===k));
}
function validMeasurements(m,inputs){
 if(!object(m)||!Array.isArray(m.actors)||!Array.isArray(m.order)||typeof m.cut!=='boolean')return false;
 const keys=[...inputs.allies,...inputs.enemies].map(a=>a.key);
 return m.actors.length===keys.length&&new Set(m.actors.map(a=>a?.key)).size===keys.length&&m.actors.every(a=>keys.includes(a.key)&&finite(a.combatSpd)&&a.combatSpd>0&&['readyTick','actionTick'].every(k=>Number.isInteger(a[k])&&a[k]>0))&&m.order.length===keys.length&&new Set(m.order).size===m.order.length&&m.order.every(k=>keys.includes(k));
}
function sourceValid(s){try{return object(s)&&s.name==='SWCALC'&&['swcalc.cz','www.swcalc.cz'].includes(new URL(s.url).hostname)&&new URL(s.url).protocol==='https:'&&typeof s.version==='string'&&!!s.version.trim()&&typeof s.capturedAt==='string'&&Number.isFinite(Date.parse(s.capturedAt))&&new URL(s.evidenceUrl).protocol==='https:'&&typeof s.synthetic==='boolean';}catch{return false;}}
function differences(a,b,path='',out=[]){if(JSON.stringify(a)===JSON.stringify(b))return out;if(Array.isArray(a)&&Array.isArray(b)){if(a.length!==b.length)out.push(`${path}.length`);for(let i=0;i<Math.max(a.length,b.length);i++)differences(a[i],b[i],`${path}[${i}]`,out);}else if(object(a)&&object(b)){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))differences(a[k],b[k],path?`${path}.${k}`:k,out);}else out.push(path);return out;}
export function compareTuningEvidence(local,reference){
 const result={status:'BLOCKED',code:'missing-reference',detail:'Referência externa SWCALC ausente.',scope:'Somente o cenário comparado',differences:[],fixtureOnly:reference?.source?.synthetic===true,globalParity:false};
 if(!reference)return result;
 try{
  if(!local||local.schemaVersion!==1||reference.schemaVersion!==1||!validInputs(local.inputs)||!validInputs(reference.inputs)||!validMeasurements(local.measurements,local.inputs)||!validMeasurements(reference.measurements,reference.inputs)||!sourceValid(reference.source))return {...result,code:'invalid-evidence',detail:'Referência incompleta, inválida ou sem proveniência verificável.'};
  const left=tuningInputFingerprint(local.inputs),right=tuningInputFingerprint(reference.inputs);
  if(left!==right)return {...result,code:'different-inputs',detail:'Os parâmetros dos dois cenários são diferentes.',differences:differences(canonical(local.inputs),canonical(reference.inputs),'inputs')};
  const delta=differences(canonical(local.measurements),canonical(reference.measurements),'measurements');
  if(delta.length)return {...result,code:'measurement-mismatch',detail:'Há divergências nas medições; nenhuma tolerância implícita foi aplicada.',differences:delta};
  return {...result,status:'VALIDADO',code:'matched',detail:result.fixtureOnly?'Fixture sintética correspondente; não certifica resultado externo.':'Medições correspondem à referência registrada para este cenário.'};
 }catch{return {...result,code:'invalid-evidence',detail:'Referência contém valores não finitos ou não serializáveis.'};}
}
