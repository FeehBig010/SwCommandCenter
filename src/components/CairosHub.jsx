import {useEffect,useMemo,useState} from 'react';
import {useAccount} from '../contexts/AccountContext';
import PresetImportSummary from './PresetImportSummary';
import PresetTabs from './PresetTabs';
import PveWorkspace from './PveWorkspace';
import PveTargetChecker from './PveTargetChecker';
import usePveHydration from '../hooks/usePveHydration';
import {hydratePveTeam} from '../core/pve-intelligence';
import {cairosStagesForPresets} from '../core/pve';
import {presetsForArea} from '../core/deckManager';
import {MonsterEditor} from './TeamEditor';
import {selectPvePreset} from '../core/account-teams';
import {reorderTeam,updateAutomaticName} from '../core/team-ux';
import {ALL_CAIROS_PROFILES,makeCairosTeam} from '../core/cairos';
import TeamCardExport from './TeamCardExport';
export default function CairosHub({account,options={},plans={},onPlansChange,onSceneChange,initialStage,onNavigate}){
 const global=useAccount();account=account||global?.account;
 const presetSource=global?.account===account?global.hydratedPresets:account?.accountPresets;
 const stages=useMemo(()=>cairosStagesForPresets(presetSource),[presetSource]);
 const [dungeon,setDungeon]=useState(()=>stages.some(s=>s[0]===initialStage)?initialStage:account?.accountPresets?.find(p=>p.gameMode==='cairos'&&stages.some(s=>s[0]===p.dungeon))?.dungeon||'gbah');
 useEffect(()=>{setDungeon(current=>presetsForArea(presetSource,'cairos',current).length?current:presetSource?.find(p=>p.gameMode==='cairos'&&stages.some(s=>s[0]===p.dungeon))?.dungeon||(stages.some(s=>s[0]===current)?current:stages[0][0]));},[presetSource,stages]);
 const profile=ALL_CAIROS_PROFILES.find(p=>p.id===dungeon),fallback=useMemo(()=>makeCairosTeam(profile,account),[profile,account]);
 const team=plans[dungeon]||fallback;
 function setTeam(update){onPlansChange(all=>{const previous=all[dungeon]||fallback,next=typeof update==='function'?update(previous):update;return {...all,[dungeon]:updateAutomaticName(previous,next)};});}
 usePveHydration(team,account,options,filled=>setTeam(filled));
 useEffect(()=>{onSceneChange?.('cairos',dungeon);},[dungeon,onSceneChange]);
 return <div className="cairos-reactive pve-hub" data-dungeon={dungeon}><header className="pve-compact-header"><h1>Cairos Dungeon</h1></header><PveWorkspace area="cairos" stages={stages} stage={dungeon} onSelect={setDungeon} presets={presetSource} onNavigate={onNavigate}><PresetImportSummary account={account}/><section className="cairos-panel pve-operation-panel" role="tabpanel" id={`boss-panel-${dungeon}`} aria-label={profile.title}><header className="section-toolbar"><h2>{profile.title}</h2><input className="team-name" aria-label="Nome do time Cairos" value={team.autoName?team.configs.map(c=>c.label).join(' - '):team.name} onChange={e=>setTeam({...team,name:e.target.value,autoName:false})}/><TeamCardExport team={team} account={account} options={options}/><PresetTabs presets={presetsForArea(presetSource,'cairos',dungeon)} value={team.sourceDeckId} onSelect={p=>onPlansChange(all=>{const next=selectPvePreset(all,dungeon,p,account,team);return {...next,[dungeon]:hydratePveTeam(next[dungeon],account,options)};})}/></header>
 <PveTargetChecker key={dungeon} stage={dungeon} team={team} account={account} options={options}/>
 <div className="cairos-team-grid" data-wizard-section="team">{team.configs.map((c,i)=><article className="cairos-member" key={c.key}><MonsterEditor dense compact config={c} index={i} slotCount={5} account={account} team={team} options={options} onChange={next=>setTeam(t=>({...t,configs:t.configs.map(x=>x.key===c.key?next:x),...(next.masterId!==c.masterId&&t.leaderKey===c.key?{leader:null,leaderKey:null}:{})}))} onMove={direction=>setTeam(t=>reorderTeam(t,i,i+direction))} onLeader={leader=>setTeam(t=>({...t,leader,leaderIndex:i,leaderKey:leader?c.key:null,leaderSpd:0}))} leaderActive={!!team.leader&&team.leaderKey===c.key}/><details className="pve-validation-flags"><summary>Cap de ACC</summary><label className="check-label"><input type="checkbox" checked={c.requireAccuracy!==false} onChange={e=>setTeam(t=>({...t,configs:t.configs.map(x=>x.key===c.key?{...x,requireAccuracy:e.target.checked}:x)}))}/>Exigir cap ACC</label></details></article>)}</div></section></PveWorkspace></div>;
}
