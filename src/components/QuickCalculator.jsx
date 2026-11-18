import {calculatorScenarioStatus} from '../core/calculator-scenario-status';
import useTeamBalance from '../hooks/useTeamBalance';
import {BalancePreferences,BalanceSheet,BalanceRunePicker,BalanceRuleChips} from './BalanceControls';
import {BalanceTeamBar,BalanceSearchBar} from './BalanceTeamBar';
import {balanceTeamForProposal,balanceCurrentTiming} from '../core/team-balance';
import {balanceUnit,balanceLinkKey} from '../core/balance-profile';
import {accountStamp} from '../core/loadouts';
import QuickPresetPicker from './QuickPresetPicker';
import {quickTeamFromPreset,quickPresetArea,QUICK_AREA_LABELS} from '../core/quick-presets';
import MotionValue from './MotionValue';
import ArtifactBonuses from './ArtifactBonuses';
import {Settings2,Trash2,MoreHorizontal} from 'lucide-react';
import {normalizeCombat,gaugeStepForMode,NATURAL_GAUGE_STEP,RTA_GAUGE_STEP} from '../core/speedTuner';
import {leaderApplies,LEADER_SCOPES} from '../core/leaders';
import {tickBreakpointsTable} from '../core/tick-timeline';
import {QUICK_TICK_MIN,QUICK_TICK_MAX,applyQuickInventoryPlan,quickTickObservation,updateQuickTickTarget,quickSpeedTarget,quickRuneSpeed,quickSwiftBonus,updateQuickRuneSpeed,updateQuickRuneSets,toggleQuickSwift,monsterSkillsForCard,updateQuickTowerSpd,updateQuickFirstTurnSkill,applyQuickAutoPresets,updateQuickEnemyReference} from '../core/quick-calculator';
import {reorderTeam} from '../core/team-ux';
import {useMemo,useState} from 'react';
import QuickCardExport from './QuickCardExport';
import {MONSTER_CATALOG} from '../core/monsters';
import {quickTeam,selectQuickMonster,quickPreview,quickLeader,autoTuneQuickTeam,quickOrderLocked} from '../core/quick-calculator';
import {GOAL_PRESETS,toggleGoalFocus,normalizeFocuses,updateAutomaticName} from '../core/team-ux';
import {STATS,LABELS,SETS} from '../core/data';
import MonsterSearch from './MonsterSearch';
import MonsterPortrait from './MonsterPortrait';
import LeaderCrown from './LeaderCrown';
import RuneSetSelector from './RuneSetSelector';
import StatGoalControl from './StatGoalControl';
import TurnTimeline from './TurnTimeline';
import ThreatScanner from './ThreatScanner';
import CombatScenarioEditor from './CombatScenarioEditor';
import CombatContext from './CombatContext';
import MonsterSheet from './MonsterSheet';
import TeamCardExport from './TeamCardExport';
import InfoTooltip from './InfoTooltip';
import './QuickCalculator.css';
import './QuickBalance.css';
import './QuickCalculatorV2.css';
const AREAS=[['arena','Arena',4],['siege','Siege',3],['cairos','Cairos',5],['rta','RTA',4]];
const ELEMENT_FILES={1:'water',2:'fire',3:'wind',4:'light',5:'dark'};
const choices=MONSTER_CATALOG.map(u=>({...u,value:String(u.master)}));
const AUTO={siege:['Mihyang','Anavel','Solveig'],arena:['Moore','Chiwu','Galleon','Lushen'],rta:['Moore','Chiwu','Galleon','Lushen'],cairos:['Julie','Shaina','Kyle','Liam','Konamiya']};
const EMPTY_PRESETS=[];
const EMPTY_OPTIONS={};
const freshTeam=(area,dungeon)=>{const team={...quickTeam(area,dungeon),speedMode:'auto',balanceEnabled:true};return {...team,balanceLinks:Object.fromEntries(team.configs.slice(1).map((c,i)=>[balanceLinkKey(team.configs[i].key,c.key),'strict']))};};
export default function QuickCalculator({account=null,presets=EMPTY_PRESETS,onBuildTeam,canBuild=false,inventoryOptions=EMPTY_OPTIONS,reservedIds=EMPTY_PRESETS,allTeams=EMPTY_PRESETS,handoff=null,onReturnSync,onCancelSync}){
 const [visualVersion,setVisualVersion]=useState('v2');
 const [exporting,setExporting]=useState(false),[viewModes,setViewModes]=useState({}),[showSheet,setShowSheet]=useState(false),[runePicker,setRunePicker]=useState(null);
 const [calcToolMode,setCalcToolMode]=useState('tuning'),[subTab,setSubTab]=useState('sync'),[bpStep,setBpStep]=useState(NATURAL_GAUGE_STEP),[bpInitialAtb,setBpInitialAtb]=useState(0);
 const [autoPresets,setAutoPresets]=useState({autoSwiftStarter:false,autoSwiftOthers:false,autoWillChilling:false});
 // A new visit is always empty. Saved drafts and SWEX presets are never selected implicitly.
 const [area,setArea]=useState(()=>handoff?.team?.gameMode||'siege'),[selected,setSelected]=useState(0),[plans,setPlans]=useState(()=>handoff?.team?{[handoff.team.gameMode]:structuredClone(handoff.team)}:{siege:freshTeam()});const fallback=useMemo(()=>freshTeam(area),[area]),storedTeam=plans[area]||fallback;
 const areas=useMemo(()=>[...AREAS,...(AREAS.some(([key])=>key===area)?[]:[[area,QUICK_AREA_LABELS[area]||area,storedTeam.configs.length]])],[area,storedTeam.configs.length]);
 const baseTeam=useMemo(()=>autoTuneQuickTeam(storedTeam),[storedTeam]);
 const balance=useTeamBalance({account,team:baseTeam,options:inventoryOptions,reservedIds,allTeams,onApply:plan=>update(applyQuickInventoryPlan(plan))});
 const proposal=balance.selected==null?balance.report?.baseline:balance.report?.alternatives[balance.selected];
 const team=useMemo(()=>{if(!proposal)return baseTeam;const next=balanceTeamForProposal(baseTeam,proposal);next.plannedRunes.accountStamp=accountStamp(account);return next;},[baseTeam,proposal,account]);
 const locked=quickOrderLocked(team),balanceTiming=useMemo(()=>{try{return proposal?.timing||balanceCurrentTiming(team);}catch{return null;}},[team,proposal]);
 const accountChoices=useMemo(()=>account?[...account.units.map(u=>({...u,value:`unit:${u.id}`,detail:`Da conta · Nv. ${u.level} · #${u.id}`})),...choices.filter(o=>!account.units.some(u=>u.master===o.master))]:choices,[account]);
 const update=next=>setPlans(all=>{const previous=all[area]||baseTeam,changed=typeof next==='function'?next(previous):next;const keepTower=changed.speedMode==='snapshot'||changed.customTowerSpd||previous.customTowerSpd;return {...all,[area]:autoTuneQuickTeam(updateAutomaticName(previous,{...changed,...(keepTower?{towerSpd:Number(changed.towerSpd??previous.towerSpd??15)}:{towerSpd:15,guildSpd:0})}))};});
 const patch=(key,next)=>update(t=>({...t,configs:t.configs.map(c=>c.key===key?next:c)}));let preview,error;try{preview=quickPreview(team,{includeReference:false,captureReadiness:true,captureTickSnapshots:true});}catch(e){error=e.message;}
 const activeTickRate=gaugeStepForMode(area,team.useRtaTickRate);
 const breakpointRows=useMemo(()=>tickBreakpointsTable({gaugeStep:bpStep,maxTick:20,initialAtb:bpInitialAtb}),[bpStep,bpInitialAtb]);
 const scenarioStatus=calculatorScenarioStatus(team,balanceTiming?.preview||preview);
 const sync=team.automaticSync;
 const current=team.configs[Math.min(selected,team.configs.length-1)],total=Object.fromEntries(STATS.map(k=>[k,Number(current.manual.sheet[k])])),stats={total,combat:preview?.actors.find(a=>a.key===current.key)?.attributes,leaderBonus:preview?.actors.find(a=>a.key===current.key)?.leaderBonus,bonus:Object.fromEntries(STATS.map(k=>[k,total[k]-Number(current.manual.base[k])]))};
 function chooseMonster(config,option,index){
  const rawNext={...selectQuickMonster(config,option),autoSpeed:locked&&index>0};
  const next=applyQuickAutoPresets(rawNext,index,autoPresets);
  update(t=>({...t,configs:t.configs.map(c=>c.key===config.key?next:c),...(account?{plannedRunes:{accountStamp:accountStamp(account),byConfig:{...(t.plannedRunes?.byConfig||{}),[config.key]:[]}}}:{}),...(t.leaderKey===config.key?{leader:quickLeader(next.masterId)}:{})}));
 }
 function selectArea(next){setArea(next);setSelected(0);setPlans(all=>all[next]?all:{...all,[next]:freshTeam(next)});}
 function move(from,to){const next=reorderTeam(baseTeam,from,to);setSelected(Math.max(0,next.configs.findIndex(c=>c.key===current.key)));update(next);}
 function clear(){setPlans(all=>({...all,[area]:freshTeam(area,team.dungeon)}));setSelected(0);setViewModes({});}
 function loadPreset(preset){const loaded=quickTeamFromPreset(preset,account);loaded.balanceEnabled=true;loaded.configs=loaded.configs.map(c=>({...c,balance:{sets:c.sets.filter(Boolean).map(set=>({set,required:false}))}}));setPlans(all=>({...all,[loaded.gameMode]:loaded}));setArea(loaded.gameMode);setSelected(0);setShowSheet(false);setViewModes({});setRunePicker(null);}
 function simulateSync(){update(t=>({...t,speedMode:'auto',towerSpd:15,guildSpd:0}));}
 function autoSelect(){if(!AUTO[area])return;update(t=>({...t,configs:t.configs.map((c,i)=>{const m=MONSTER_CATALOG.find(m=>m.name===AUTO[area][i]);return c.masterId?{...c,autoSpeed:locked&&i>0}:m?{...selectQuickMonster(c,m),autoSpeed:locked&&i>0,...(i===0?{manual:{...selectQuickMonster(c,m).manual,sheet:{...selectQuickMonster(c,m).manual.sheet,spd:300}}}:{})}:c;})}));}
 return <section className={`quick-calculator mystic-calculator quick-density ${visualVersion==='v2'?'calculator-v2':'calculator-classic'}`} inert={exporting?true:undefined} data-scenery={area==='cairos'?(team.destination||'gbah'):area}>
 <div className="calculator-version-bar" data-export-ignore><span>CALCULADORA DE VELOCIDADE <b>{visualVersion==='v2'?'/ PREMIUM TACTICAL V2':'/ CLÁSSICA'}</b></span><div role="group" aria-label="Visual da calculadora"><button type="button" aria-pressed={visualVersion==='v2'} onClick={()=>setVisualVersion('v2')}>Premium V2</button><button type="button" aria-pressed={visualVersion==='classic'} onClick={()=>setVisualVersion('classic')}>Versão clássica</button></div></div>
 {handoff&&<div className="calculator-handoff" role="region" aria-label="Verificação do time do otimizador"><div><strong>Verificando: {handoff.team.name}</strong><span>Cópia de trabalho. As alterações só retornam quando você enviar as metas.</span></div><button className="button primary" type="button" onClick={()=>onReturnSync?.(team)}>Enviar metas SPD ao time de origem</button><button className="button" type="button" onClick={onCancelSync}>Voltar sem aplicar</button></div>}
 <header className="quick-header"><div><h1>Calculadora Livre</h1><InfoTooltip label="Regras da calculadora reativa">A seleção de um monstro começa com atributos base, sem equipamento. Ajuste o slider de SPD ou carregue explicitamente um preset do JSON. Defina prioridades, mínimos opcionais e conjuntos em cada card. As ligações permitem exigir sincronia por par ou buscar o mais próximo possível. A busca considera todo o time sem repetir runas, respeita reservas e bloqueios e usa os ticks reais do cenário. Sem defesa informada, usa uma referência automática de abridor menos 1 SPD. Aproximações não atendidas ficam sinalizadas. Artefatos permanecem equipados; não projeta grinds. Ajustes manuais e a simulação automática anterior continuam disponíveis sem alterar o JSON original.</InfoTooltip></div><div className="quick-area-tabs" data-count={areas.length} style={{'--quick-area-count':areas.length}} role="tablist" aria-label="Área da Calculadora Livre">{areas.map(([key,label,slots],i)=><button type="button" key={key} id={`quick-tab-${key}`} role="tab" aria-selected={area===key} aria-controls="quick-area-panel" tabIndex={area===key?0:-1} onClick={()=>selectArea(key)} onKeyDown={e=>{const offset=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;const index=e.key==='Home'?0:e.key==='End'?areas.length-1:offset?(i+offset+areas.length)%areas.length:null;if(index!==null){e.preventDefault();selectArea(areas[index][0]);e.currentTarget.parentElement.children[index].focus();}}}>{label}<span>{slots} Slots</span></button>)}</div><div className="quick-header-actions"><QuickPresetPicker area={area} account={account} presets={presets} onLoad={loadPreset}/><button className="button" type="button" onClick={()=>{clear();setShowSheet(false);}}><Trash2 size={14}/>Limpar Time</button><details className="technical-export-menu"><summary className="button">Card Técnico</summary><div className="quick-header-popover"><TeamCardExport team={team} account={account}/></div></details><details className="quick-header-tools"><summary className="icon-button" aria-label="Mais ações da calculadora" title="Mais ações"><MoreHorizontal size={18}/></summary><div className="quick-header-popover"><label className="field"><span>Nome do time</span><input className="team-name" aria-label="Nome do time livre" value={team.name} onChange={e=>update(t=>({...t,name:e.target.value,autoName:false}))}/></label><button className="button" type="button" onClick={autoSelect} disabled={!AUTO[area]}>Preencher exemplo</button><button className="button" type="button" onClick={()=>setSelected(i=>(i+1)%team.configs.length)}>Próximo monstro ➔</button>
<div className="peanuts-auto-settings">
 <strong>Automação 00peanuts</strong>
 <label className="check-label"><input type="checkbox" checked={autoPresets.autoSwiftStarter} onChange={e=>setAutoPresets(p=>({...p,autoSwiftStarter:e.target.checked}))}/>Swift automático no Starter</label>
 <label className="check-label"><input type="checkbox" checked={autoPresets.autoSwiftOthers} onChange={e=>setAutoPresets(p=>({...p,autoSwiftOthers:e.target.checked}))}/>Swift automático nos Outros</label>
 <label className="check-label"><input type="checkbox" checked={autoPresets.autoWillChilling} onChange={e=>setAutoPresets(p=>({...p,autoWillChilling:e.target.checked}))}/>Will automático no Chilling</label>
</div>{area==='cairos'&&<label className="field pve-destination"><span>Destino PvE</span><select aria-label="Destino PvE livre" value={team.destination||'gbah'} onChange={e=>{const destination=e.target.value;update({...team,destination,dungeon:destination,exportContext:{kind:'pve',...(['dimensional','rift','labyrinth'].includes(destination)?{title:{dimensional:'Buraco Dimensional',rift:'Rift',labyrinth:'Labirinto'}[destination]}:{})}});}}>{[['gbah','GBAH'],['dbah','DBAH'],['nbah','NBAH'],['sf10','SF10'],['pc10','PC10'],['dimensional','Buraco Dimensional'],['rift','Rift'],['labyrinth','Labirinto']].map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}</div></details></div></header>
 {team.syncReferenceNotes?.length>0&&<p className="tactical-limits" role="status">Referências incompletas: {team.syncReferenceNotes.join(' · ')}. A sincronia não garante proteção contra essas defesas.</p>}
 {team.sourceDeckId!=null&&<div className="quick-preset-status"><span><strong>{team.sourceDeckName}</strong> · {quickPresetArea(team)} · {team.configs.length} slots · Cópia local</span><button type="button" className="button" disabled={team.speedMode==='snapshot'&&team.configs.some(c=>!c.masterId)} title={team.speedMode==='snapshot'&&team.configs.some(c=>!c.masterId)?'Preencha os slots vazios para simular a sincronia':undefined} onClick={()=>{if(team.speedMode==='snapshot')simulateSync();else{const original=presets.find(p=>p.id===team.sourceDeckId);if(original)loadPreset(original);}}}>{team.speedMode==='snapshot'?'Simular sincronia':'Voltar aos valores do JSON'}</button><button type="button" className="button" onClick={()=>{const original=presets.find(p=>p.id===team.sourceDeckId);if(original)loadPreset(original);}}>Restaurar preset original</button><span className="quick-preset-mode" role="status">{team.speedMode==='snapshot'?'Verificação · edição independente':'Simulação · metas automáticas'}</span>{team.configs.some(c=>c.masterId&&c.sourceRuneCount<6)&&<span className="quick-preset-equipment">Há monstros com menos de 6 runas no JSON.</span>}</div>}
 {visualVersion==='v2'&&<div className="tactical-overview" aria-label="Resumo do cenário"><div><span>COMPOSIÇÃO</span><strong>{team.configs.filter(c=>c.masterId).length}<small> / {team.configs.length} monstros</small></strong></div><div><span>LIDERANÇA</span><strong>{team.leader?`+${team.leader.value}% ${team.leader.stat.toUpperCase()}`:'Sem líder'}<small>{team.leader?'Confira o escopo em cada card':'Selecione a coroa de um monstro'}</small></strong></div><div><span>REFERÊNCIA</span><strong>{balanceTiming?.referenceSpeed?`${balanceTiming.referenceSpeed} SPD`:'Não definida'}<small>{balanceTiming?.automaticReference?'Automática · abridor −1 SPD':'Cenário configurável'}</small></strong></div><div><span>MOTOR DE TICKS</span><strong>{activeTickRate}%<small>Prontidão e ação avaliadas separadamente</small></strong></div></div>}
 {visualVersion==='v2'&&<div role="status" className="tactical-scenario-status" data-state={scenarioStatus.state}><strong>{scenarioStatus.label}</strong><span>{scenarioStatus.detail}</span></div>}
 <div id="quick-area-panel" role="tabpanel" aria-labelledby={`quick-tab-${area}`} tabIndex={0}>
 <div className="quick-share-surface">
 <div className="peanuts-global-bar" data-export-ignore>
  <div className="peanuts-tool-switcher" role="group" aria-label="Alternador de ferramenta Speed Tuning e Ticks">
   <button type="button" className={`peanuts-pill ${calcToolMode==='tuning'?'active':''}`} onClick={()=>setCalcToolMode('tuning')}>Speed Tuning</button>
   <button type="button" className={`peanuts-pill ${calcToolMode==='breakpoints'?'active':''}`} onClick={()=>setCalcToolMode('breakpoints')}>Tick Calculator</button>
  </div>
  <div className="peanuts-subtabs" role="group" aria-label="Sub-abas da calculadora">
   <button type="button" className={`peanuts-subtab ${subTab==='sync'?'active':''}`} onClick={()=>{setCalcToolMode('tuning');setSubTab('sync');}}>Sincronia</button>
   <button type="button" className={`peanuts-subtab ${subTab==='enemy'?'active':''}`} onClick={()=>{setCalcToolMode('tuning');setSubTab('enemy');}}>Inimigo</button>
   <button type="button" className={`peanuts-subtab ${subTab==='ticks'?'active':''}`} onClick={()=>{setCalcToolMode('tuning');setSubTab('ticks');}}>Ticks</button>
  </div>
  <div className="peanuts-global-params">
   <label className="peanuts-param-field">
    <span>Torre Vel.</span>
    <select aria-label="Torre de Velocidade Global" value={Number(team.towerSpd??15)} onChange={e=>update(t=>updateQuickTowerSpd(t,Number(e.target.value)))}>
     {Array.from({length:16},(_,v)=>v).map(v=><option key={v} value={v}>{v}%</option>)}
    </select>
   </label>
   <span className="peanuts-tick-badge" title="Porcentagem de preenchimento da barra de ataque por tick no modo atual">
    Tick: <strong>{activeTickRate}%</strong>
   </span>
  </div>
 </div>
 {calcToolMode==='breakpoints'&&<div className="peanuts-breakpoints-panel" data-export-ignore aria-label="Tabela de Breakpoints de Ticks">
  <header className="peanuts-bp-header">
   <strong>Tabela de Breakpoints de Velocidade por Tick (00peanuts)</strong>
   <div className="peanuts-bp-controls">
    <label className="peanuts-param-field">
     <span>Modo / Taxa</span>
     <select aria-label="Taxa de tick da tabela" value={bpStep} onChange={e=>setBpStep(Number(e.target.value))}>
      <option value={NATURAL_GAUGE_STEP}>Siege / Arena / PvE (7%)</option>
      <option value={RTA_GAUGE_STEP}>World Arena · RTA (1.5%)</option>
     </select>
    </label>
    <label className="peanuts-param-field">
     <span>Boost Inicial ATB</span>
     <select aria-label="Boost inicial de barra na tabela" value={bpInitialAtb} onChange={e=>setBpInitialAtb(Number(e.target.value))}>
      {[0,10,15,20,25,30,40,50].map(b=><option key={b} value={b}>{b}%</option>)}
     </select>
    </label>
   </div>
  </header>
  <div className="peanuts-bp-grid">
   {breakpointRows.map(row=><div key={row.tick} className="peanuts-bp-cell">
    <span className="peanuts-bp-tick">Tick {row.tick}</span>
    <strong className="peanuts-bp-spd">{row.minCombatSpd} SPD</strong>
    <small>Faixa: {row.minCombatSpd}–{row.maxCombatSpd} SPD</small>
   </div>)}
  </div>
 </div>}
 {subTab==='enemy'&&calcToolMode==='tuning'&&<div className="peanuts-enemy-panel" data-export-ignore aria-label="Configuração do Inimigo de Referência">
  <header className="peanuts-enemy-header">
   <strong>Inimigo de Referência (Sincronia Anti-Corte · 00peanuts)</strong>
   <label className="check-label">
    <input type="checkbox" checked={team.ignoreEnemyReference!==false} onChange={e=>update(t=>updateQuickEnemyReference(t,{ignoreEnemyReference:e.target.checked}))}/>
    Manter a sincronia mais eficiente sem considerar o inimigo
   </label>
  </header>
  {team.ignoreEnemyReference===false&&<div className="peanuts-enemy-card">
   <div className="peanuts-enemy-search">
    <MonsterSearch label="Selecionar Inimigo de Referência" options={choices} value={String(team.enemyReference?.masterId||'')} onChange={option=>update(t=>updateQuickEnemyReference(t,{ignoreEnemyReference:false,option}))}/>
   </div>
   <div className="peanuts-enemy-fields">
    <label className="check-label"><input type="checkbox" checked={team.enemyReference?.swift!==false} onChange={e=>update(t=>updateQuickEnemyReference(t,{ignoreEnemyReference:false,swift:e.target.checked}))}/>Usa Swift?</label>
    <label className="peanuts-param-field"><span>Vel. Adicional (+)</span><input type="number" min="0" max="400" value={team.enemyReference?.runeSpd??150} onChange={e=>update(t=>updateQuickEnemyReference(t,{ignoreEnemyReference:false,runeSpd:Number(e.target.value)||0}))}/></label>
    <label className="peanuts-param-field"><span>Líder SPD (%)</span><input type="number" min="0" max="50" value={team.enemyReference?.leaderSpd??0} onChange={e=>update(t=>updateQuickEnemyReference(t,{ignoreEnemyReference:false,leaderSpd:Number(e.target.value)||0}))}/></label>
    <label className="peanuts-param-field"><span>Artefato +SPD</span><input type="number" min="0" max="100" value={team.enemyReference?.artifactSpd??0} onChange={e=>update(t=>updateQuickEnemyReference(t,{ignoreEnemyReference:false,artifactSpd:Number(e.target.value)||0}))}/></label>
    <span className="peanuts-enemy-total">SPD Combate Rival: <strong>{team.enemyCombatSpd||0} SPD</strong></span>
   </div>
  </div>}
 </div>}
 <div className="balance-view-tabs" role="group" aria-label="Build em exibição"><button type="button" aria-pressed={balance.selected==null} onClick={()=>balance.select(null)}>Atual <span>{account&&team.configs.some(c=>c.unitId)?team.sourceDeckId!=null?'Preset':'Manual':'Simulação'}</span>{balance.report?.baseline?.hard>0&&<span className="balance-miss" title="Exigências obrigatórias não atendidas na build atual">{balance.report.baseline.hard} fora da meta</span>}</button>{balance.report?.alternatives.map((p,i)=><button key={p.id} type="button" aria-pressed={balance.selected===i} onClick={()=>balance.select(i)}>Alternativa {String.fromCharCode(65+i)} <span className={p.eligible?'balance-met':'balance-miss'}>{p.eligible?'Viável':'Aproximação'}</span></button>)}{balanceTiming&&<small title="Cenário usado nas ligações; informe a defesa abaixo para avaliar outra referência.">{balanceTiming.automaticReference?'Referência automática':'Defesa'} · {balanceTiming.referenceSpeed} SPD</small>}</div>
 <label className="check-label quick-auto-sync"><input type="checkbox" aria-label="Calcular SPD dos seguidores automaticamente" checked={quickOrderLocked(baseTeam)} disabled={balance.busy||balance.selected!=null} onChange={e=>update(t=>({...t,speedMode:e.target.checked?'auto':'free'}))}/>Calcular SPD dos seguidores automaticamente<InfoTooltip label="Cálculo automático da SPD">A SPD informada no primeiro slot é a referência. O motor calcula os mínimos dos demais, considerando boosts, buffs e o cenário. São metas de velocidade, sem carregar runas do JSON. Desmarque para digitar as velocidades dos demais e comparar a timeline. As ligações de sincronia regulam a busca de builds no JSON.</InfoTooltip></label>
 {locked&&team.configs.every(c=>c.masterId)&&<p className="fineprint quick-sync-status" role="status">{team.syncAudit?.safe?'Metas de SPD calculadas para o cenário atual.':team.syncAudit?.reason||'Não foi possível calcular metas de sincronia neste cenário.'}</p>}
 <BalanceTeamBar team={baseTeam} timing={balanceTiming} onChange={update} onMove={move}/>
 <div className={`summary-team-grid slots-${team.configs.length}`}>{team.configs.map((c,i)=>{const combat=normalizeCombat(c.combat),target=quickSpeedTarget(team,c),runagem=viewModes[c.key]===true,observation=proposal?quickTickObservation(c,preview):null,tickAudit=observation?{...observation,status:observation.met?'met':'unreachable',partial:!preview?.complete,reason:observation.met?'':'Meta não atendida na build exibida.'}:c.tickAudit;return <article key={c.key} className={`summary-monster-card ${selected===i?'selected':''}`} data-element={c.masterId%10} data-png-master={c.masterId} data-png-label={c.label} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';}} onDrop={e=>{e.preventDefault();const key=e.dataTransfer.getData('application/x-destino-config'),from=team.configs.findIndex(c=>c.key===key);if(from>=0&&from!==i)move(from,i);}}>
 <span className="summary-position">{i+1}</span><div className="summary-portrait">{ELEMENT_FILES[c.masterId%10]&&<img className="quick-element-icon" src={`/game-icons/elements/${ELEMENT_FILES[c.masterId%10]}.png`} alt="Elemento"/>}<MonsterPortrait master={c.masterId} name={c.label} element={c.masterId%10}/><LeaderCrown name={c.label} active={!!team.leader&&team.leaderKey===c.key} disabled={!c.masterId} leader={team.leader} onToggle={()=>update(t=>({...t,leader:t.leaderKey===c.key?null:quickLeader(c.masterId),leaderKey:t.leaderKey===c.key?null:c.key,leaderIndex:i}))}/></div>
 <details className="quick-card-settings" data-export-ignore onKeyDown={e=>{if(e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();e.currentTarget.open=false;e.currentTarget.querySelector('summary').focus();}}}><summary className="icon-button" aria-label={`Configurações do slot ${i+1}`} title="Configurações do monstro"><Settings2 size={16}/></summary><div className="quick-settings-popover"><header><strong>Slot {i+1} · {c.label}</strong><button type="button" className="icon-button" aria-label={`Fechar configurações do slot ${i+1}`} onClick={e=>{const details=e.currentTarget.closest('details');details.open=false;details.querySelector('summary').focus();}}>×</button></header>
 <label className="check-label"><input type="checkbox" role="switch" aria-label={`Mostrar somente SPD das runas de ${c.label}`} checked={runagem} onChange={e=>setViewModes(v=>({...v,[c.key]:e.target.checked}))}/>Exibir Runagem · SPD necessária nas runas</label>
 <span className="automatic-sync-badge">{c.tickTarget!=null?'Meta explícita de prontidão por tick':c.manualSpeed?'SPD manual deste monstro':!locked?'Ordem configurada nas ligações do time':i===0?(sync?.kind==='boost'?'Puxador detectado':'Sincronia Estrita (Fila Indiana)'):(sync?.kind==='boost'?'Mínimo anti-corte automático':`Fila Indiana · −${i} SPD do abridor`)}<InfoTooltip label={`Sincronia do slot ${i+1}`}>As prioridades e ligações controlam a busca conjunta. A simulação automática anterior é acionada apenas pelo botão Simular sincronia do preset. Os dados do JSON permanecem intactos.</InfoTooltip></span>
 <button className="button small" type="button" onClick={()=>{setSelected(i);setShowSheet(true);}}>Ver ficha deste monstro</button><button type="button" className="card-drag-handle" draggable onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-destino-config',c.key);}} aria-label={`Mover ${c.label}: use as setas esquerda ou direita`} title="Arraste ou use as setas do teclado" onKeyDown={e=>{const direction=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0;if(direction&&i+direction>=0&&i+direction<team.configs.length){e.preventDefault();move(i,i+direction);}}}>⋮⋮ Reordenar monstro</button>
 <RuneSetSelector sets={c.sets} monster={c.label} onChange={sets=>update(t=>updateQuickRuneSets(t,c.key,sets,false))}/>

 </div></details>
 <div className="quick-monster-search" data-png-name={c.label}><MonsterSearch label={`Monstro livre ${i+1}`} options={accountChoices.filter(o=>!o.id||o.id===c.unitId||!baseTeam.configs.some(x=>x.key!==c.key&&x.unitId===o.id))} value={c.unitId?`unit:${c.unitId}`:String(c.masterId||'')} onChange={option=>chooseMonster(c,option,i)}/></div>
 <div className="quick-speed-controls" inert={balance.selected!=null?true:undefined} title={balance.selected!=null?'Volte à build Atual para editar a simulação manual':undefined}> <StatGoalControl inline master={i===0} stat="spd" label={i===0&&locked?'SPD de runas · Abridor':'SPD de runas'} monster={`${c.label} runas livres`} value={quickRuneSpeed(c)} disabled={locked&&i>0&&c.tickTarget==null&&!c.manualSpeed} onChange={value=>update(t=>updateQuickRuneSpeed(t,c.key,value,false))}/>
 <div className="quick-tick-controls"><div className="field"><span>Entrada de velocidade</span>{visualVersion==='v2'?<span className="tactical-speed-switch" role="group" aria-label={`Entrada de velocidade de ${c.label}`}><button type="button" disabled={!c.masterId} aria-pressed={c.tickTarget==null} onClick={()=>update(t=>updateQuickTickTarget(t,c.key,null,false))}>SPD de runas</button><button type="button" disabled={!c.masterId} aria-pressed={c.tickTarget!=null} onClick={()=>update(t=>updateQuickTickTarget(t,c.key,6,false))}>Pronto por tick</button></span>:<select aria-label={`Entrada de velocidade de ${c.label}`} disabled={!c.masterId} value={c.tickTarget!=null?'tick':'spd'} onChange={e=>update(t=>updateQuickTickTarget(t,c.key,e.target.value==='tick'?6:null,false))}><option value="spd">SPD de runas</option><option value="tick">Pronto por tick</option></select>}</div>{c.tickTarget!=null&&<label className="field"><span>Pronto até o tick</span><select aria-label={`Pronto até o tick de ${c.label}`} value={c.tickTarget} onChange={e=>update(t=>updateQuickTickTarget(t,c.key,Number(e.target.value),false))}>{Array.from({length:QUICK_TICK_MAX-QUICK_TICK_MIN+1},(_,n)=>n+QUICK_TICK_MIN).map(n=><option key={n} value={n}>Tick {n}</option>)}</select></label>}</div>
 <div className="quick-rune-extras"><label className="check-label quick-swift-check"><input type="checkbox" aria-label={`Set Swift de ${c.label}`} checked={c.sets.some(id=>Number(id)===3)} onChange={e=>update(t=>toggleQuickSwift(t,c.key,e.target.checked,false))}/>Swift?</label><label className="field quick-artifact-number"><span>Artefatos · +SPD</span><input type="number" min="0" max="500" step="1" aria-label={`SPD adicional de ${c.label}`} value={combat.artifactSpd} onChange={e=>patch(c.key,{...c,combat:{...combat,artifactSpd:Math.max(0,Math.min(500,Number(e.target.value)||0))}})}/></label></div>
</div>
 <div className="quick-speed-result"><span>{c.syncMinimum!=null?(runagem?'SPD mínima nas runas':'SPD de combate necessária'):(runagem?'SPD nas runas':'SPD de combate')}</span><MotionValue value={target?(runagem?Math.max(0,target.runeSpd-quickSwiftBonus(c)):target.combatSpd):null} aria-label={`Velocidade exibida de ${c.label}`} title={runagem?'SPD de atributos nas runas; Swift, base, torres, líder e artefatos são contabilizados separadamente.':'SPD de combate calculada pelo motor atual.'}>{target?(runagem?`+${Math.max(0,target.runeSpd-quickSwiftBonus(c))}`:target.combatSpd):'—'} SPD</MotionValue>
 {c.masterId&&target&&<small className="peanuts-card-submetrics">Base: {c.manual.base.spd} · Ficha: {Number(c.manual.sheet.spd)} · Runas: +{Math.max(0,target.runeSpd-quickSwiftBonus(c))} · Swift: +{quickSwiftBonus(c)}{c.syncMinimum!=null?` · Mínimo: ${c.syncMinimum} ficha`:''}</small>}
 </div>
 {c.masterId&&(()=>{
  const cardSkills=monsterSkillsForCard(c.masterId);
  const openerSkill=cardSkills.find(s=>s.isOpener);
  const activeSlot=c.firstTurnSkillSlot??(openerSkill?openerSkill.slot:(cardSkills.at(-1)?.slot||1));
  const selectedSkill=cardSkills.find(s=>s.slot===activeSlot)||cardSkills[0];
  const cardLeader=quickLeader(c.masterId);
  const leaderValid=cardLeader?leaderApplies(cardLeader,{master:c.masterId,element:c.masterId%10},area):false;
  return <div className="peanuts-card-extras" data-export-ignore>
   {cardLeader&&<div className={`peanuts-leader-chip ${team.leaderKey===c.key?'is-active':''} ${!leaderValid?'is-invalid':''}`} title={!leaderValid?`Líder de ${LEADER_SCOPES[cardLeader.scope]||cardLeader.scope} não se aplica em ${area.toUpperCase()}`:'Clique na coroa acima para ativar/desativar este líder'}>
    <span>Líder: +{cardLeader.value}% {cardLeader.stat.toUpperCase()} ({LEADER_SCOPES[cardLeader.scope]||cardLeader.scope}){!leaderValid?' · Inativo neste modo':''}</span>
   </div>}
   {cardSkills.length>0&&<div className="peanuts-skill-picker">
    <div className="peanuts-skill-row">
     <span className="peanuts-skill-label">1º Turno:</span>
     <div className="peanuts-skill-buttons" role="group" aria-label={`Habilidade do 1º turno de ${c.label}`}>
      {cardSkills.map(sk=><button key={sk.id} type="button" aria-pressed={activeSlot===sk.slot} className={`peanuts-skill-btn ${activeSlot===sk.slot?'active':''} ${sk.isOpener?'is-opener':''}`} title={`${sk.label}: ${sk.name}${sk.isOpener?` (+${sk.openerBoost}% ATB)`:''}`} onClick={()=>update(t=>updateQuickFirstTurnSkill(t,c.key,{slot:sk.slot,fullSkill:c.fullSkill!==false,skillBoostBonus:c.skillBoostBonus||0}))}>
       {sk.label}
      </button>)}
     </div>
     {selectedSkill?.isOpener&&visualVersion==='classic'&&<select className="peanuts-skill-bonus" aria-label={`Bônus de nível da habilidade de ${c.label}`} value={Number(c.skillBoostBonus||0)} onChange={e=>update(t=>updateQuickFirstTurnSkill(t,c.key,{slot:activeSlot,fullSkill:Number(e.target.value)>0,skillBoostBonus:Number(e.target.value)}))}>
      <option value={0}>Base ({selectedSkill.openerBoost}%)</option>
      <option value={5}>Skill +5% ({selectedSkill.openerBoost+5}%)</option>
      <option value={10}>Skill +10% ({selectedSkill.openerBoost+10}%)</option>
      <option value={15}>Full Skill +15% ({selectedSkill.openerBoost+15}%)</option>
     </select>}
    </div>
    <small className="peanuts-skill-effect">
     {selectedSkill?.isOpener?visualVersion==='v2'?`⚡ ${selectedSkill.name}: +${selectedSkill.openerBoost}% Barra ATQ${selectedSkill.openerSpeedBuff?' + Buff SPD':''}${Number(c.skillBoostBonus||0)?` · +${Number(c.skillBoostBonus)}% ajuste manual${selectedSkill.openerType==='tiana'?' (não aplicado a este efeito)':''}`:''}`:`⚡ ${selectedSkill.name}: +${selectedSkill.openerBoost+Number(c.skillBoostBonus||0)}% Barra ATQ${selectedSkill.openerSpeedBuff?' + Buff SPD':''}`:'Efeito de sincronia não modelado para esta habilidade'}
    </small>
    {visualVersion==='v2'&&<small className="tactical-skill-limit">Apenas efeitos conhecidos de SPD e barra. Dano, resistência e procs não são simulados automaticamente.</small>}
   </div>}
  </div>;
 })()}
 {c.tickTarget!=null&&<div className="quick-tick-result" role="status" data-status={tickAudit?.status||'pending'}><div className="quick-tick-heading"><strong>+{quickRuneSpeed(c)} runas · {target?.combatSpd??'—'} combate</strong><InfoTooltip label={`Regras da meta por tick de ${c.label}`}>Meta: barra pronta até tick {c.tickTarget}; a ação pode esperar a fila. Busca de +0 a +600 SPD de runas, sem garantir runas disponíveis. Considera apenas os monstros selecionados e o cenário configurado. As metas explícitas prevalecem sobre a sincronia automática; editar o slider volta este monstro à SPD manual.</InfoTooltip></div><span>Pronto: {tickAudit?.readyTick!=null?`tick ${tickAudit.readyTick}`:'não atingiu a barra'} · {tickAudit?.disabledTurnTick!=null?`Turno impedido: tick ${tickAudit.disabledTurnTick}`:`Ação: ${tickAudit?.actionTick!=null?`tick ${tickAudit.actionTick}`:'não observada'}`}</span>{tickAudit?.partial&&<span>Time incompleto.</span>}{tickAudit?.reason&&<span>{tickAudit.status==='met'?'Ordem ou sincronia em conflito.':tickAudit.reason}</span>}</div>}
 <details className="quick-build-tools" open={team.sourceDeckId!=null||proposal?true:undefined}><summary>Builds e runas do JSON</summary> <BalanceSheet config={c} account={account} team={team} unit={account&&(proposal||c.equipmentSource!=='manual'&&team.sourceDeckId!=null||team.plannedRunes?.byConfig?.[c.key]?.length)?balanceUnit(account,team,c):null} build={proposal?.builds.find(b=>b.key===c.key)} checks={proposal?.checks[c.key]||[]} onRune={slot=>{if(account&&c.masterId)setRunePicker({key:c.key,slot});}}/>
 <div className="balance-card-actions"><BalancePreferences config={baseTeam.configs.find(x=>x.key===c.key)} onChange={next=>patch(c.key,next)}/><button type="button" className="button" disabled={!account||!c.masterId} onClick={()=>setRunePicker({key:c.key,slot:1})}>Escolher runas</button></div>
 <BalanceRuleChips config={c} checks={proposal?.checks[c.key]||[]}/>
</details>
 <details className="balance-manual-controls" inert={balance.selected!=null?true:undefined} title={balance.selected!=null?'Volte à build Atual para editar a simulação manual':undefined}><summary>Ajustes manuais</summary>

 <div className="quick-front-settings" data-export-ignore><ArtifactBonuses hideFixed alwaysVisible config={c} onChange={next=>patch(c.key,next)}/> <details data-export-ignore className="summary-card-controls"><summary>Metas mínimas</summary><div className="goal-presets">{Object.entries(GOAL_PRESETS).map(([key,p])=><button type="button" className="preset-button" aria-pressed={normalizeFocuses(c.focuses).includes(key)} key={key} onClick={()=>patch(c.key,toggleGoalFocus(c,key,c.manual.base))}>{p.label}</button>)}</div><div className="section-label"><span>Metas mínimas</span><select className="inline-select" aria-label={`Tipo de metas de ${c.label}`} value={c.basis} onChange={e=>patch(c.key,{...c,basis:e.target.value})}><option value="total">Ficha total</option><option value="bonus">Adicionais (+)</option></select></div><div className="stat-fields compact-stat-fields">{STATS.map(stat=><StatGoalControl inline key={stat} stat={stat} label={(['cr','cd','res','acc'].includes(stat)?`${LABELS[stat]}%`:`${c.basis==='bonus'?'+ ':''}${LABELS[stat]}`)} monster={`${c.label} meta livre`} value={c.goals[stat]} onChange={value=>patch(c.key,{...c,goals:{...c.goals,[stat]:value}})}/>)}</div><details><summary>Status manuais</summary>{STATS.filter(k=>k!=='spd').map(stat=><StatGoalControl inline key={stat} stat={stat} label={LABELS[stat]} monster={`${c.label} ficha livre`} value={c.manual.sheet[stat]} onChange={value=>patch(c.key,{...c,manual:{...c.manual,sheet:{...c.manual.sheet,[stat]:value}}})}/>)}</details><CombatContext sheetOnly config={c} master={c.masterId} onChange={next=>patch(c.key,next)}/></details>
 </div></details>
 </article>;})}</div>
 <BalanceSearchBar state={balance} account={account} complete={team.configs.every(c=>c.masterId)}/>
 <div className="peanuts-positioning-bar" data-export-ignore aria-label="Posicionamento no jogo e ordem de turno">
  <div className="peanuts-pos-header">
   <strong>Posicionamento no Jogo & Ordem de Turno</strong>
   <span>Líder ativo: <strong>{team.leader&&team.leaderKey?`${team.configs.find(x=>x.key===team.leaderKey)?.label||'Líder'} (+${team.leader.value}% ${team.leader.stat.toUpperCase()})`:'Sem Líder'}</strong></span>
  </div>
  <div className="peanuts-pos-slots">
   {team.configs.map((c,idx)=>{
    const turnOrderIdx=preview?.turns?.filter(t=>!t.enemy).findIndex(t=>t.key===c.key);
    return <div key={c.key} className={`peanuts-pos-slot ${team.leaderKey===c.key?'is-leader':''}`}>
     <span className="peanuts-pos-badge">{idx===0?'Starter':`Slot ${idx+1}`}</span>
     <MonsterPortrait master={c.masterId} name={c.label} element={c.masterId?c.masterId%10:0}/>
     <strong className="peanuts-pos-name">{c.masterId?c.label:'Vazio'}</strong>
     <small className="peanuts-pos-turn">{turnOrderIdx!=null&&turnOrderIdx>=0?`${turnOrderIdx+1}º Turno`:'—'}</small>
    </div>;
   })}
   {team.enemyCombatSpd>0&&<div className="peanuts-pos-slot is-enemy">
    <span className="peanuts-pos-badge">Inimigo</span>
    <MonsterPortrait master={team.enemyReference?.masterId||0} name={team.enemyReference?.label||'Inimigo'} element={team.enemyReference?.masterId?team.enemyReference.masterId%10:0}/>
    <strong className="peanuts-pos-name">{team.enemyReference?.label||'Inimigo'}</strong>
    <small className="peanuts-pos-turn">{team.enemyCombatSpd} SPD</small>
   </div>}
  </div>
 </div>
 <details className="quick-timeline-details" open={subTab==='ticks'?true:undefined}><summary>Timeline de Ticks</summary><div className="energy-timeline-panel" aria-live="polite">{error?<p role="alert">{error}</p>:preview?.complete?<TurnTimeline preview={balanceTiming?.preview||preview}/>:<span>Selecione os monstros</span>}</div></details></div>
 <details className="quick-secondary-panel"><summary>Defesa inimiga</summary><ThreatScanner team={baseTeam} onChange={update}/></details>
 {current.masterId&&<details className="quick-sheet-details" open={showSheet} onToggle={e=>{if(e.target===e.currentTarget)setShowSheet(e.currentTarget.open);}}><summary>Ficha de {current.label}</summary>{showSheet&&<MonsterSheet key={current.key} manual unit={{master:current.masterId,name:current.label,base:current.manual.base}} stats={stats} name={current.label}/>}</details>}
 <CombatScenarioEditor team={baseTeam} onChange={combatScenario=>update(t=>({...t,combatScenario}))}/>
 <footer className="quick-export-footer">{onBuildTeam&&['siege','arena'].includes(area)&&<button type="button" className="button" disabled={!canBuild||team.configs.some(c=>!c.masterId)} title={canBuild?'Buscar novas builds com as runas livres da conta':'Importe seu SWEX para disponibilizar o inventário de runas'} onClick={()=>onBuildTeam(team)}>Construir Time (Buscar Runas)</button>}<QuickCardExport compact team={team} onBusyChange={setExporting}/><details className="quick-more-exports"><summary>Mais opções de imagem</summary><QuickCardExport team={team} onBusyChange={setExporting}/></details></footer>
 {runePicker&&<BalanceRunePicker open account={account} team={baseTeam} config={baseTeam.configs.find(c=>c.key===runePicker.key)} options={inventoryOptions} reservedIds={reservedIds} allTeams={allTeams} slot={runePicker.slot} onSlot={slot=>setRunePicker(p=>({...p,slot}))} onChange={next=>patch(next.key,next)} onClose={()=>setRunePicker(null)}/>}
 </div></section>;
}
