import {useMemo} from 'react';
import {LABELS,SETS} from '../core/data';
import {calculateStats,artifactBonus,setCounts,goalValue} from '../core/optimizer';
import {combatAttributes} from '../core/speedTuner';
import {artifactEffects} from '../core/artifacts';
import {targetGoalsOf,targetIssue,targetSetReport,TARGET_STATS} from '../core/target-goals';
import {orderRuneSets} from '../core/rune-sets';
import MonsterPortrait from './MonsterPortrait';
import './CloneTargetComparison.css';
const FOUR=new Set([3,5,8,10,11,13]);
const fmt=value=>Number(value).toLocaleString('pt-BR',{maximumFractionDigits:1});
function Sets({sets}){return sets.length?<span className="clone-target-sets">{orderRuneSets(sets).filter(id=>SETS[id]).map((id,i)=><img key={i} src={`/game-icons/runes/${SETS[id].toLowerCase()}.png`} alt={SETS[id]} title={SETS[id]}/>)}</span>:<span>—</span>;}
export default function CloneTargetComparison({team,account,options={},builds,onOptimize,running=false}){
 const view=useMemo(()=>{
  try{const target=targetGoalsOf(team);return {target,rows:target.configs.map(goal=>{
   const own=team.configs.find(c=>c.key===goal.key),unit=account?.units.find(u=>u.id===own?.unitId),runes=(unit?.runeIds||[]).map(id=>account.runes.find(r=>r.id===id)).filter(Boolean),counts=setCounts(runes);
   const stats=unit?calculateStats(unit,runes,options.artifacts!==false&&goal.artifacts!==false?artifactBonus(account,unit):{}):null;
   if(stats)stats.combat=combatAttributes(unit,stats,counts,team,goal.combat,artifactEffects(account,unit,options.artifacts!==false&&goal.artifacts!==false));
   const suggestion=builds?.find(b=>b.teamId===team.id&&b.key===goal.key&&b.unitId===unit?.id);
   return {goal,unit,stats,sets:Object.entries(counts).flatMap(([id,n])=>Array(Math.floor(n/(FOUR.has(Number(id))?4:2))).fill(Number(id))),setsMet:targetSetReport(counts,goal.sets).every(s=>s.met),suggestion};
  })};}catch(e){return {error:e.message,rows:[]};}
 },[team,account,options,builds]);
 const issue=view.error||targetIssue(team,account);
 return <section className="clone-target-comparison" aria-label="Comparação com as metas copiadas">
  <header><div><span className="template-badge">Metas alvo da guilda</span><h2>{view.target?.sourceName||'Time clonado'}</h2></div><button type="button" className="button primary" disabled={running||!!issue} onClick={()=>onOptimize(team.id,{matchTargets:true})}>{running?'Otimizando…':'Otimizar Runas (Bater Meta)'}</button></header>
  {issue&&<p className="notice warning" role="status">{issue}</p>}
  <div className="clone-target-order" aria-label="Ordem obrigatória da meta">{view.rows.map(({goal},i)=><span key={goal.key}>{i+1}. {goal.label}{goal.maxTick>0?` · até Tick ${goal.maxTick}`:''}</span>)}</div>
  <div className="clone-target-grid">{view.rows.map(({goal,unit,stats,sets,setsMet,suggestion})=><article key={goal.key} className="clone-target-monster" aria-label={`Comparação de ${goal.label}`}>
   <div className="monster-heading"><MonsterPortrait unit_master_id={goal.masterId} name={goal.label}/><div><strong>{goal.label}</strong><small>{goal.basis==='bonus'?'Atributos adicionais (+)':'Ficha total'} · TC/DC/RES/ACC totais</small></div></div>
   {!unit&&<p className="fineprint">Cópia ausente no SWEX.</p>}
   <table><thead><tr><th>Status</th><th>Atual SWEX</th><th>Meta</th>{suggestion&&<th>Sugestão</th>}</tr></thead><tbody>{TARGET_STATS.map(key=>{
    const target=Number(goal.goals[key]),actual=stats?goalValue(stats,goal,key):null,proposed=suggestion?goalValue(suggestion.stats,goal,key):null;
    return <tr key={key}><th>{LABELS[key]}</th><td>{actual==null?'—':fmt(actual)}</td><td className={target>0&&actual!=null?(actual>=target?'status-good':'status-warn'):''}>{target>0?fmt(target):'—'}</td>{suggestion&&<td className={target>0&&proposed<target?'status-warn':'status-good'}>{fmt(proposed)}</td>}</tr>;
   })}{goal.combatSpd>0&&<tr><th>SPD combate</th><td>{stats?fmt(stats.combat.spd):'—'}</td><td>{fmt(goal.combatSpd)}</td>{suggestion&&<td>{fmt(suggestion.stats.combat.spd)}</td>}</tr>}</tbody></table>
   <div className="clone-set-comparison"><div><small>Sets atuais</small><Sets sets={sets}/></div><div className={setsMet?'status-good':'status-warn'}><small>Sets da meta</small><Sets sets={goal.sets}/></div></div>
  </article>)}</div>
  <p className="fineprint">Runas atuais do inventário e filtros ativos. A busca rejeita quebras da ordem e dos ticks e aproxima os atributos e conjuntos. A sugestão não altera o JSON.</p>
 </section>;
}
