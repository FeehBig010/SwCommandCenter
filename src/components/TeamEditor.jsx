import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Shield, Swords, Skull, AlertCircle, GripVertical } from 'lucide-react';
import { SETS, STAT_NAMES, LABELS, STATS, ELEMENTS, GAME_MODES, changeGameMode, FOUR, teamFromPreset, blankConfig } from '../core/data';
import { MONSTER_CATALOG, catalogMonster } from '../core/monsters';
import { SLOT_MAINS } from '../core/guild';
import MonsterPortrait from './MonsterPortrait';
import TeamCardExport from './TeamCardExport';
import StatGoalControl from './StatGoalControl';
import MonsterCombobox from './MonsterCombobox';
import DamageEditor from './DamageEditor';
import BuilderControls from './BuilderControls';
import SpeedTuneWidget from './SpeedTuneWidget';

function Select({label,children,...props}){
 return <label className="field"><span>{label}</span><select aria-label={label} {...props}>{children}</select></label>;
}
const COMMON_SETS=[13,15,10,3,6,4,5,17];

export function MonsterEditor({config,index,slotCount,account,onChange,onMove,catalogMode=false,team={},options={},build=null}){
 const unit=account?.units.find(u=>u.id===config.unitId);
 const master=unit?.master||config.masterId||MONSTER_CATALOG.find(m=>m.name===config.label)?.master;
 const monster=unit||catalogMonster(master,config.label);
 const useCatalog=catalogMode||!account;
 const missing=!catalogMode&&account&&!unit;
 const candidates=useMemo(()=>(useCatalog?MONSTER_CATALOG:account.units).slice().sort((a,b)=>a.name.localeCompare(b.name)||(b.level||0)-(a.level||0)).map(u=>({value:useCatalog?`catalog:${u.master}`:`unit:${u.id}`,name:u.name,master:u.master,element:u.element,unitId:useCatalog?null:u.id,detail:useCatalog?'Catálogo':`Nv.${u.level} · #${String(u.id).slice(-5)}`})),[useCatalog,account]);
 const update=(key,value)=>onChange({...config,[key]:value});
 const selectedSets=config.sets.filter(Boolean);
 function setCount(id,count){
  const next=[...selectedSets.filter(s=>s!==id),...Array(count).fill(id)];
  update('sets',next);
 }
 function setOption(id){
  const count=selectedSets.filter(s=>s===id).length;
  const used=selectedSets.reduce((n,s)=>n+(FOUR.has(s)?4:2),0);
  const disabled=!count&&used+(FOUR.has(id)?4:2)>6;
  return <div className="set-choice" key={id}>
   <label className="check-label"><input type="checkbox" checked={count>0} disabled={disabled} onChange={e=>setCount(id,e.target.checked?1:0)}/>{SETS[id]}</label>
   {count>0&&!FOUR.has(id)&&<select aria-label={`Quantidade de sets ${SETS[id]} de ${config.label}`} value={count} onChange={e=>setCount(id,Number(e.target.value))}>{[1,2,3].filter(n=>used-count*2+n*2<=6).map(n=><option key={n} value={n}>{n}×</option>)}</select>}
  </div>;
 }
 return <section className={`monster-editor ${!catalogMode&&!config.enabled?'muted-editor':''}`} aria-label={`Configuração de ${config.label}`}>
  <div className="monster-heading">
   <MonsterPortrait master={master} name={monster.name} element={monster.element}/>
   <div className="monster-title"><h3>{monster.name}</h3><small>{unit?`${ELEMENTS[unit.element]||''} · Nv. ${unit.level}`:useCatalog?'Catálogo de monstros':'Escolha uma unidade da conta'}</small></div>
   {onMove&&<div className="move-controls"><button type="button" className="icon-button" title="Mover para a esquerda" aria-label={`Mover ${config.label} para a esquerda`} disabled={index===0} onClick={()=>onMove(-1)}><ArrowLeft size={14}/></button><button type="button" className="icon-button" title="Mover para a direita" aria-label={`Mover ${config.label} para a direita`} disabled={index===slotCount-1} onClick={()=>onMove(1)}><ArrowRight size={14}/></button></div>}
  </div>
  <MonsterCombobox label={useCatalog?`Monstro do catálogo — posição ${index+1}`:`Unidade da conta — posição ${index+1}`} options={candidates} value={useCatalog&&master?`catalog:${master}`:config.unitId?`unit:${config.unitId}`:''} placeholder={config.label} onChange={u=>onChange({...config,unitId:u?.unitId||null,masterId:u?.master||null,label:u?.name||'Escolher monstro'})}/>
  {useCatalog&&!catalogMode&&<p className="fineprint">Importe seu JSON para selecionar a cópia da conta e otimizar.</p>}
  {missing&&<div className="inline-warning"><AlertCircle size={14}/><span>{config.label} não encontrado neste JSON. Selecione uma unidade ou desmarque “Incluir”.</span></div>}
  <fieldset className="rune-set-picker"><legend>Sets de runas</legend><div className="set-choices">{COMMON_SETS.map(setOption)}</div><details><summary>Outros sets</summary><div className="set-choices">{Object.keys(SETS).map(Number).filter(id=>id!==25&&!COMMON_SETS.includes(id)).map(setOption)}</div></details></fieldset>
  {!catalogMode&&<label className="check-label small"><input type="checkbox" checked={config.strictSets} onChange={e=>update('strictSets',e.target.checked)}/>Sets obrigatórios</label>}
  <div className="three-fields">{[2,4,6].map(slot=><Select key={slot} label={`Slot ${slot} de ${config.label}`} value={config.mains[slot]} onChange={e=>update('mains',{...config.mains,[slot]:Number(e.target.value)})}>{SLOT_MAINS[slot].map(id=><option key={id} value={id}>{id?STAT_NAMES[id]:'Livre'}</option>)}</Select>)}</div>
  <div className="section-label"><span>Metas mínimas</span><select aria-label={`Tipo de atributos de ${config.label}`} className="inline-select" value={config.basis} onChange={e=>update('basis',e.target.value)}><option value="bonus">Adicionais (+)</option><option value="total">Totais</option></select></div>
  <div className="stat-fields">{STATS.map(key=><StatGoalControl key={key} stat={key} label={['cr','cd','res','acc'].includes(key)?`${LABELS[key]} total %`:`${config.basis==='bonus'?'+ ':''}${LABELS[key]}`} monster={config.label} value={config.goals[key]} onChange={value=>update('goals',{...config.goals,[key]:value})}/>)}</div>
  <Select label={`Objetivo após atingir as metas de ${config.label}`} value={config.objective} onChange={e=>update('objective',e.target.value)}><option value="balanced">Equilíbrio</option><option value="cr">Taxa crítica</option><option value="spd">Velocidade</option><option value="hp">Vida</option><option value="damage">Dano estimado / ATK médio sem cenário</option></Select>
  {!catalogMode&&<label className="check-label artifact-toggle"><input type="checkbox" role="switch" aria-label={`Artefatos de ${config.label}`} checked={config.artifacts!==false} onChange={e=>update('artifacts',e.target.checked)}/>Artefatos <strong>{config.artifacts!==false?'ON':'OFF'}</strong></label>}
  {!catalogMode&&<DamageEditor config={config} account={account} team={team} options={options} build={build} onChange={onChange}/>}
  <label className="check-label speed-sync"><input type="checkbox" checked={config.lockSpeedSync===true} onChange={e=>update('lockSpeedSync',e.target.checked)}/>Lock Speed Sync · Vincular ordem de SPD</label>
  {!catalogMode&&<label className="check-label include-monster"><input type="checkbox" checked={config.enabled} onChange={e=>update('enabled',e.target.checked)}/>Incluir na otimização</label>}
 </section>;
}

