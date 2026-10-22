import {combatAttributes,simulateCombat,scenarioForTeam,missingDefenseConditions} from './speedTuner.js';
import {artifactEffects} from './artifacts.js';
import {cleanMatchup,copyTeamToOptimizer} from './hub.js';
import {normalizeSiegeSpec} from './siege-schema.js';
import {catalogLeader,leaderForTeam} from './leader-catalog.js';
import {calculateStats,artifactBonus,combatSpeed,firstTurns,goalReport,setCounts} from './optimizer.js';
import {FOUR,SETS} from './data.js';
export function cleanSiegeCounter(input,account){
 const counter=cleanMatchup({...input,siege:input.siege||{}},account);
 if(counter.offense.configs.length!==3||counter.enemyDefense.length!==3)throw new Error('Counters de Siege exigem 3 monstros de cada lado.');
 for(const c of counter.offense.configs)if(c.maxTick&&!Number.isInteger(c.maxTick))throw new Error('Informe ticks inteiros.');
 counter.offense.leader=leaderForTeam(counter.offense);
 if(!Object.hasOwn(input.siege||{},'defenseLeader'))counter.siege.defenseLeader=catalogLeader(counter.enemyDefense[counter.siege.defenseLeaderIndex]?.masterId);
 return counter;
}
export function matchesDefense(defense,query){
 const counts=new Map();for(const m of defense)counts.set(Number(m.masterId),(counts.get(Number(m.masterId))||0)+1);
 for(const id of query.filter(Boolean)){const n=counts.get(Number(id))||0;if(!n)return false;counts.set(Number(id),n-1);}return true;
}
export function requiredTurnPlan(counter){
 const actors=counter.offense.configs.map((c,i)=>({key:String(i),name:c.label,spd:Number(c.combatSpd)||0}));
 if(actors.some(a=>a.spd<=0))return [];
 return firstTurns(actors,counter.siege?.speedTick??7).map(t=>({...t,name:actors.find(a=>a.key===t.key).name}));
}
export function validateSiegeAccount(raw,account,member={towerSpd:0},options={}){
 const counter=cleanSiegeCounter(raw),team=counter.offense,spec=counter.siege;
 if(!account)return {status:'no_account',issues:['Importe seu JSON SWEX para conferir o equipamento atual.'],members:[],turns:[]};
 const required=new Map(),missing=[];
 for(const c of team.configs){const n=(required.get(c.masterId)||0)+1;required.set(c.masterId,n);if(account.units.filter(u=>u.master===c.masterId).length<n)missing.push(c.label);}
 if(missing.length)return {status:'missing',issues:missing.map(name=>`Falta Monstro: ${name} (ou uma cópia adicional).`),members:[],turns:[]};
 const tower=Number(member.towerSpd??0);if(!Number.isFinite(tower)||tower<0||tower>100)throw new Error('Informe uma torre SPD válida.');
 const jobs=team.configs.map((c,i)=>account.units.filter(u=>u.master===c.masterId).map(unit=>{
  const ids=unit.runeIds?.length?unit.runeIds:account.runes.filter(r=>r.owner===unit.id).map(r=>r.id),runes=ids.map(id=>account.runes.find(r=>r.id===id)).filter(Boolean),issues=[];
  if(runes.length!==6||new Set(runes.map(r=>r.slot)).size!==6)issues.push(`${unit.name}: equipe seis slots de runas distintos.`);
  if(runes.some(r=>[25,99].includes(r.set)))issues.push(`${unit.name}: set não suportado nesta checagem.`);
  const counts=setCounts(runes),stats=calculateStats(unit,runes,options.artifacts!==false&&c.artifacts!==false?artifactBonus(account,unit):{});
  const effects=artifactEffects(account,unit,options.artifacts!==false&&c.artifacts!==false);stats.combat=combatAttributes(unit,stats,counts,{...team,gameMode:'siege',towerSpd:tower,guildSpd:Number(member.guildSpd)||0,leaderSpd:0},c.combat,effects);const spd=stats.combat.spd;
  for(const g of goalReport(stats,c))if(g.key!=='combatSpd'&&!g.met)issues.push(`${unit.name}: faltam ${Math.ceil(g.missing).toLocaleString('pt-BR')} ${g.key.toUpperCase()} na ficha.`);
  const sets=new Map();for(const id of c.sets.filter(Boolean))sets.set(id,(sets.get(id)||0)+1);
  if(c.strictSets!==false)for(const [id,n] of sets)if(Math.floor((counts[id]||0)/(FOUR.has(id)?4:2))<n)issues.push(`${unit.name}: falta ${n}× ${SETS[id]}.`);
  for(const slot of [2,4,6])if(Number(c.mains[slot])&&runes.find(r=>r.slot===slot)?.main[0]!==Number(c.mains[slot]))issues.push(`${unit.name}: ajustar main stat do slot ${slot}.`);
  if(Number(c.combatSpd)>spd)issues.push(`${unit.name}: faltam ${Math.ceil(c.combatSpd-spd)} SPD de combate.`);
  if(!Number(c.combatSpd)&&!Number(c.maxTick)&&!Number(c.goals.spd))issues.push(`${unit.name}: counter sem meta SPD/Tick; complete a recomendação.`);
  return {key:String(i),unitId:unit.id,masterId:unit.master,name:unit.name,spd,rawSpd:stats.combat.rawSpd,combat:c.combat,effects,nemesisSets:Math.floor((counts[14]||0)/2),stats,runeIds:runes.map(r=>r.id),counts,issues};
 }).sort((a,b)=>a.issues.length-b.issues.length||b.spd-a.spd||a.unitId-b.unitId).slice(0,8));
 let best=null;
 function evaluate(members){
  const issues=members.flatMap(m=>m.issues),ids=members.flatMap(m=>m.runeIds);
  if(new Set(ids).size!==ids.length)issues.push('Há runas repetidas entre as unidades equipadas.');
  let turns=[];
  try{
   const actors=members.map(m=>({key:m.key,spd:m.spd,rawSpd:m.rawSpd,combat:m.combat,effects:m.effects,nemesisSets:m.nemesisSets,master:m.masterId})),configured=scenarioForTeam({...team,configs:team.configs.map((c,i)=>({...c,key:String(i)}))},actors),enemy=Number(team.enemyCombatSpd)||0;
   const simulation=simulateCombat([...configured.actors,...(!configured.actors.some(a=>a.enemy)&&enemy>0?[{key:'enemy',spd:enemy,enemy:true}]:[])],{tickPercent:spec.speedTick,events:configured.events,stopAfterFirst:true});turns=simulation.firstTurns;if(simulation.risks.length)issues.push(...simulation.risks);
   const allies=turns.filter(t=>!t.enemy);
   if(spec.requireOrder&&allies.some((t,i)=>t.key!==String(i)))issues.push('Ajustar a ordem: os cards devem agir de 1 → 2 → 3.');
   for(const m of members){const tick=turns.find(t=>t.key===m.key)?.tick,target=team.configs[Number(m.key)].maxTick;if(target&&tick>target)issues.push(`${m.name}: age no Tick ${tick}; precisa agir até o Tick ${target}.`);}
   const ei=turns.findIndex(t=>t.enemy);if(spec.beforeEnemy&&ei>=0&&turns.slice(ei+1).some(t=>!t.enemy))issues.push('Risco de corte: um aliado age depois do inimigo informado.');
  }catch(e){issues.push(e.message);}
  if(!best||issues.length<best.issues.length)best={status:issues.length?'adjust':'ready',members,issues,turns};
 }
 function visit(members){if(best?.status==='ready')return;if(members.length===3){evaluate(members);return;}for(const m of jobs[members.length])if(!members.some(x=>x.unitId===m.unitId))visit([...members,m]);}
 visit([]);if(best)best.risks=missingDefenseConditions({...team,enemyDefense:counter.enemyDefense});return best||{status:'adjust',members:[],turns:[],issues:['Não foi possível atribuir cópias distintas às três posições.']};
}
export function makeFavorite(counter,key){return {key,counter:cleanSiegeCounter(counter),savedAt:new Date().toISOString()};}
export function favoriteTeam(counter,account){const clean=cleanSiegeCounter(counter);return {...copyTeamToOptimizer(clean.offense,account),enemyDefense:clean.enemyDefense};}
export function summarizeFeedback(entries){
 const counts={free_win:0,rng:0,high_runes:0};let wins=0,losses=0;
 for(const f of entries){if(Object.hasOwn(counts,f.reaction))counts[f.reaction]++;if(f.outcome==='win')wins++;if(f.outcome==='loss')losses++;}
 return {counts,wins,losses,total:wins+losses,winRate:wins+losses?Math.round(wins/(wins+losses)*100):null};
}
