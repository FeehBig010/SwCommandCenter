import {cairosWaveReport,WAVE_SKILLS} from './cairos.js';
import {equippedTeamBuilds} from './optimizer.js';
import {leaderApplies} from './leaders.js';
// A lower-bound damage check, never an AI/cooldown/survival guarantee.
export function automaticCairosReport(account,team,profile,builds,options={}){
 const badges=[];if(!account)return {badges:[{kind:'pending',text:'○ Carregue seu SWEX para validar.'}]};
 let found=builds;try{found=found?.length?found:equippedTeamBuilds(account,team,options);}catch{return {badges:[{kind:'pending',text:'○ Complete o equipamento dos cinco monstros.'}]};}
 const attackers=(found||[]).filter(b=>WAVE_SKILLS[account.units.find(u=>u.id===b.unitId)?.master]);
 if(!attackers.length)badges.push({kind:'pending',text:'○ Wave Clear: habilidade da composição ainda não modelada.'});
 for(const b of attackers){const unit=account.units.find(u=>u.id===b.unitId);try{const report=cairosWaveReport(account,found,b.key,profile,{towerAtk:20,towerCd:25,leaderAtk:team.leader?.stat==='atk'&&leaderApplies(team.leader,unit,'cairos')?team.leader.value:0,skillUps:0,fullHp:true,variance:.9,skillReady:false}),missing=Math.max(...report.waves.flatMap(w=>w.enemies.map(e=>e.missing||0)));badges.push(missing?{kind:'deficit',text:`🔴 ${unit.name}: faltam ${Math.ceil(missing).toLocaleString('pt-BR')} de dano no alvo mais resistente.`}:{kind:'met',text:`🟢 ${unit.name}: dano suficiente nas waves 1 e 3; rotação/HP cheio pendentes.`});}catch(e){badges.push({kind:'pending',text:`○ Wave Clear: ${e.message}`});}}
 badges.push({kind:'pending',text:'○ Sobrevivência ao contra-ataque: mecânicas do chefe não validadas.'});return {badges};
}
