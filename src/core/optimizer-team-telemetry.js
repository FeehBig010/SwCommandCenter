import {equippedBuild,speedSyncValid,teamTurnPreview} from './optimizer.js';
import {importedPreset,prepareOptimizerTeam} from './optimizer-context.js';
import {siegeAccountTimeline} from './siege-timeline.js';
// Read the selected loadout, never desired goals or an unrelated unit copy.
export function optimizerTeamTelemetry(account,input,options={},builds=null){
 const team=prepareOptimizerTeam(input),active=team.configs.filter(c=>c.enabled!==false);
 const pending={status:'pending',label:'Pendente',reason:'Selecione os monstros e complete o equipamento no JSON.',members:[],preview:null};
 if(!account||!active.length)return pending;
 try{
  const preset=importedPreset(team,account),equipment=new Map((preset?.equipment||[]).map(e=>[e.unitId,e]));
  const snapshot={...account,units:account.units.map(u=>equipment.has(u.id)?{...u,runeIds:equipment.get(u.id).runeIds??u.runeIds,artifactIds:equipment.get(u.id).artifactIds??u.artifactIds}:u)};
  const assigned=active.map(c=>builds?.find(b=>b.key===c.key&&b.unitId===c.unitId&&(!b.teamId||b.teamId===team.id))||equippedBuild(snapshot,team,c,options));
  const complete=assigned.every(Boolean)&&new Set(active.map(c=>c.unitId)).size===active.length&&new Set(assigned.flatMap(b=>b?.runeIds||[])).size===active.length*6;
  const base=teamTurnPreview(snapshot,team,options,assigned.filter(Boolean));
  const preview=complete&&base.complete&&team.gameMode==='siege'&&team.enemyDefense?.length?siegeAccountTimeline(snapshot,team,options,assigned):base;
  const actors=new Map((preview.actors||[]).filter(a=>!a.enemy).map(a=>[a.key,a]));
  const order=complete&&preview.complete?(preview.turns||[]).filter(t=>!t.enemy).map(t=>({key:t.key,name:actors.get(t.key)?.name||active.find(c=>c.key===t.key)?.label,spd:t.spd,initialSpd:actors.get(t.key)?.spd,tick:t.tick,disabled:t.disabled})):active.map(c=>({key:c.key,name:c.label,spd:actors.get(c.key)?.spd??null,tick:null}));
  const members=order.concat(active.filter(c=>!order.some(m=>m.key===c.key)).map(c=>({key:c.key,name:c.label,spd:null,tick:null})));
  if(!complete||!preview.complete)return {...pending,preview,members};
  const assignments=Object.fromEntries(assigned.map(b=>[b.key,b]));
  const valid=speedSyncValid(assignments,[team]),cut=preview.scenario?.cut===true;
  if(cut||team.optimizerSpeedSync!==false&&!valid)return {status:'risk',label:'Risco de Corte',reason:cut?'O inimigo age antes de a equipe completar a primeira rotação.':'A ordem ou os limites de ticks configurados não foram atendidos.',preview,members};
  if(team.optimizerSpeedSync===false)return {status:'free',label:'Sincronia livre',reason:'A trava anti-corte está desativada para este time.',preview,members};
  if((preview.unknownDefense?.length||0)>0||(preview.scenario?.risks?.length||0)>0)return {status:'partial',label:'Cenário parcial',reason:'Há condições ou dados de defesa ausentes. Consulte os detalhes do cenário.',preview,members};
  if(!(preview.turns||[]).some(t=>t.enemy)&&!Number(team.enemyCombatSpd)&&!team.combatScenario?.enemies?.length)return {status:'unknown',label:'Sem referência',reason:'Ordem interna preservada. Informe a defesa ou SPD inimiga para avaliar o corte; não há garantia contra um inimigo desconhecido.',preview,members};
  return {status:'synced',label:'Sincronizado',reason:'Ordem e primeira rotação atendidas no cenário informado. Procs e eventos não informados não são previstos.',preview,members};
 }catch{return {...pending,reason:'Não foi possível calcular esta composição. Revise as unidades e o equipamento.'};}
}
