import ArtifactBonuses from './ArtifactBonuses';
import EquipmentInspector from './EquipmentInspector';
import LeaderCrown from './LeaderCrown';
import InfoTooltip from './InfoTooltip';
import {presetsForArea} from '../core/deckManager';
import {monsterBase} from '../core/monster-search';
import {teamFromGameDeck} from '../core/account-teams';
import {catalogLeader} from '../core/leader-catalog';
import CombatStatsPreview from './CombatStatsPreview';
import TeamDiagnosis from './TeamDiagnosis';
import ArenaPanel from './ArenaPanel';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Shield, Swords, Skull, AlertCircle, GripVertical, Pencil, Power, Crown, Trash2 } from 'lucide-react';
import { STAT_NAMES, LABELS, STATS, ELEMENTS, blankConfig } from '../core/data';
import { MONSTER_CATALOG, catalogMonster } from '../core/monsters';
import { SLOT_MAINS } from '../core/guild';
import MonsterPortrait from './MonsterPortrait';
import TeamCardExport from './TeamCardExport';
import StatGoalControl from './StatGoalControl';
import MonsterCombobox from './MonsterSearch';
import DamageEditor from './DamageEditor';
import BuilderControls from './BuilderControls';
import {GOAL_PRESETS,toggleGoalFocus,normalizeFocuses,updateAutomaticName,automaticTeamName,reorderTeam} from '../core/team-ux';
import RuneSetPicker from './RuneSetSelector';
import CombatScenarioEditor from './CombatScenarioEditor';
import CombatContext from './CombatContext';
import SpeedTuneWidget from './SpeedTuneCard';

function EditorDetails({compact,goalsOpen,children}){return compact?<details className="compact-edit-details" open={goalsOpen||undefined}><summary>Metas & combate</summary>{children}</details>:<>{children}</>;}

function Select({label,visibleLabel,children,...props}){
 return <label className="field"><span>{visibleLabel||label}</span><select aria-label={label} {...props}>{children}</select></label>;
}

