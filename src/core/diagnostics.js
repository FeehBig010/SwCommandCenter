import {farmGuide} from './farm-guide.js';
import {cairosChecklist,cairosAccuracyTarget} from './cairos-checklist.js';
import {arenaContest} from './arena.js';
import {optimize,equippedTeamBuilds,teamTurnPreview,speedSyncValid,goalReport} from './optimizer.js';
import {DEFAULT_OPTIONS,STATS,FOUR} from './data.js';
import {diagnosticSignature} from './loadouts.js';
export function diagnoseTeam(account,team,options={},reservedIds=[]){
 const signature=diagnosticSignature(account,team,options,reservedIds),current=equippedTeamBuilds(account,team,options),active=team.configs.filter(c=>c.enabled!==false);
 const result={signature,current,improvement:null,scope:'bounded-current-and-unequipped-runes',farmGuide:farmGuide(team,current),warnings:[]};
 if(team.active===false)return {...result,status:'pending',message:'Time fora da distribuição ativa.'};
 if(current.length!==active.length||!active.length)return {...result,status:'pending',message:'Complete o time e as seis runas de cada monstro.'};
 const preview=teamTurnPreview(account,team,options,current),assignments=Object.fromEntries(current.map(b=>[b.key,b]));
 if(preview.cut)result.warnings.push('Risco de corte: o inimigo age antes de integrantes do time.');
 if(!speedSyncValid(assignments,[team]))result.warnings.push('Quebra da ordem vinculada ou do prazo em ticks.');
 if(current.some(b=>b.goals.some(g=>!g.met)))result.warnings.push('Há metas mínimas não atingidas.');
 result.warnings.push(...(preview.scenario?.risks||[]));
 if(team.gameMode==='cairos'){
  const checklist=cairosChecklist(account,team,{accuracy:cairosAccuracyTarget(team)},options);
  if(!checklist.complete)result.warnings.push('Complete os cinco integrantes de Cairos.');
  else{if(!checklist.order)result.warnings.push('Cairos: ordem rígida diferente dos slots.');if(checklist.beforeBoss===false)result.warnings.push('Cairos: o chefe age antes do time.');if(checklist.members.some(m=>!m.accMet||!m.crMet))result.warnings.push('Cairos: cap de ACC ou crítico não atingido.');if(checklist.members.some(m=>m.survives===false))result.warnings.push('Cairos: risco de morte no contra-ataque informado.');}
 }
 if(team.gameMode==='arena'&&Number(team.arenaScenario?.enemyBase)>0){const contest=arenaContest(account,team,options,team.arenaScenario);if(contest.complete&&!contest.wins)result.warnings.push('Arena: risco de perder o primeiro turno.');if(contest.antiCut?.cut)result.warnings.push('Arena: curandeiro Nemesis corta a sequência.');}

 const own=new Set(active.map(c=>c.unitId)),available={...account,runes:account.runes.filter(r=>!r.owner||own.has(r.owner))};
 // Protect every current stat: background proposals never trade away HP/DEF/etc silently.
 const guarded={...team,configs:team.configs.map(c=>{const b=current.find(b=>b.key===c.key);const equippedSets=b?Object.entries(b.counts).flatMap(([id,n])=>Array(Math.floor(n/(FOUR.has(Number(id))?4:2))).fill(Number(id))):[];return b?{...c,strictSets:true,sets:c.strictSets&&c.sets.some(Boolean)?c.sets:equippedSets,combatSpd:Math.max(Number(c.combatSpd)||0,b.stats.combat.spd),basis:'total',goals:Object.fromEntries(STATS.map(k=>[k,Math.max(b.stats.total[k],Number(c.goals[k])>0?(c.basis==='bonus'&&!['cr','cd','res','acc'].includes(k)?account.units.find(u=>u.id===c.unitId).base[k]+Number(c.goals[k]):Number(c.goals[k])):0)]))}:c;})};
 const proposal=optimize(available,[guarded],{...DEFAULT_OPTIONS,...options,depth:'fast',maxGrindsGems:false,strictMode:false,minLevel:0},()=>{},reservedIds);
 const viable=proposal.builds.length===current.length&&proposal.builds.every(b=>{const old=current.find(x=>x.key===b.key);return STATS.every(k=>b.stats.total[k]>=old.stats.total[k])&&b.stats.combat.spd>=old.stats.combat.spd;});
 const gains=viable?proposal.builds.flatMap(b=>{const old=current.find(x=>x.key===b.key),spd=b.stats.combat.spd-old.stats.combat.spd,damage=b.stats.damage?.total&&old.stats.damage?.total?(b.stats.damage.total/old.stats.damage.total-1)*100:0;return spd>0?[{name:b.name,stat:'SPD',gain:spd}]:damage>=1?[{name:b.name,stat:'dano no cenário',gain:Math.round(damage),percent:true}]:STATS.filter(k=>b.stats.total[k]>old.stats.total[k]).map(k=>({name:b.name,stat:k.toUpperCase(),gain:b.stats.total[k]-old.stats.total[k]}));}):[];
 if(gains.length){const builds=proposal.builds.map(b=>({...b,goals:goalReport(b.stats,team.configs.find(c=>c.key===b.key))}));result.improvement={builds,gains};}
 if(result.warnings.length)return {...result,status:'alert',message:result.warnings[0]};
 if(result.improvement){const gain=gains.sort((a,b)=>(b.stat==='SPD')-(a.stat==='SPD')||b.gain-a.gain)[0];return {...result,status:'improvement',message:`+${gain.gain.toLocaleString('pt-BR')}${gain.percent?'%':''} ${gain.stat} em ${gain.name} usando o estoque livre.`};}
 if(['no_assignment','conflict'].includes(proposal.status))return {...result,status:'pending',message:'Estoque indisponível com estes filtros/reservas. Build atual mantida.'};
 const knownEnemy=Number(team.enemyCombatSpd)>0||team.combatScenario?.enemies?.some(e=>e.spd>0)||Number(team.arenaScenario?.enemyBase)>0||Number(team.boss?.spd)>0;
 return {...result,status:'ready',message:`Metas atendidas; nenhuma melhoria encontrada nesta busca.${knownEnemy?'':' SPD inimiga não informada: corte não validado.'}`};
}
