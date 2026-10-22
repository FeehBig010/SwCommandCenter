import {blankConfig,GAME_MODES,SETS,FOUR,STATS} from './data.js';
import {SLOT_MAINS} from './guild.js';
import {normalizeDamageSettings} from './damage.js';
const numeric=(value,max=1000000)=>{if(value===''||value==null)return '';const n=Number(value);if(!Number.isFinite(n)||n<0||n>max)throw new Error('Meta fora do limite.');return n;};
const text=(v,max=100)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error('Nome inválido.');return v.trim();};
export function portableTeam(input,account){
 if(!input||!Array.isArray(input.configs)||![3,4,5].includes(input.configs.length))throw new Error('Use uma composição de 3, 4 ou 5 slots.');
 const gameMode={3:'siege',4:'arena',5:'cairos'}[input.configs.length];
 const configs=input.configs.map(c=>{
  const unit=account?.units.find(u=>u.id===c.unitId),masterId=Number(unit?.master||c.masterId);
  if(!Number.isSafeInteger(masterId)||masterId<10000)throw new Error('Selecione um monstro em cada slot.');
  const sets=(c.sets||[]).map(Number).filter(Boolean);
  if(sets.some(s=>!SETS[s]||s===25)||sets.reduce((n,s)=>n+(FOUR.has(s)?4:2),0)>6)throw new Error('Sets incompatíveis com seis runas.');
  const mains=Object.fromEntries([2,4,6].map(s=>{const v=Number(c.mains?.[s]||0);if(!SLOT_MAINS[s].includes(v))throw new Error('Main stat inválido.');return [s,v];}));
  return {masterId,label:text(unit?.name||c.label,80),sets,strictSets:c.strictSets!==false,mains,goals:Object.fromEntries(STATS.map(k=>[k,numeric(c.goals?.[k])])),basis:c.basis==='bonus'?'bonus':'total',artifacts:c.artifacts!==false,lockSpeedSync:c.lockSpeedSync===true,objective:['balanced','hp','spd','cr','damage'].includes(c.objective)?c.objective:'balanced',damage:normalizeDamageSettings(c.damage)};
 });
 return {name:text(input.name||'Composição'),gameMode,mode:input.mode==='attack'?'attack':'defense',towerSpd:numeric(input.towerSpd,100)||0,leaderSpd:numeric(input.leaderSpd,100)||0,enemyCombatSpd:numeric(input.enemyCombatSpd,1000)||0,leaderIndex:Math.min(configs.length-1,Math.max(0,Number.isInteger(input.leaderIndex)?input.leaderIndex:input.configs.findIndex(c=>c.key===input.leaderKey))),configs};
}
export function copyTeamToOptimizer(input,account){
 const clean=portableTeam(input,account),used=new Set();
 const configs=clean.configs.map(c=>{
  const unit=account?.units.filter(u=>u.master===c.masterId&&!used.has(u.id)).sort((a,b)=>b.level-a.level||a.id-b.id)[0];
  if(unit)used.add(unit.id);
  return {...blankConfig(unit,c.label),...c,unitId:unit?.id||null};
 });
 return {...clean,id:crypto.randomUUID(),priority:1,order:'off',configs,leaderKey:configs[clean.leaderIndex]?.key||null};
}
export function cleanMatchup(input,account){
 if(!input||!Array.isArray(input.enemyDefense)||![3,4,5].includes(input.enemyDefense.length))throw new Error('Selecione os monstros da defesa inimiga.');
 const offense=portableTeam({...input.offense,mode:'attack'},account);
 const enemyDefense=input.enemyDefense.map(m=>{if(!m||typeof m!=='object')throw new Error('Complete a defesa inimiga.');const masterId=Number(m.masterId||m.master);if(!Number.isSafeInteger(masterId)||masterId<10000)throw new Error('Complete a defesa inimiga.');return {masterId,label:text(m.label||m.name,80)};});
 if(typeof input.notes==='string'&&input.notes.length>1000)throw new Error('Use até 1.000 caracteres nas observações.');
 return {version:1,offense,enemyDefense,outcome:['win','loss','unrecorded'].includes(input.outcome)?input.outcome:'unrecorded',notes:typeof input.notes==='string'?input.notes:'',name:text(input.name||`${offense.name} × Defesa`)};
}
export function cleanCloudPayload(kind,payload){
 if(!payload||payload.version!==1)throw new Error('Versão de composição incompatível.');
 if(kind==='counter')return cleanMatchup(payload);
 if(!['plan','template'].includes(kind))throw new Error('Tipo de composição inválido.');
 return {version:1,team:portableTeam(payload.team)};
}
export function cloudTeam(record){return record.kind==='counter'?record.payload.offense:record.payload.team;}
export const HUB_MODES=Object.entries(GAME_MODES).filter(([,v])=>[3,4,5].includes(v.slots));
