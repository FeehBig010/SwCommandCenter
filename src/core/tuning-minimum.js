import {quickPreview,quickRuneSpeed,updateQuickRuneSpeed} from './quick-calculator.js';
import {firstRotationSafe} from './speedTuner.js';
import {resolvedQuickSkill} from './quick-skill-effects.js';
import {mechanicCoverage,enemyCoverageIssues} from './tuning-certification.js';

// A finite exhaustive search for ONE rune contribution. Other sheets, equipment,
// placement, skills and scenario inputs are fixed. This is not a joint optimum.
export function proveRuneMinimum(team,key,{maxRuneSpd=600,criterion='rotation',targetTick,safetyMargin=0}={}){
 const base={status:'BLOCKED',minimum:null,actualRuneSpd:null,delta:null,below:null,planned:null,checked:0,bound:maxRuneSpd,scope:'Uma contribuição de SPD de runas; demais builds fixas; intervalo inteiro limitado.'};
 const blocked=reason=>({...base,reason});
 if(!Array.isArray(team?.configs)||!['tick','rotation'].includes(criterion)||!Number.isInteger(maxRuneSpd)||maxRuneSpd<0||maxRuneSpd>600||!Number.isInteger(safetyMargin)||safetyMargin<0||safetyMargin>600)return blocked('Parâmetros da prova inválidos.');
 if(team.gameMode==='rta')return blocked('RTA permanece experimental e não possui certificação de mínimos.');
 const config=team.configs.find(c=>c.key===key);
 if(!config?.masterId||config.enabled===false)return blocked('Selecione um monstro ativo para verificar o mínimo.');
 const tick=targetTick??config.tickTarget;
 if(criterion==='tick'&&(!Number.isInteger(tick)||tick<1||tick>30))return blocked('Meta de tick inválida; use um inteiro entre 1 e 30.');
 let actualRuneSpd;try{actualRuneSpd=quickRuneSpeed(config);}catch{return blocked('Ficha de velocidade ausente ou inválida.');}
 if(!Number.isFinite(actualRuneSpd))return blocked('Ficha de velocidade ausente ou inválida.');
 base.actualRuneSpd=actualRuneSpd;
 const active=team.configs.filter(c=>c.enabled!==false),keys=active.filter(c=>c.masterId).map(c=>c.key),partial=active.some(c=>!c.masterId||c.sourceMissing?.length);
 const hypothetical=active.some(c=>{const skill=resolvedQuickSkill(c);return skill.hypothetical||skill.legacyBonus>0;});
 const fixed={...team,configs:team.configs.map(c=>c.key===key?{...c,manualSpeed:true,syncMinimum:null,syncCombatTarget:null}:c)};
 const conditional=new Set(enemyCoverageIssues(team).map(issue=>issue.detail));
 if(partial)conditional.add('Dados parciais: prova restrita aos monstros e equipamentos conhecidos.');
 if(hypothetical)conditional.add('Perfil hipotético ou bônus legado não certificado.');
 if(criterion==='rotation'&&!(Number(team.enemyCombatSpd)>0||(team.combatScenario?.enemies||[]).some(e=>Number(e.spd)>0)))conditional.add('Sem referência inimiga explícita; prova não certifica cortes contra uma defesa informada.');
 for(const row of mechanicCoverage(team)){
  if(row.selected?.coverage!=='supported')conditional.add(`${row.label}: habilidade selecionada sem efeito automático modelado.`);
  if(Number(row.masterId)===11533&&!row.selected?.levelKnown)conditional.add(`${row.label}: skill-ups relevantes desconhecidos.`);
  if(!row.oblivion&&row.passives?.some(p=>p.coverage!=='supported'))conditional.add(`${row.label}: passiva condicional ou não modelada integralmente.`);
 }
 function evaluate(runeSpd){
  const candidate=updateQuickRuneSpeed(fixed,key,runeSpd,false);
  const p=quickPreview(candidate,{includePartial:true,captureReadiness:true});
  if(!p.complete||!p.scenario)throw new Error('Simulador não produziu uma rotação avaliável.');
  for(const risk of p.scenario.risks||[])conditional.add(risk);
  const ready=p.scenario.firstReady?.find(r=>r.key===key&&!r.forced),turn=p.turns?.find(r=>r.key===key);
  const passed=criterion==='tick'?!!ready&&ready.tick<=tick:firstRotationSafe(p.scenario,keys);
  return {runeSpd,passed,readyTick:ready?.tick??null,actionTick:turn?.tick??null,cut:p.cut??null};
 }
 let previous=null;
 try{
  for(let runeSpd=0;runeSpd<=maxRuneSpd;runeSpd++){
   const witness=evaluate(runeSpd);base.checked++;
   if(witness.passed){
    // The bound limits the proof search, not the separately simulated proposal.
    // A margin is hypothetical; this does not certify obtainable equipment.
    const planned=evaluate(runeSpd+safetyMargin);
    return {...base,status:conditional.size?'PARCIAL':'VALIDADO',reason:conditional.size?[...conditional].join(' '):'Mínimo exaustivo no intervalo informado, com as demais builds fixas.',minimum:runeSpd,delta:runeSpd-actualRuneSpd,below:previous,minimumWitness:witness,planned:{...planned,safetyMargin},criterion,...(criterion==='tick'?{targetTick:tick}:{})};
   }
   previous=witness;
  }
 }catch(error){return {...base,reason:`Prova interrompida: ${error.message}`};}
 return {...base,reason:`Nenhum mínimo encontrado no intervalo de +0 a +${maxRuneSpd} SPD de runas; não prova impossibilidade fora desse intervalo.`,below:previous};
}
