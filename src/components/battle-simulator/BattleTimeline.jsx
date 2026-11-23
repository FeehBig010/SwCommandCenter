import {useState} from 'react';
import {EFFECTS, AMOUNTS} from '../../core/battle-simulator';

const format = value => new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(value);
const statusName = {speedBuff:'buff de velocidade',slow:'debuff de velocidade',disabled:'atordoamento',immunity:'imunidade'};
const effectText = effect => {
  if(effect.type==='expired')return `Fim do efeito · ${statusName[effect.field]}`;
  if(effect.type==='immune')return 'Debuff bloqueado por imunidade';
  return (EFFECTS[effect.type] ?? effect.type) + (AMOUNTS.includes(effect.type)?` · ${format(effect.amount)} p.p.`:'');
};

export default function BattleTimeline({result, names}) {
  const [tab,setTab] = useState('turns');
  if(!result)return <p>Selecione um monstro para calcular a ordem.</p>;
  const initial = result.log.filter(effect=>effect.tick===0);
  const showEffects = effects => effects.length>0&&<ul className="battle-log">{effects.map((effect,index)=><li key={index}>
    <strong>{names[effect.source]}{effect.label?` · ${effect.label}`:''}</strong>
    <span>{effectText(effect)} · {effect.targets.map(key=>names[key]).join(', ') || 'Nenhum alvo atende à regra'}</span>
  </li>)}</ul>;
  return <>
    <div className="battle-actions" aria-label="Visualização do resultado">
      <button className="button small" aria-pressed={tab==='turns'} onClick={()=>setTab('turns')}>Ordem e efeitos</button>
      <button className="button small" aria-pressed={tab==='ticks'} onClick={()=>setTab('ticks')}>Barras por tick</button>
    </div>
    {result.cut&&<p className="battle-cut">Corte detectado na primeira rotação. Um inimigo age antes de pelo menos um aliado.</p>}
    {initial.length>0&&<details open><summary>Turno 0 · Efeitos iniciais</summary>{showEffects(initial)}</details>}
    {tab==='turns'?<ol className="battle-turns">{result.turns.map((turn,index)=>{
      const snapshot=result.tickSnapshots.find(row=>row.tick===turn.tick);
      const runnerUp=snapshot?.bars.filter(bar=>!bar.dead&&bar.key!==turn.key).sort((a,b)=>b.atb-a.atb)[0];
      return <li key={turn.tick} className={turn.enemy?'battle-enemy':'battle-ally'}>
        <details>
          <summary><span className="battle-order">{index+1}</span><strong>{names[turn.key]}</strong>
            <span>Tick {turn.tick} · {format(turn.atb)}% ATB</span></summary>
          <p>{turn.disabled?'Turno consumido por atordoamento.':turn.forced?'Turno acionado por passiva.':`ATB apta para agir · SPD ${turn.spd}${runnerUp?` · Próxima maior barra: ${names[runnerUp.key]} (${format(runnerUp.atb)}%)`:''}.`}</p>
          {showEffects(result.log.filter(effect=>effect.tick===turn.tick))}
        </details>
      </li>;
    })}</ol>:<div className="battle-ticks" tabIndex={0} role="region" aria-label="Barras de ataque por tick">
      <table><caption>ATB antes e depois da ação, em %. A velocidade após o efeito aparece quando muda.</caption>
      <thead><tr><th>Tick</th><th>Ação</th>{Object.keys(names).map(key=><th key={key}>{names[key]}</th>)}</tr></thead>
      <tbody>{result.tickSnapshots.map(row=><tr key={row.tick}><th scope="row">{row.tick}</th><td>{names[row.actingKey]??'—'}</td>
        {row.bars.map(bar=><td key={bar.key} className={bar.acted?'battle-acted':''}>{format(bar.atb)}
          {bar.atb!==bar.atbPost&&<span> → {format(bar.atbPost)}</span>}
          {bar.spd!==bar.spdPost&&<small>SPD {bar.spdPost}</small>}</td>)}</tr>)}</tbody></table></div>}
    {result.captureTruncated&&<p>Histórico detalhado até o tick {result.captureTickLimit}. A ordem acima cobre todos os turnos solicitados.</p>}
    {result.risks.length>0&&<ul className="battle-risks">{result.risks.map(risk=><li key={risk}>{risk}</li>)}</ul>}
  </>;
}
