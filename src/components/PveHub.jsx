import PresetImportSummary from './PresetImportSummary';
import RaidR5 from './RaidR5';
import {useAccount} from '../contexts/AccountContext';
import PresetTabs from './PresetTabs';
import PveTargetChecker from './PveTargetChecker';
import {useEffect,useMemo,useState} from 'react';
import {pveSlots} from '../core/pve-stages';
import {PVE_AREAS} from '../core/pve';
import {makeTeam,blankConfig} from '../core/data';
import {presetsForArea} from '../core/deckManager';
import {teamFromGameDeck,selectPvePreset} from '../core/account-teams';
import {reorderTeam,updateAutomaticName} from '../core/team-ux';
import {MonsterEditor} from './TeamEditor';
import PveWorkspace from './PveWorkspace';
import usePveHydration from '../hooks/usePveHydration';
import {hydratePveTeam} from '../core/pve-intelligence';
import TeamCardExport from './TeamCardExport';
import EnergyReminder from './EnergyReminder';
import InfoTooltip from './InfoTooltip';
export default function PveHub({area,account,options,plans={},onPlansChange,allTeams=[],reservedIds=[],onSceneChange,initialStage,onNavigate}){
 const global=useAccount();account=account||global?.account;const presetSource=global?.account===account?global.hydratedPresets:account?.accountPresets;
 const definition=PVE_AREAS[area],[stage,setStage]=useState(definition.stages.some(s=>s[0]===initialStage)?initialStage:definition.stages[0][0]);const busy=false,profile=definition.stages.find(s=>s[0]===stage)||definition.stages[0];
 useEffect(()=>{setStage(current=>presetsForArea(presetSource,area,current).length?current:presetSource?.find(p=>p.gameMode===area&&definition.stages.some(s=>s[0]===p.dungeon))?.dungeon||current);},[presetSource,area,definition]);
 const fallback=useMemo(()=>{const preset=presetsForArea(presetSource,area,stage)[0];return preset&&account?teamFromGameDeck(preset,account):{...makeTeam(area),configs:Array.from({length:pveSlots(area,stage)},()=>blankConfig()),name:profile[1],dungeon:stage,autoName:false,mode:'attack',towerSpd:15,guildSpd:0,exportContext:{kind:'pve',title:profile[1]}};},[account,area,stage,presetSource,profile]);const storedTeam=plans[stage]||fallback,team=useMemo(()=>({...storedTeam,towerSpd:15,guildSpd:0}),[storedTeam]);
 useEffect(()=>{onSceneChange?.(area,stage);},[area,stage,onSceneChange]);
 function update(next){onPlansChange(all=>({...all,[stage]:{...updateAutomaticName(team,typeof next==='function'?next(team):next),towerSpd:15,guildSpd:0}}));}
 usePveHydration(team,account,options,filled=>update(filled),!busy&&stage!=='r5');
 const presets=presetsForArea(presetSource,area,stage);
 return <section className="pve-hub"><header className="pve-compact-header"><h1>{definition.label}</h1><InfoTooltip label={`Limites de ${definition.label}`}>Verificação dos atributos de ficha de {pveSlots(area,stage)} monstros contra metas estáticas, sem busca de runas ou simulação de ticks. Não valida IA, restrições de entrada ou vitória do chefe. Rift R5 representa somente o seu time de seis unidades, não os aliados de outros jogadores. Arte de fundo original do sistema; miniaturas dos chefes vêm do snapshot oficial público do jogo no SWARFARM.</InfoTooltip></header><PveWorkspace area={area} stages={definition.stages} stage={stage} onSelect={setStage} disabled={busy} presets={presetSource} onNavigate={onNavigate}><PresetImportSummary account={account}/>{area==='rift'&&stage==='r5'?<section role="tabpanel" id="boss-panel-r5" aria-label={profile[1]}><RaidR5 account={account} options={options} plans={plans} onPlansChange={onPlansChange} allTeams={allTeams} reservedIds={reservedIds}/></section>:<section role="tabpanel" id={`boss-panel-${stage}`} aria-label={profile[1]} className="pve-operation-panel"><header className="section-toolbar"><h2>{profile[1]}</h2><input className="team-name" aria-label="Nome do time PvE" value={team.name} onChange={e=>update({...team,name:e.target.value,autoName:false})}/><TeamCardExport team={{...team,exportContext:{kind:'pve',title:profile[1]}}} account={account} options={options}/></header><PresetTabs presets={presets} value={team.sourceDeckId} disabled={busy} onSelect={p=>onPlansChange(all=>{const next=selectPvePreset(all,stage,p,account,team);return {...next,[stage]:hydratePveTeam(next[stage],account,options)};})}/><fieldset className="editor-fieldset" disabled={busy}><div className={`pve-team-grid slots-${pveSlots(area,stage)}`} data-wizard-section="team">{team.configs.map((c,i)=><MonsterEditor dense key={c.key} compact goalsOpen config={c} index={i} slotCount={pveSlots(area,stage)} account={account} team={team} options={options} leaderActive={!!team.leader&&team.leaderKey===c.key} onLeader={leader=>update({...team,leader,leaderSpd:0,leaderIndex:i,leaderKey:leader?c.key:null})} onMove={direction=>update(reorderTeam(team,i,i+direction))} onChange={next=>update({...team,configs:team.configs.map(x=>x.key===c.key?next:x),...(next.masterId!==c.masterId&&team.leaderKey===c.key?{leader:null,leaderKey:null}:{})})}/>)}</div></fieldset><PveTargetChecker key={stage} account={account} team={team} stage={stage} options={options}/></section>}{area==='dimensional'&&<EnergyReminder/>}</PveWorkspace></section>;
}