export function MonsterEditor({config,index,slotCount,account,onChange,onMove,compact=false,goalsOpen=false,catalogMode=false,team={},options={},build=null,onLeader,leaderActive=false}){
 const [leaderBusy,setLeaderBusy]=useState(false),[leaderNotice,setLeaderNotice]=useState('');
 const unit=account?.units.find(u=>u.id===config.unitId);
 const master=unit?.master||config.masterId;
 const monster=unit||catalogMonster(master,config.label);
 const useCatalog=catalogMode||!account;
 const missing=!catalogMode&&account&&!unit&&(config.enabled!==false||config.unitId!=null);
 const candidates=useMemo(()=>(useCatalog?MONSTER_CATALOG:account.units).slice().sort((a,b)=>a.name.localeCompare(b.name)||(b.level||0)-(a.level||0)).map(u=>({value:useCatalog?`catalog:${u.master}`:`unit:${u.id}`,name:u.name,master:u.master,element:u.element,unitId:useCatalog?null:u.id,detail:useCatalog?'Catálogo':`Nv.${u.level} · #${String(u.id).slice(-5)}`})),[useCatalog,account]);
 const update=(key,value)=>onChange({...config,[key]:value});
 async function toggleLeader(checked){if(!onLeader)return;setLeaderNotice('');if(!checked){onLeader(null);return;}setLeaderBusy(true);try{const leader=catalogLeader(master);onLeader(leader);if(!leader)setLeaderNotice('Esta unidade não possui habilidade de líder.');}catch{setLeaderNotice('Não foi possível consultar a habilidade.');}finally{setLeaderBusy(false);}}
 return <section className={`monster-editor ${!catalogMode&&!config.enabled?'muted-editor':''}`} data-element={monster.element} aria-label={`Configuração de ${config.label}`}>
  <div className="monster-heading">
   <div className="portrait-crown-wrap"><MonsterPortrait master={master} name={monster.name} element={monster.element}/>{onLeader&&<LeaderCrown name={monster.name} active={leaderActive} leader={team.leader} disabled={leaderBusy||!master} onToggle={()=>toggleLeader(!leaderActive)}/>}</div>
   <div className="monster-title"><h3>{monster.name}</h3><small>{unit?`Nv. ${unit.level}`:useCatalog?'Catálogo de monstros':'Escolha uma unidade da conta'}</small></div>
   {onMove&&<div className="move-controls"><button type="button" className="icon-button" title="Mover para a esquerda" aria-label={`Mover ${config.label} para a esquerda`} disabled={index===0} onClick={()=>onMove(-1)}><ArrowLeft size={14}/></button><button type="button" className="icon-button" title="Mover para a direita" aria-label={`Mover ${config.label} para a direita`} disabled={index===slotCount-1} onClick={()=>onMove(1)}><ArrowRight size={14}/></button></div>}
  </div>
  <MonsterCombobox label={useCatalog?`Monstro do catálogo — posição ${index+1}`:`Unidade da conta — posição ${index+1}`} options={candidates} value={useCatalog&&master?`catalog:${master}`:config.unitId?`unit:${config.unitId}`:''} placeholder={config.label} onChange={u=>onChange({...config,unitId:u?.unitId||null,masterId:u?.master||null,label:u?.name||'Escolher monstro'})}/>
  {useCatalog&&!catalogMode&&<InfoTooltip label="Inventário necessário">Importe seu JSON para selecionar a cópia da conta e otimizar.</InfoTooltip>}
  {missing&&<div className="inline-warning"><AlertCircle size={14}/><span>{config.label} não encontrado neste JSON. Selecione uma unidade ou desmarque “Incluir”.</span></div>}
  {leaderNotice&&<small role="status">{leaderNotice}</small>}
  {!catalogMode&&<CombatStatsPreview account={account} team={team} config={config} options={options} build={build}/>}

  <RuneSetPicker sets={config.sets} monster={config.label} onChange={sets=>update('sets',sets)}/>

  {!catalogMode&&<label className="check-label small"><input type="checkbox" checked={config.strictSets} onChange={e=>update('strictSets',e.target.checked)}/>Sets obrigatórios</label>}
  <div className="three-fields">{[2,4,6].map(slot=><Select key={slot} label={`Slot ${slot} de ${config.label}`} visibleLabel={`Slot ${slot}`} value={config.mains[slot]} onChange={e=>update('mains',{...config.mains,[slot]:Number(e.target.value)})}>{SLOT_MAINS[slot].map(id=><option key={id} value={id}>{id?STAT_NAMES[id]:'Livre'}</option>)}</Select>)}</div>
  <EditorDetails compact={compact} goalsOpen={goalsOpen}>
  <div className="goal-presets" aria-label={`Presets de ${config.label}`}>{Object.entries(GOAL_PRESETS).map(([key,p])=><button key={key} className="preset-button" type="button" aria-pressed={normalizeFocuses(config.focuses).includes(key)} title="Focos podem ser combinados. Desmarcar preserva as metas editadas." onClick={()=>onChange(toggleGoalFocus(config,key,unit?.base||monsterBase(master)||{}))}>{p.label}</button>)}</div>
  <div className="section-label"><span>Metas mínimas</span><select aria-label={`Tipo de atributos de ${config.label}`} className="inline-select" value={config.basis} onChange={e=>update('basis',e.target.value)}><option value="bonus">Adicionais (+)</option><option value="total">{config.raidGoals?'Combate (Raid)':'Ficha total'}</option></select></div>
  <div className="stat-fields compact-stat-fields">{STATS.map(key=><StatGoalControl key={key} stat={key} label={['cr','cd','res','acc'].includes(key)?`${LABELS[key]} total %`:`${config.basis==='bonus'?'+ ':''}${LABELS[key]}`} monster={config.label} value={config.goals[key]} onChange={value=>update('goals',{...config.goals,[key]:value})}/>)}</div>
  <ArtifactBonuses config={config} onChange={onChange}/><CombatContext config={config} master={master} onChange={onChange}/>
  <details className="monster-advanced"><summary>Objetivo, artefatos e dano</summary>
  <Select label={`Objetivo após atingir as metas de ${config.label}`} value={config.objective} onChange={e=>update('objective',e.target.value)}><option value="balanced">Equilíbrio</option><option value="cr">Taxa crítica</option><option value="spd">Velocidade</option><option value="hp">Vida</option><option value="damage">Dano estimado / ATK médio sem cenário</option></Select>
  {!catalogMode&&<label className="check-label artifact-toggle"><input type="checkbox" role="switch" aria-label={`Artefatos de ${config.label}`} checked={config.artifacts!==false} onChange={e=>update('artifacts',e.target.checked)}/>Artefatos <strong>{config.artifacts!==false?'ON':'OFF'}</strong></label>}
  {!catalogMode&&<DamageEditor config={config} account={account} team={team} options={options} build={build} onChange={onChange}/>}
  </details>
  <label className="check-label speed-sync"><input type="checkbox" checked={config.lockSpeedSync===true} onChange={e=>update('lockSpeedSync',e.target.checked)}/>Lock Speed Sync</label>
  {!catalogMode&&<label className="check-label include-monster"><input type="checkbox" checked={config.enabled} onChange={e=>update('enabled',e.target.checked)}/>Incluir na otimização</label>}
  </EditorDetails>
  {!catalogMode&&account&&<EquipmentInspector account={account} team={team} config={config} options={options} build={build}/>}
 </section>;
}

