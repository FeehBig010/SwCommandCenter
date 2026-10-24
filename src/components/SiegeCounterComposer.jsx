import {useMemo,useState} from 'react';
import {blankConfig,ELEMENTS} from '../core/data';
import {MONSTER_CATALOG} from '../core/monsters';
import {catalogLeader} from '../core/leader-catalog';
import {LEADER_STATS,LEADER_SCOPES} from '../core/leaders';
import {cleanSiegeCounter} from '../core/siege';
import {portableTeam,copyTeamToOptimizer} from '../core/hub';
import {autoFillTeam} from '../core/team-autofill';
import MonsterCombobox from './MonsterCombobox';
import SiegeKillOrder from './SiegeKillOrder';
import MonsterPortrait from './MonsterPortrait';
import {MonsterEditor} from './TeamEditor';
export const SIEGE_CHOICES=MONSTER_CATALOG.map(m=>({value:String(m.master),...m}));
export function LeaderLabel({leader}){return <span className="siege-leader">{leader?`Líder: +${leader.value}% ${LEADER_STATS[leader.stat]} · ${LEADER_SCOPES[leader.scope]}${leader.scope==='element'?` (${ELEMENTS[leader.element]})`:''}${['arena','dungeon'].includes(leader.scope)?' · inativo em Siege':''}`:'Sem habilidade de líder'}</span>;}
function LeaderControl({label,monsters,index,leader,onChange}){
 const update=l=>onChange(index,l);
 return <fieldset className="siege-leader-control"><legend>{label}</legend><label className="field"><span>Monstro líder</span><select value={index} onChange={e=>{const i=Number(e.target.value);onChange(i,catalogLeader(monsters[i]?.masterId));}}>{monsters.map((m,i)=><option value={i} key={i}>{i+1}. {m?.label||'Selecionar'}</option>)}</select></label><button className="button small" type="button" onClick={()=>update(catalogLeader(monsters[index]?.masterId))}>Usar habilidade do catálogo</button><div className="three-fields"><label className="field"><span>Atributo</span><select value={leader?.stat||''} onChange={e=>update(e.target.value?{stat:e.target.value,value:leader?.value||24,scope:leader?.scope||'guild',element:leader?.element||1}:null)}><option value="">Sem líder</option>{Object.entries(LEADER_STATS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>{leader&&<><label className="field"><span>Bônus %</span><input type="number" min="1" max="100" required value={leader.value} onChange={e=>update({...leader,value:Number(e.target.value)})}/></label><label className="field"><span>Escopo</span><select value={leader.scope} onChange={e=>update({...leader,scope:e.target.value,element:leader.element||1})}>{Object.entries(LEADER_SCOPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></>}</div>{leader?.scope==='element'&&<label className="field"><span>Elemento do bônus</span><select value={leader.element} onChange={e=>update({...leader,element:Number(e.target.value)})}>{Object.entries(ELEMENTS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>}<LeaderLabel leader={leader}/></fieldset>;
}
export default function SiegeCounterComposer({initial,teams=[],account,onSave,onCancel,canShare=false,initialShare=false,defenseSeed,offenseSeed,author='Membro local'}){
 const hydrate=offense=>autoFillTeam(copyTeamToOptimizer(offense,account),account,{speedTick:7});
 const [draft,setDraft]=useState(()=>initial?{...cleanSiegeCounter(initial),offense:hydrate(initial.offense)}:{name:'Novo counter de Siege',offense:offenseSeed?hydrate(offenseSeed):{name:'Ofensa Siege',mode:'attack',leaderIndex:0,leader:null,configs:Array.from({length:3},()=>({...blankConfig(),basis:'total',sets:[],mains:{2:0,4:0,6:0},combatSpd:0,maxTick:0}))},enemyDefense:defenseSeed?.enemyDefense||[null,null,null],notes:'',siege:{speedTick:7,killOrder:[],requireOrder:true,beforeEnemy:true,defenseLeader:defenseSeed?.defenseLeader||null,defenseLeaderIndex:defenseSeed?.defenseLeaderIndex||0,authorLabel:author}}),[share,setShare]=useState(initial?initialShare:canShare),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const setOffense=patch=>setDraft(d=>({...d,offense:autoFillTeam({...d.offense,...patch},account,{speedTick:d.siege.speedTick})}));
 const setSpec=patch=>setDraft(d=>({...d,siege:{...d.siege,...patch}}));
 async function submit(e){e.preventDefault();setBusy(true);setError('');try{await onSave(cleanSiegeCounter({...draft,offense:{...draft.offense,name:draft.name}}),share);}catch(e){setError(e.message);}finally{setBusy(false);}}
 const offenseChoices=useMemo(()=>account?account.units.map(unit=>({value:`unit:${unit.id}`,master:unit.master,name:unit.name,element:unit.element,unitId:unit.id,detail:`Nv. ${unit.level}`})):SIEGE_CHOICES,[account]);
 function selectAttacker(index,choice){
  const unit=account?.units.find(u=>u.id===choice?.unitId),previous=draft.offense.configs[index];
  const next={...blankConfig(unit),key:previous.key,masterId:choice?.master||null,label:choice?.name||'Escolher monstro',basis:'total',sets:[],mains:{2:0,4:0,6:0},combatSpd:0,maxTick:0};
  setOffense({configs:draft.offense.configs.map((c,i)=>i===index?next:c),...(index===(draft.offense.leaderIndex||0)?{leader:catalogLeader(next.masterId),leaderSpd:0}:{})});
 }
 function selectDefender(index,choice){setDraft(d=>({...d,enemyDefense:d.enemyDefense.map((m,i)=>i===index?(choice?{masterId:choice.master,label:choice.name}:null):m),siege:{...d.siege,killOrder:d.enemyDefense[index]?.masterId===choice?.master?d.siege.killOrder:(d.siege.killOrder||[]).filter(slot=>slot!==index),...(index===(d.siege.defenseLeaderIndex||0)?{defenseLeader:catalogLeader(choice?.master)}:{})}}));}
 return <form className="siege-composer" onSubmit={submit}>
  <h2>{initial?'Editar counter':defenseSeed?'Adicionar Counter':'Novo counter · 3 contra 3'}</h2>
  <fieldset disabled={busy}>

   <section className="siege-defense-header" aria-label="Defesa alvo">
    <div className="siege-defense-caption"><h3>Defesa Inimiga</h3><LeaderLabel leader={draft.siege.defenseLeader}/></div>
    <div className="siege-defense-summary">{draft.enemyDefense.map((m,i)=><div className="siege-defense-summary-unit" key={i}>
     <MonsterPortrait unit_master_id={m?.masterId} name={m?.label||`Defesa ${i+1}`} element={m?.masterId%10}/><strong>{m?.label||`Defesa ${i+1}`}</strong>
    </div>)}</div>
   </section>
   {!defenseSeed&&<details className="siege-defense-selectors" open={draft.enemyDefense.every(m=>m?.masterId)?undefined:true}>
    <summary>{draft.enemyDefense.every(m=>m?.masterId)?'Alterar defesa inimiga':'Selecionar defesa inimiga'}</summary>
    <fieldset className="siege-defense-picker" aria-label="Defesa inimiga">
     <div className="siege-counter-lineup">{draft.enemyDefense.map((m,i)=><MonsterCombobox key={i} label={`Defesa ${i+1}`} options={SIEGE_CHOICES} value={String(m?.masterId||'')} onChange={choice=>selectDefender(i,choice)}/>)}</div>
    </fieldset>
   </details>}
   <div className="siege-counter-meta"><label className="field"><span>Nome do counter</span><input required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label className="field"><span>Preencher com meu time</span><select defaultValue="" onChange={e=>{const t=teams.find(t=>t.id===e.target.value);if(t)try{setOffense(hydrate(portableTeam(t,account)));setError('');}catch(e){setError(e.message);}}}><option value="">Criar do zero</option>{teams.filter(t=>t.configs.length===3).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label></div>
   <div className="siege-offense-workspace">
    <section className="siege-counter-panel siege-counter-attack" aria-label="Painel de Ataque / Counter">
     <h3>Ataque / Counter</h3>

     <div className="siege-offense-content"><div className="siege-counter-lineup">{draft.offense.configs.map((c,i)=><div className="siege-attack-slot" key={c.key||i}>
      <MonsterPortrait unit_master_id={c.masterId} name={c.label} element={c.masterId%10}/>
      <MonsterCombobox label={`Ataque ${i+1}`} options={offenseChoices} value={account?c.unitId?`unit:${c.unitId}`:'':String(c.masterId||'')} onChange={choice=>selectAttacker(i,choice)}/>
     </div>)}</div>
     <SiegeKillOrder defense={draft.enemyDefense} order={draft.siege.killOrder} onChange={killOrder=>setSpec({killOrder})}/></div>
    </section>
   </div>
   <label className="field siege-counter-strategy"><span>Descrição / Estratégia (Opcional)</span><textarea rows={3} maxLength={1000} placeholder="Ex.: foque o suporte primeiro e guarde a imunidade para a segunda rotação." value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
   <details className="siege-counter-build"><summary>Ajustar atributos e velocidade do ataque</summary><div className="siege-trio">{draft.offense.configs.map((c,i)=><div key={c.key||i}><MonsterEditor catalogMode={!account} team={{...draft.offense,gameMode:'siege'}} config={c} index={i} slotCount={3} account={account} options={{speedTick:draft.siege.speedTick}} onLeader={leader=>setOffense({leader,leaderIndex:i,leaderSpd:0})} leaderActive={!!draft.offense.leader&&(draft.offense.leaderIndex||0)===i} onChange={next=>setOffense({configs:draft.offense.configs.map((x,j)=>j===i?next:x),...(i===(draft.offense.leaderIndex||0)&&next.masterId!==c.masterId?{leader:catalogLeader(next.masterId),leaderSpd:0}:{})})}/><label className="field"><span>SPD de combate mínimo · posição {i+1}</span><input aria-label={`SPD de combate ${i+1}`} type="number" min="0" max="10000" value={c.combatSpd||0} onChange={e=>setOffense({configs:draft.offense.configs.map((x,j)=>j===i?{...x,combatSpd:Number(e.target.value)}:x)})}/></label><label className="field"><span>Agir até o Tick (0 = livre)</span><input aria-label={`Tick máximo ${i+1}`} type="number" min="0" max="10000" step="1" value={c.maxTick||0} onChange={e=>setOffense({configs:draft.offense.configs.map((x,j)=>j===i?{...x,maxTick:Number(e.target.value)}:x)})}/></label></div>)}</div><LeaderControl label="Líder da ofensa" monsters={draft.offense.configs} index={draft.offense.leaderIndex||0} leader={draft.offense.leader} onChange={(i,l)=>setOffense({leaderIndex:i,leader:l,leaderSpd:0})}/></details>
   <div className="three-fields"><label className="field"><span>Autor informado · registro local</span><input maxLength={80} value={draft.siege.authorLabel} onChange={e=>setSpec({authorLabel:e.target.value})}/></label></div><label className="check-label"><input type="checkbox" checked={draft.siege.requireOrder} onChange={e=>setSpec({requireOrder:e.target.checked})}/>Exigir ordem dos cards 1 → 2 → 3</label>{canShare&&<label className="check-label"><input type="checkbox" checked={share} onChange={e=>setShare(e.target.checked)}/>Compartilhar com a guilda ativa</label>}<p className="fineprint">Ticks são instantes globais do simulador (uma ação por tick). SPD de combate inclui torre e líder; as demais metas usam a ficha. Sem meta SPD/Tick, a checagem pede ajuste.</p><div className="button-group"><button type="submit" className="button primary">{busy?'Salvando…':'Salvar counter'}</button><button type="button" className="button" onClick={onCancel}>Cancelar</button></div>
  </fieldset>
  {error&&<p className="notice warning" role="alert">{error}</p>}
 </form>;
}
