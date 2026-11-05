import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,Check,ChevronDown,Crown,Plus,Shield,Swords} from 'lucide-react';
import {editSiegeConfrontation,cleanSiegeTarget,personalSiegeConfrontations,registerSiegeTarget,siegeTargetKey} from '../core/siege-attack-desk';
import {filterSiegeDefenses} from '../core/siege-search';
import {catalogLeader} from '../core/leader-catalog';
import MonsterCombobox from './MonsterCombobox';
import MonsterPortrait from './MonsterPortrait';
import DefenseSearch from './DefenseSearch';
import SiegeDefenseGallery from './SiegeDefenseGallery';
import SiegeCounterComposer,{LeaderLabel,SIEGE_CHOICES} from './SiegeCounterComposer';
import SiegeGuildRows from './SiegeGuildRows';

function TargetForm({initial,onSave,onCancel}){
 const [members,setMembers]=useState(initial?.members||[null,null,null]),[leaderIndex,setLeaderIndex]=useState(initial?.leaderIndex||0),[error,setError]=useState('');
 const leader=catalogLeader(members[leaderIndex]?.masterId);
 return <form className="siege-target-form" onSubmit={e=>{e.preventDefault();try{onSave(cleanSiegeTarget({members,leaderIndex,leader}));}catch(e){setError(e.message);}}}>
  <header><span className="eyebrow">{initial?'EDITAR DEFESA':'NOVO CONFRONTO'}</span><h2>{initial?'Corrigir composição e líder':'Qual defesa você vai enfrentar?'}</h2></header>
  <div className="siege-target-slots">{members.map((m,i)=><div className="siege-target-slot" key={i}><MonsterPortrait unit_master_id={m?.masterId} name={m?.label||`Defesa ${i+1}`}/><MonsterCombobox label={`Defesa inimiga ${i+1}`} options={SIEGE_CHOICES} value={String(m?.masterId||'')} onChange={choice=>{setError('');setMembers(all=>all.map((v,j)=>j===i?(choice?{masterId:choice.master,label:choice.name}:null):v));}}/><button type="button" className="button small" aria-label={`Definir defesa ${i+1} como líder`} aria-pressed={leaderIndex===i} onClick={()=>setLeaderIndex(i)}><Crown size={14}/>{leaderIndex===i?'Líder':'Usar como líder'}</button></div>)}</div>
  <LeaderLabel leader={leader}/>{error&&<p className="notice warning" role="alert">{error}</p>}
  <footer><button type="submit" className="button primary"><Check size={15}/>Salvar defesa</button><button type="button" className="button" onClick={onCancel}>Cancelar</button></footer>
 </form>;
}