export default function TeamEditor({teams,account,onChange,onAdd,options={},onOptions=()=>{},onSavePlan=()=>{},onLoadPlan=()=>{},builds=null,onOptimizeTeam,diagnostics={},diagnosisBusy=false,onApplyDiagnosis=()=>{},singleDetail=false}){
 const [selectedTeam,setSelectedTeam]=useState(null),[revision,setRevision]=useState(0),[deckNotice,setDeckNotice]=useState('');
 if(!teams.length)return <div className="empty-results"><p>Nenhum time nesta seção.</p><button className="button" onClick={onAdd}>Adicionar time</button></div>;
 const expandedId=teams.some(t=>t.id===selectedTeam)?selectedTeam:teams[0]?.id;
 function isExpanded(team){return team.id===expandedId;}
 function clearAll(){onChange(teams.map(t=>({...t,target_goals:null,plannedRunes:null,sourceDeckId:null,combatScenario:{enemies:[],events:[]},leader:null,leaderKey:null,guildSpd:0,towerSpd:0,leaderSpd:0,enemyCombatSpd:0,configs:t.configs.map(()=>blankConfig()),inactiveConfigs:[]})));setDeckNotice('Seleções e metas limpas. Seu inventário foi mantido.');}

 function patchTeam(id,patch){onChange(teams.map(t=>{if(t.id!==id)return t;const leaderKey=t.leaderKey||t.configs[0]?.key;const changed=patch.leaderKey!==undefined&&patch.leaderKey!==leaderKey||patch.configs&&patch.configs.find(c=>c.key===leaderKey)?.masterId!==t.configs.find(c=>c.key===leaderKey)?.masterId;return updateAutomaticName(t,{...t,...patch,...(t.leader&&changed&&!Object.hasOwn(patch,'leader')?{leader:null,leaderSpd:0}:{})});}));}
 return <><BuilderControls compact={singleDetail} team={teams[0]} options={options} onOptions={onOptions} onRecalc={()=>{setRevision(n=>n+1);setDeckNotice('Ordem recalculada com a build otimizada vigente ou as runas equipadas.');}} onSave={onSavePlan} onLoad={onLoadPlan} onClear={clearAll}/>{deckNotice&&<p className="fineprint builder-feedback" role="status">{deckNotice}</p>}{!singleDetail&&<><div className="team-list-actions"><span className="count" aria-label="Quantidade de times">{teams.length} times</span><button className="button outline small" onClick={onAdd}><Plus size={16}/>Adicionar time</button></div><div className="defense-selection-ruler" aria-label="Selecionar time">{teams.map((t,i)=>{const leader=t.configs.find(c=>c.key===t.leaderKey)||t.configs[t.leaderIndex||0],report=diagnostics[t.id];return <button type="button" aria-pressed={isExpanded(t)} key={t.id} onClick={()=>setSelectedTeam(t.id)}><span className="portrait-crown-wrap"><MonsterPortrait master={leader?.masterId} name={leader?.label}/>{t.leader&&<span className="mini-crown">👑</span>}</span><b>{i+1}</b><small>{report?.status==='ready'?'🟢 Viável':report?.status==='alert'?'🔴 Rever alocação':report?'🟡 Rever metas':'○ Não testado'}</small></button>;})}</div></>}{teams.filter(isExpanded).map((team)=>{const i=teams.findIndex(t=>t.id===team.id);return <article className="team-panel" key={team.id}>
  <header className="team-header">{singleDetail?<><div className="team-preset-portraits" role="group" aria-label="Composição do time selecionado" title={team.name}>{team.configs.map(c=>{const unit=account?.units.find(u=>u.id===c.unitId);return <MonsterPortrait key={c.key} unit_master_id={unit?.master||c.masterId} name={unit?.name||c.label}/>;})}</div><details className="team-name-edit"><summary className="icon-button" title="Renomear time" aria-label="Renomear time"><Pencil size={15}/></summary><label className="field"><span className="screen-reader-only">Nome do time</span><input className="team-name" aria-label={`Nome do time ${i+1}`} value={team.autoName===true?automaticTeamName(team.configs):team.name} onChange={e=>patchTeam(team.id,{name:e.target.value,autoName:false})}/></label></details></>:<><GripVertical size={17} className="grip"/><button type="button" className="button small accordion-toggle" aria-label={`Editar time ${i+1}`} aria-expanded={isExpanded(team)} aria-controls={`team-body-${team.id}`} onClick={()=>setSelectedTeam(team.id)}>{isExpanded(team)?'▾':'▸'}</button><strong>Time {String(i+1).padStart(2,'0')}</strong><input className="team-name" aria-label={`Nome do time ${i+1}`} value={team.autoName===true?automaticTeamName(team.configs):team.name} onChange={e=>patchTeam(team.id,{name:e.target.value,autoName:false})}/></>}<div className="team-meta">{singleDetail?<button type="button" className="icon-button" title="Incluir time na otimização" aria-label={`Ativar time ${i+1}`} aria-pressed={team.active!==false} onClick={()=>patchTeam(team.id,{active:team.active===false})}><Power size={16}/></button>:<label className="check-label team-priority"><input type="checkbox" aria-label={`Ativar time ${i+1}`} checked={team.active!==false} onChange={e=>patchTeam(team.id,{active:e.target.checked})}/>Ativo</label>}<label>{!singleDetail&&<span>Função</span>}<select aria-label={`Função do time ${i+1}`} value={team.mode} onChange={e=>patchTeam(team.id,{mode:e.target.value})}><option value="defense">Defesa</option><option value="attack">Ataque</option></select></label>{singleDetail?<button type="button" className="icon-button" title="Priorizar este time na distribuição" aria-label={`Prioridade do time ${i+1}`} aria-pressed={team.priorityFocus===true||Number(team.priority)>1} onClick={()=>patchTeam(team.id,{priorityFocus:!(team.priorityFocus===true||Number(team.priority)>1),priority:1})}><Crown size={16}/></button>:<label className="check-label team-priority"><input type="checkbox" aria-label={`Prioridade do time ${i+1}`} checked={team.priorityFocus===true||Number(team.priority)>1} onChange={e=>patchTeam(team.id,{priorityFocus:e.target.checked,priority:1})}/>👑 Prioridade</label>}<button className="icon-button" title="Remover time" aria-label={`Remover time ${i+1}`} disabled={!singleDetail&&teams.length===1} onClick={()=>onChange(teams.filter(t=>t.id!==team.id))}>{singleDetail?<Trash2 size={17}/>:<Skull size={17}/>}</button></div></header>
  {isExpanded(team)&&<div id={`team-body-${team.id}`}><TeamDiagnosis report={diagnostics[team.id]} account={account} busy={diagnosisBusy} planned={team.plannedRunes} onApply={()=>onApplyDiagnosis(team.id,diagnostics[team.id])} onUndo={()=>patchTeam(team.id,{plannedRunes:null})}/>
  {team.gameMode==='arena'&&<ArenaPanel team={team} account={account} options={options} onChange={arenaScenario=>patchTeam(team.id,{arenaScenario})}/>}
  {team.enemyDefense?.length>0&&<p className="opponent-context">⚔ Ofensa VS Defesa: {team.enemyDefense.map(m=>m.label).join(', ')}</p>}
  {!!account?.accountPresets?.length&&<div className="game-decks-bar"><label className="field"><span>Meus Decks do Jogo</span><select aria-label={`Meus Decks do Jogo — time ${i+1}`} value={team.sourceDeckId||''} disabled={!account?.accountPresets?.length} onChange={e=>{const preset=presetsForArea(account.accountPresets,team.gameMode||'siege',team.dungeon,team.arenaContext).find(p=>p.id===e.target.value);if(preset){patchTeam(team.id,teamFromGameDeck({...preset,gameMode:preset.gameMode||team.gameMode||'siege'},account,team));setDeckNotice(`${preset.name} carregado.${preset.missingIds.length?' Há monstros ausentes no JSON.':''}${preset.unitIds.length>team.configs.length?` Usando as primeiras ${team.configs.length} posições.`:''}`);}}}><option value="">{account?.accountPresets?.length?'Carregar composição do SWEX':'Nenhum deck no JSON importado'}</option>{presetsForArea(account?.accountPresets,team.gameMode||'siege',team.dungeon,team.arenaContext).map(p=><option key={p.id} value={p.id}>{p.name}{p.missingIds.length?' · incompleto':''}</option>)}</select></label></div>}

  <details className="team-totems"><summary>⚙️ Totens e velocidade inimiga</summary><div className="game-mode-bar">{[['towerSpd','Totem Glória SPD (%)',100],...(team.gameMode!=='arena'?[['guildSpd','Totem Guilda SPD (%)',100]]:[]),['leaderSpd','Líder SPD (%)',100],['enemyCombatSpd','SPD de combate inimiga (opcional)',1000]].map(([key,label,max])=><label className="field" key={key}><span>{label}</span><input aria-label={`${label} do time ${i+1}`} type="number" min="0" max={max} step="1" value={key==='leaderSpd'&&team.leader?.stat==='spd'?team.leader.value:team[key]??''} placeholder="0" onChange={e=>patchTeam(team.id,{[key]:e.target.value,...(key==='leaderSpd'?{leader:null}:{})})}/></label>)}<InfoTooltip label="Regras dos totens">Totens e líder incidem sobre a base. Buffs, artefatos e passivas usam o contexto de cada card; inimigo sem composição usa apenas a SPD informada.</InfoTooltip></div></details>
  <div className="team-build-layout">  <div className={`monster-grid slots-${team.configs.length}`}>{team.configs.map((c,j)=><MonsterEditor key={c.key} config={c} index={j} slotCount={team.configs.length} account={account} team={team} options={options} onLeader={leader=>patchTeam(team.id,{leader,leaderSpd:0,leaderKey:leader?c.key:null,leaderIndex:leader?j:0})} leaderActive={!!team.leader&&team.leaderKey===c.key} build={builds?.find(b=>b.key===c.key&&b.unitId===c.unitId)} onChange={updated=>patchTeam(team.id,{configs:team.configs.map(x=>x.key===c.key?updated:x)})} onMove={direction=>patchTeam(team.id,reorderTeam(team,j,j+direction))}/>)}</div>
  <SpeedTuneWidget key={`${team.id}-${revision}`} team={team} account={account} options={options} builds={builds?.some(b=>b.teamId===team.id)?builds.filter(b=>b.teamId===team.id):null} onRecalc={()=>setRevision(n=>n+1)}/></div>
  <CombatScenarioEditor team={team} onChange={combatScenario=>patchTeam(team.id,{combatScenario})}/>
  <footer className="team-footer"><div>{team.mode==='defense'?<Shield size={17}/>:<Swords size={17}/>}<span>SPD vinculada: {team.configs.filter(c=>c.enabled&&c.lockSpeedSync).map(c=>c.label).join(' → ')||'Marque ao menos dois monstros'}</span></div><label className="check-label small"><input type="checkbox" checked={team.order==='soft'} onChange={e=>patchTeam(team.id,{order:e.target.checked?'soft':'off'})}/>Preferir também a ordem dos demais</label><div className="button-group">{onOptimizeTeam&&<button type="button" className="button primary small" disabled={!account||!team.configs.some(c=>c.enabled)||team.configs.some(c=>c.enabled&&!account.units.some(u=>u.id===c.unitId))} onClick={()=>onOptimizeTeam(team.id)}>Validar só este time</button>}<TeamCardExport team={team} account={account} builds={builds} options={options}/></div></footer>
 </div>}</article>;})}</>;
}