export default function TeamEditor({teams,account,onChange,onAdd,options={},onOptions=()=>{},onSavePlan=()=>{},onLoadPlan=()=>{},builds=null,onOptimizeTeam,maxTeams=10}){
 const [revision,setRevision]=useState(0),[deckNotice,setDeckNotice]=useState('');
 function clearAll(){onChange(teams.map(t=>({...t,leader:null,leaderKey:null,towerSpd:0,leaderSpd:0,enemyCombatSpd:0,configs:t.configs.map(()=>blankConfig()),inactiveConfigs:[]})));setDeckNotice('Seleções e metas limpas. Seu inventário foi mantido.');}

 function patchTeam(id,patch){onChange(teams.map(t=>{if(t.id!==id)return t;const leaderKey=t.leaderKey||t.configs[0]?.key;const changed=patch.leaderKey!==undefined&&patch.leaderKey!==leaderKey||patch.configs&&patch.configs.find(c=>c.key===leaderKey)?.masterId!==t.configs.find(c=>c.key===leaderKey)?.masterId;return {...t,...patch,...(t.leader&&changed?{leader:null,leaderSpd:0}:{})};}));}
 return <><BuilderControls team={teams[0]} options={options} onOptions={onOptions} onRecalc={()=>{setRevision(n=>n+1);setDeckNotice('Ordem recalculada com a build otimizada vigente ou as runas equipadas.');}} onSave={onSavePlan} onLoad={onLoadPlan} onClear={clearAll}/>{deckNotice&&<p className="fineprint builder-feedback" role="status">{deckNotice}</p>}<div className="section-toolbar"><h2>Times e modos <span className="count">{teams.length}</span></h2><button className="button outline small" disabled={teams.length>=maxTeams} onClick={onAdd}><Plus size={16}/>Adicionar time</button></div>{teams.map((team,i)=><article className="team-panel" key={team.id}>
  <header className="team-header"><GripVertical size={17} className="grip"/><strong>Time {String(i+1).padStart(2,'0')}</strong><input className="team-name" aria-label={`Nome do time ${i+1}`} value={team.name} onChange={e=>patchTeam(team.id,{name:e.target.value})}/><div className="team-meta"><label><span>Função</span><select aria-label={`Função do time ${i+1}`} value={team.mode} onChange={e=>patchTeam(team.id,{mode:e.target.value})}><option value="defense">Defesa</option><option value="attack">Ataque</option></select></label><label><span>Prioridade</span><select aria-label={`Prioridade do time ${i+1}`} value={team.priority} onChange={e=>patchTeam(team.id,{priority:Number(e.target.value)})}><option value={1}>Normal</option><option value={2}>Alta</option><option value={4}>Máxima</option></select></label><button className="icon-button" title="Remover time" aria-label={`Remover time ${i+1}`} disabled={teams.length===1} onClick={()=>onChange(teams.filter(t=>t.id!==team.id))}><Skull size={17}/></button></div></header>
  {team.enemyDefense?.length>0&&<p className="opponent-context">⚔ Ofensa VS Defesa: {team.enemyDefense.map(m=>m.label).join(', ')}</p>}
  <div className="game-decks-bar"><label className="field"><span>Meus Decks do Jogo</span><select aria-label={`Meus Decks do Jogo — time ${i+1}`} value="" disabled={!account?.accountPresets?.length} onChange={e=>{const preset=account.accountPresets.find(p=>p.id===e.target.value);if(preset){patchTeam(team.id,teamFromPreset(preset,account,team));setDeckNotice(`${preset.name} carregado.${preset.missingIds.length?' Há monstros ausentes no JSON.':''}${preset.unitIds.length>3?' Usando as primeiras três posições.':''}`);}}}><option value="">{account?.accountPresets?.length?'Carregar composição do SWEX':'Nenhum deck no JSON importado'}</option>{account?.accountPresets?.map(p=><option key={p.id} value={p.id}>{p.name}{p.missingIds.length?' · incompleto':''}</option>)}</select></label><Select label={`Líder do time ${i+1}`} value={team.leaderKey||team.configs[0]?.key||''} onChange={e=>patchTeam(team.id,{leaderKey:e.target.value})}>{team.configs.map((c,index)=><option key={c.key} value={c.key}>{index+1}. {c.label}</option>)}</Select></div>
  <div className="game-mode-bar"><Select label={`Modo de jogo do time ${i+1}`} value={team.gameMode||'siege'} onChange={e=>patchTeam(team.id,changeGameMode(team,e.target.value))}>{Object.entries(GAME_MODES).map(([key,mode])=><option key={key} value={key}>{mode.label}</option>)}</Select><p>Slots retirados ficam guardados ao trocar de modo. Somente os cards visíveis participam da busca.</p></div>
  <div className="game-mode-bar">{[['towerSpd','Torre SPD (%)',100],['leaderSpd','Líder SPD (%)',100],['enemyCombatSpd','SPD de combate inimiga (opcional)',1000]].map(([key,label,max])=><label className="field" key={key}><span>{label}</span><input aria-label={`${label} do time ${i+1}`} type="number" min="0" max={max} step="1" value={key==='leaderSpd'&&team.leader?.stat==='spd'?team.leader.value:team[key]??''} placeholder="0" onChange={e=>patchTeam(team.id,{[key]:e.target.value,...(key==='leaderSpd'?{leader:null}:{})})}/></label>)}<p>Bônus sobre SPD base. Informe só bônus aplicáveis a todos os cards. Inimigo: ordem inicial em ticks do Speed Tick configurado, sem habilidades; empate com inimigo é conservador.</p></div>
  <div className="team-build-layout">  <div className={`monster-grid slots-${team.configs.length}`}>{team.configs.map((c,j)=><MonsterEditor key={c.key} config={c} index={j} slotCount={team.configs.length} account={account} team={team} options={options} build={builds?.find(b=>b.key===c.key&&b.unitId===c.unitId)} onChange={updated=>patchTeam(team.id,{configs:team.configs.map(x=>x.key===c.key?updated:x)})} onMove={direction=>{if(j+direction<0||j+direction>=team.configs.length)return;const configs=team.configs.slice();[configs[j],configs[j+direction]]=[configs[j+direction],configs[j]];patchTeam(team.id,{configs});}}/>)}</div>
  <SpeedTuneWidget key={`${team.id}-${revision}`} team={team} account={account} options={options} builds={builds?.some(b=>b.teamId===team.id)?builds.filter(b=>b.teamId===team.id):null} onRecalc={()=>setRevision(n=>n+1)}/></div>
  <footer className="team-footer"><div>{team.mode==='defense'?<Shield size={17}/>:<Swords size={17}/>}<span>SPD vinculada: {team.configs.filter(c=>c.enabled&&c.lockSpeedSync).map(c=>c.label).join(' → ')||'Marque ao menos dois monstros'}</span></div><label className="check-label small"><input type="checkbox" checked={team.order==='soft'} onChange={e=>patchTeam(team.id,{order:e.target.checked?'soft':'off'})}/>Preferir também a ordem dos demais</label><div className="button-group">{onOptimizeTeam&&<button type="button" className="button primary small" disabled={!account||!team.configs.some(c=>c.enabled)||team.configs.some(c=>c.enabled&&!account.units.some(u=>u.id===c.unitId))} onClick={()=>onOptimizeTeam(team.id)}>Validar só este time</button>}<TeamCardExport team={team} account={account}/></div></footer>
 </article>)}</>;
}