export default function SiegeAttackDesk({sharedRecords=[],onInspectShared,targets=[],onTargetsChange,matchups=[],onMatchupsChange,teams,onPersonalTeamsChange,account,options,running,feedback,feedbackBusy,onReact,onOpenTeam,onCopy,author}){
 const [query,setQuery]=useState(''),[debounced,setDebounced]=useState(''),[slots,setSlots]=useState(['','','']),[selectedKey,setSelectedKey]=useState(null),[adding,setAdding]=useState(false),[composer,setComposer]=useState(null),[notice,setNotice]=useState('');
 useEffect(()=>{const timer=setTimeout(()=>setDebounced(query),200);return()=>clearTimeout(timer);},[query]);
 const allRows=useMemo(()=>personalSiegeConfrontations(targets,matchups,teams,account,sharedRecords),[targets,matchups,teams,account,sharedRecords]);
 const rows=useMemo(()=>filterSiegeDefenses(allRows,{query:query?debounced:'',slots}),[allRows,debounced,query==='',slots]);
 const selected=rows.find(r=>r.key===selectedKey)||rows[0];
 function select(row){setSelectedKey(row.key);setAdding(false);setComposer(null);setNotice('');}
 function register(raw){if(adding?.key){const result=editSiegeConfrontation({targets,matchups,teams,row:adding,target:raw});onTargetsChange(result.targets);onMatchupsChange(result.matchups);onPersonalTeamsChange(result.teams);setSelectedKey(siegeTargetKey(result.target));setAdding(false);setQuery('');setSlots(['','','']);setNotice(result.changed?'Defesa atualizada. Ataques preservados; resultados da composição anterior não são atribuídos à nova defesa.':'Defesa atualizada. Ataques e resultados preservados.');return;}const result=registerSiegeTarget(targets,raw);onTargetsChange(result.targets);setSelectedKey(siegeTargetKey(result.target));setQuery('');setSlots(['','','']);setAdding(false);setNotice(result.duplicate?'Esta defesa já está cadastrada. Selecione ou vincule um ataque.':'Defesa salva. Agora você pode vincular seus ataques.');}
 async function save(counter,share,{personalTeamId}={}){
  if(share)throw new Error('Compartilhe counters pelo Espaço da Guilda.');
  const previous=composer.record,id=previous?.id||crypto.randomUUID();
  // A link is local metadata only. The portable offense remains an independent
  // snapshot; saving a counter never overwrites the player's original preset.
  onMatchupsChange([...matchups.filter(m=>m.id!==id),{...counter,id,...(personalTeamId?{personalTeamId}:{})}]);
  setSelectedKey(siegeTargetKey({members:counter.enemyDefense,leader:counter.siege.defenseLeader,leaderIndex:counter.siege.defenseLeaderIndex}));
  setQuery('');setSlots(['','','']);setComposer(null);setNotice('Counter salvo no seu acervo. Nenhuma batalha foi registrada.');
 }
 function saveNote(record,text){
  if(record.sharedSource)throw new Error('Este registro pertence à biblioteca compartilhada.');
  if(typeof text!=='string'||text.length>1000)throw new Error('Use até 1.000 caracteres no comentário.');
  if(record.fromPersonalTeam)onPersonalTeamsChange(teams.map(t=>t.id===record.personalTeamId?{...t,description:text}:t));
  else onMatchupsChange(matchups.map(m=>m.id===record.id?{...m,notes:text}:m));
  setNotice('Comentário salvo.');
 }
 function open(record){const own=teams.find(t=>t.id===record.personalTeamId&&t.mode==='attack');if(own)onOpenTeam(own);else onCopy(record);}
 function inspect(record){if(record.sharedSource){onInspectShared(record);return;}if(record.fromPersonalTeam){open(record);return;}setComposer({record});setNotice('');}
 return <div className="siege-workspace siege-attack-desk">
  <aside className="siege-master" aria-label="Buscar defesas pessoais e da guilda">
   <div className="siege-master-tools"><span className="siege-search-heading">LOCALIZAR DEFESA</span><DefenseSearch compact query={query} onQuery={setQuery} slots={slots} onSlots={setSlots}/><small className="siege-search-scope">Meu acervo + guilda · busca automática</small><button type="button" className="button primary" disabled={running} onClick={()=>{setAdding(true);setComposer(null);setNotice('');}}><Plus size={15}/>Cadastrar defesa inimiga</button></div>
   <SiegeDefenseGallery rows={rows} selectedKey={!adding?selected?.key:null} onSelect={select}/>
   <div className="siege-master-footer"><button type="button" className="button small" disabled={running} onClick={()=>onOpenTeam()}><Swords size={15}/>Meu acervo de ataques <ChevronDown size={13}/></button></div>
  </aside>
  <div id="siege-workspace-panel" role="tabpanel" aria-labelledby="siege-tab-counters" className="siege-detail siege-confrontation-detail">
   {(adding||composer)&&<button type="button" className="button small siege-back-rows" onClick={()=>{setAdding(false);setComposer(null);setNotice('');}}><ArrowLeft size={14}/>Voltar aos confrontos</button>}
   {notice&&<p className="notice" role="status">{notice}</p>}
   {adding?<TargetForm key={adding?.key||'new'} initial={adding?.key?{members:adding.members,leaderIndex:adding.leaderIndex}:undefined} onSave={register} onCancel={()=>setAdding(false)}/>:composer?<SiegeCounterComposer key={composer.record?.key||selected?.key||'new'} initial={composer.record?.counter} initialPresetId={composer.record?.personalTeamId} initialEntryMode={composer.entryMode||'manual'} teams={teams} account={account} defenseSeed={composer.record?undefined:selected?.defenseSeed} author={author} onSave={save} onCancel={()=>setComposer(null)}/>:selected?<SiegeGuildRows personal onSaveNote={saveNote} onEditDefense={row=>{setAdding(row);setComposer(null);setNotice('');}} rows={[selected]} account={account} options={options} feedback={feedback} feedbackBusy={feedbackBusy} onReact={onReact} busy={running} onCopy={open} onInspect={inspect} onAdd={(row,entryMode)=>{setComposer({entryMode});setNotice('');}}/>:<div className="siege-confrontation-empty"><span className="siege-empty-symbol"><Shield size={30}/><Swords size={24}/></span><h2>{allRows.length?'Nenhuma defesa encontrada':'Comece pela defesa inimiga'}</h2><p>{allRows.length?'Ajuste a busca ou limpe os filtros.':'Cadastre o trio adversário e vincule os times que você usa contra ele.'}</p><button type="button" className="button primary" disabled={running} onClick={()=>setAdding(true)}><Plus size={15}/>Cadastrar defesa inimiga</button></div>}
  </div>
 </div>;
}
