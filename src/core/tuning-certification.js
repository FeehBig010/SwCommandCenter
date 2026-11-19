import {quickSkillOptions,resolvedQuickSkill} from './quick-skill-effects.js';

// Evidence classification only. This module never simulates combat, changes a
// speed, or turns an ordered first rotation into a claim of global optimality.
export function mechanicCoverage(team={}){
 return (team.configs||[]).filter(c=>c.enabled!==false&&c.masterId).map(c=>{
  const options=quickSkillOptions(c.masterId),resolved=resolvedQuickSkill(c);
  const selected=options.find(s=>!s.isPassive&&s.slot===resolved.slot);
  const levelKnown=c.firstTurnSkillLevel!=null||(c.skillLevels||[]).some(s=>Number(s.slot)===resolved.slot);
  return {key:c.key,masterId:c.masterId,label:c.label||'Monstro',selected:{slot:resolved.slot,name:selected?.name||'Habilidade não identificada',coverage:selected?.coverage||'unsupported',level:resolved.level,levelKnown,hypothetical:resolved.hypothetical,legacyBonus:resolved.legacyBonus,limitation:resolved.limitation},passives:options.filter(s=>s.isPassive).map(s=>({slot:s.slot,name:s.name,coverage:s.coverage})),oblivion:c.combat?.oblivion===true};
 });
}

// Shared eligibility warnings for selected opponents. Unknown-speed identities
// cannot vanish from a certificate merely because the simulator omits them.
export function enemyCoverageIssues(team={}){
 const issues=[];
 for(const enemy of team.combatScenario?.enemies||[]){
  const master=Number(enemy.master??enemy.masterId)||0;
  if(master<=0)continue;
  const label=enemy.label||`Inimigo #${master}`;
  if(!Number.isFinite(Number(enemy.spd))||Number(enemy.spd)<=0)issues.push({code:'enemy-missing-speed',detail:`${label}: informe SPD de combate válida para incluir este adversário na prova.`,severity:'PARCIAL'});
  if(enemy.combat?.oblivion!==true&&quickSkillOptions(master).some(s=>s.isPassive&&s.coverage!=='supported'))issues.push({code:'enemy-passive-conditional',detail:`${label}: passiva condicional ou não modelada; exige revisão das condições e eventos inimigos.`,severity:'PARCIAL'});
 }
 return issues;
}

export function certifyTuning(team={},preview){
 const reasons=enemyCoverageIssues(team),coverage=mechanicCoverage(team),add=(code,detail,severity='PARCIAL')=>reasons.push({code,detail,severity});
 const active=(team.configs||[]).filter(c=>c.enabled!==false),turns=(preview?.turns||[]).filter(t=>!t.enemy);
 const complete=!!active.length&&active.every(c=>c.masterId)&&preview?.complete===true;
 if(!complete||preview?.partial)add('incomplete','Composição ou primeira rotação incompleta.');
 if(active.some(c=>c.sourceMissing?.length))add('equipment-missing','Há equipamento ou dados de equipamento ausentes no snapshot.');
 if(team.gameMode==='rta')add('rta-experimental','RTA ainda exige certificação matemática específica.');
 if(!Array.isArray(preview?.scenario?.firstTurns)||!Array.isArray(preview?.scenario?.state))add('telemetry-missing','Não há telemetria completa do simulador para certificar este cenário.');
 if(preview?.error)add('simulation-error',String(preview.error),'BLOCKED');
 if(preview?.cut===true)add('cut','O simulador observou interrupção da sequência.','BLOCKED');
 if(turns.some(t=>t.disabled||t.skipped))add('blocked-turn','Uma ação foi impedida; barra pronta não garante execução.','BLOCKED');
 if(complete&&turns.length>=active.length&&active.some((c,i)=>turns[i]?.key!==c.key))add('order','A ordem observada difere da ordem desejada.','BLOCKED');
 if(complete&&turns.length<active.length)add('rotation-incomplete','Nem todos os aliados tiveram sua primeira ação observada.');
 if(team.syncAudit?.safe===false)add('sync-failed',team.syncAudit.reason||'As metas de sincronia não foram comprovadas neste cenário.','BLOCKED');
 if(preview?.scenario?.captureTruncated||preview?.captureTruncated)add('truncated','A captura de ticks foi truncada; esta evidência não certifica a rotação completa.');
 if(preview?.scenario?.risks?.length)add('conditional-events','Há riscos ou efeitos condicionais: '+preview.scenario.risks.join(' · '));
 const explicit=Number(team.enemyCombatSpd)>0||(team.combatScenario?.enemies||[]).some(e=>Number(e.spd)>0);
 if(!explicit)add('reference-automatic','Não há adversário com SPD explicitamente informada; a referência automática não certifica uma defesa real.');
 if(preview?.cut!==false&&preview?.cut!==true)add('cut-unknown','Não há conclusão explícita do simulador sobre a interrupção da sequência.');
 for(const row of coverage){
  if(row.selected.hypothetical)add('hypothetical-skill',`${row.label}: perfil de habilidade hipotético, diferente da forma selecionada.`);
  if(row.selected.legacyBonus>0)add('legacy-skill-bonus',`${row.label}: bônus manual legado sem curva de skill-up certificada.`);
  if(row.masterId===11533&&!row.selected.levelKnown)add('skill-level-unknown',`${row.label}: nível da habilidade do Bernard 2A não informado.`);
  if(row.selected.coverage!=='supported')add('skill-unmodeled',`${row.label}: efeitos da habilidade selecionada não são modelados automaticamente.`);
  if(!row.oblivion&&row.passives.some(p=>p.coverage!=='supported'))add('passive-conditional',`${row.label}: passiva condicional ou não modelada; exige revisão das condições e eventos.`);
 }
 const status=reasons.some(r=>r.severity==='BLOCKED')?'BLOCKED':reasons.length?'PARCIAL':'VALIDADO';
 return {status,scope:'Primeira rotação no cenário informado',reasons,coverage,
  minimum:{status:'BLOCKED',detail:'Ordem e ausência de corte não provam SPD mínima global. É necessária evidência específica da busca e do limite inferior.'},
  parity:{status:'BLOCKED',detail:'Paridade com SWCALC não certificada: faltam entradas e resultados externos reproduzíveis e revisados.'}};
}
