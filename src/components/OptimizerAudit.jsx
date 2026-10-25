import InfoTooltip from './InfoTooltip';
import {LABELS,STAT_NAMES} from '../core/data';
const fmt=n=>Number(n).toLocaleString('pt-BR');
function GainBadges({gains,before,suffix}){return <div className="audit-gain-badges">{Object.entries(gains).filter(([,n])=>n!==0).map(([stat,n])=><span key={stat} data-loss={n<0||undefined} title={`${LABELS[stat]}: ${fmt(before[stat])} → ${fmt(before[stat]+n)}`}>{n>0?'+':''}{stat==='hp'?`${Math.round(n/Math.max(1,before.hp)*1000)/10}%`:fmt(n)} {LABELS[stat]}{suffix?` · ${suffix}`:''}</span>)}</div>;}
export default function OptimizerAudit({audit}){
 if(!audit)return null;
 return <section className="optimizer-audit-report" aria-label="Auditoria inteligente"><header><h3>Auditoria Inteligente</h3><InfoTooltip label="Limites e origem das melhorias">Busca incremental limitada a trocas de runas soltas. As builds abaixo usam runas reais e não incluem as projeções de pedras. Grinds/Gemas são um plano alternativo nas runas originais, com estoque compartilhado verificado; ganhos representam a rolagem máxima possível. Nenhum item foi consumido ou alterado no JSON.</InfoTooltip></header>
  <div className="audit-summary"><span>{audit.changes.length} troca(s) de runa</span><span>{audit.craftPlans.reduce((n,p)=>n+p.steps.length,0)} aplicação(ões) potencial(is) de pedras</span><span>{!audit.syncEnabled?'Sem trava de ordem · Turno 2':audit.syncValid?'Regras de sincronia atendidas':'Sincronia não validada'}</span></div>
  {!audit.changes.length&&!audit.craftPlans.length&&<p>Sem melhorias seguras encontradas nesta busca com o estoque disponível.</p>}
  {audit.changes.map((change,i)=><article key={i}><strong>{change.name} · Nova Runa Slot {change.slot}</strong><GainBadges gains={change.gains} before={change.before}/><small>Runa #{change.oldRuneId} → #{change.runeId} · atributo principal preservado</small></article>)}
  {audit.craftPlans.length>0&&<div className="audit-craft-projections"><h4>Grinds / Gemas disponíveis · Potencial máximo</h4><p>Alternativa nas runas originais. Não somada às trocas acima.</p>{audit.craftPlans.map(plan=><article key={plan.key}><strong>{plan.name}</strong><GainBadges gains={plan.gains} before={plan.before} suffix={plan.steps.every(s=>s.kind==='grind')?'em Grinds':plan.steps.every(s=>s.kind==='gem')?'em Gemas':'em Grinds/Gemas'}/><details><summary>Ver pedras e runas ({plan.steps.length})</summary>{plan.steps.map((step,i)=><p key={i}>{step.kind==='grind'?'Grind':'Gema'} #{step.craftId} · Runa #{step.runeId} (Slot {step.slot}) · {STAT_NAMES[step.stat]} até +{step.maxRoll}</p>)}</details></article>)}</div>}
  {audit.exhausted&&<p>Limite da busca atingido. As sugestões encontradas foram validadas; outras melhorias podem existir.</p>}
 </section>;
}
