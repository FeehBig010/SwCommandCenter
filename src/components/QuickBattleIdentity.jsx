import {calculatorReference} from '../core/calculator-leadership';
import {Crown,Zap} from 'lucide-react';
import {quickLeader} from '../core/quick-calculator';
import {leaderApplies,LEADER_SCOPES} from '../core/leaders';
export function QuickCardIdentity({config,index,team,leadership,onLeader}){
 const selected=!!team.leader&&team.leaderKey===config.key,ability=selected?(leadership.state==='invalid'?null:team.leader):quickLeader(config.masterId),applies=ability&&leaderApplies(ability,{master:config.masterId,element:config.masterId%10},team.gameMode);
 return <div className="quick-card-identity"><div className="quick-role-line"><span className={`quick-role-badge ${index===0?'is-starter':''}`}>{index===0&&<Zap size={14}/>} {index+1}ª AÇÃO{index===0?' · ABRIDOR':''}</span>{selected&&<span className={`quick-role-badge is-leader ${leadership.state==='inactive'?'is-inactive':''}`}><Crown size={14}/>{leadership.state==='inactive'?'LÍDER · INATIVO':'LÍDER'}</span>}</div>
 {config.masterId&&<button type="button" className="quick-leader-action" aria-pressed={selected} aria-label={`${selected?'Retirar liderança de':'Escolher liderança de'} ${config.label}`} disabled={!ability&&!selected} onClick={onLeader}><Crown size={16}/><span>{selected?'Liderança selecionada':ability?'Usar como líder':'Sem habilidade de líder'}</span>{ability&&<strong>+{ability.value}% {ability.stat.toUpperCase()}<small>{LEADER_SCOPES[ability.scope]}{!applies?' · não se aplica neste modo':''}</small></strong>}</button>}
 </div>;
}
export default function QuickBattleIdentity({team,preview,timing,leadership}){
 const count=team.configs.filter(c=>c.masterId&&c.enabled!==false).length,reference=calculatorReference(team,preview,timing);
 return <section className="quick-battle-summary" aria-label="Resumo da composição"><div className="quick-leadership" role="region" aria-label="Liderança da composição" data-state={leadership.state}><span className="quick-leadership-symbol"><Crown size={28}/></span><div><span className="quick-summary-label">LÍDER · {count}/{team.configs.length} MONSTROS</span><strong className="quick-leader-name">{leadership.name}</strong><span className="quick-leader-effect">{leadership.effect}{leadership.scope&&<small> · {leadership.scope}</small>}</span><span className="quick-leader-status">{leadership.description}</span></div></div><div className="quick-reference-summary" title={reference.detail}><span className="quick-summary-label">{reference.detail.startsWith('Automática')?'REF. AUTOMÁTICA':'REFERÊNCIA INIMIGA'}</span><strong>{reference.value}</strong></div></section>;
}
