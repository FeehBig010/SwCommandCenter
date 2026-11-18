// Presentation of observed engine telemetry only; no alternate combat formula.
export function calculatorScenarioStatus(team,preview){
 if(team?.gameMode==='rta')return {state:'experimental',label:'RTA experimental',detail:'World Arena exige validação específica. Esta prévia não garante sincronia RTA.'};
 const active=(team?.configs||[]).filter(c=>c.enabled!==false);
 if(!active.length||active.some(c=>!c.masterId)||!preview?.complete)return {state:'partial',label:'Cenário parcial',detail:'Selecione os monstros ativos para avaliar a sequência completa.'};
 const turns=(preview.turns||[]).filter(t=>!t.enemy);
 if(preview.cut===true)return {state:'cut',label:'Corte observado',detail:'A sequência aliada não foi completada antes da interrupção observada. Consulte os eventos e as condições dos monstros.'};
 if(turns.some(t=>t.skipped||t.disabled))return {state:'blocked',label:'Turno impedido',detail:'Há uma ação impedida no cenário. Barra pronta não garante que a habilidade será executada.'};
 if(turns.length<active.length)return {state:'partial',label:'Cenário parcial',detail:'A simulação ainda não observou a primeira ação de todos os aliados.'};
 if(active.some((c,i)=>turns[i]?.key!==c.key))return {state:'order',label:'Ordem inválida',detail:'A sequência observada difere da ordem definida nos cards.'};
 const explicit=Number(team.enemyCombatSpd)>0||(team.combatScenario?.enemies||[]).some(e=>Number(e.spd)>0);
 if(!explicit)return {state:'no-reference',label:'Sem referência informada',detail:'Os mínimos podem usar abridor −1 SPD como referência automática. Não é garantia contra qualquer defesa.'};
 if(preview.cut===false)return {state:'synchronized',label:'Sincronia no cenário',detail:'A primeira sequência respeita a ordem neste cenário. Efeitos condicionais dependem dos eventos informados.'};
 return {state:'partial',label:'Referência pendente',detail:'A simulação não forneceu evidência suficiente para avaliar o corte.'};
}
