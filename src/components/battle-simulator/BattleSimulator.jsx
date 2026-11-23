import {useEffect,useMemo,useRef,useState} from 'react';
import {Swords, Activity, Save, Link2, Upload, Download, Target} from 'lucide-react';
import {MONSTER_CATALOG} from '../../core/monsters';
import {monsterBase,monsterSearchText,normalizeSearch} from '../../core/monster-search';
import {battleFromHash,battleLink,normalizeBattle,runBattle,defaultEffect} from '../../core/battle-simulator';
import MonsterPortrait from '../MonsterPortrait';
import SkillEditor,{NumberField} from './SkillEditor';
import BattleTimeline from './BattleTimeline';
import './battle-simulator.css';

const index = new Map(MONSTER_CATALOG.map(monster=>[monster.master,monster]));
const searchIndex = MONSTER_CATALOG.map(monster=>({monster, text:monsterSearchText(monster)}));
const nameOf = master=>index.get(master)?.name || `Monstro ${master}`;
const sideName = key=>key.startsWith('a')?'Aliado':'Inimigo';
const slotName = key=>`${sideName(key)} ${key[1]}`;
const storageKey = 'swcc:battle-simulator:v1';

function demoBattle() {
  return normalizeBattle({version:1,name:'Adriana, Rigna e Mihyang',turns:12,units:[
    {key:'a1',master:26811,spd:312,skills:[{name:'Exemplo · buff SPD',trigger:'once',turn:1,effects:[{...defaultEffect(),type:'speed_buff'}]}]},
    {key:'a2',master:29711,spd:265}, {key:'a3',master:18311,spd:249},
    {key:'e1',master:13912,spd:293}, {key:'e2',master:23513,spd:254}, {key:'e3',master:25112,spd:225},
  ]});
}
function readSaved() {
  try { const items=JSON.parse(localStorage.getItem(storageKey) || '[]');return Array.isArray(items)?items:[]; }
  catch { return []; }
}
function fromLink() {
  try {return {battle:battleFromHash(location.hash),error:''};}
  catch {return {battle:null,error:'O link contém uma batalha inválida.'};}
}

function UnitCard({unit, slots, update}) {
  const [search,setSearch]=useState('');
  const [editing,setEditing]=useState(false);
  const tokens=normalizeSearch(search).trim().split(/\s+/).filter(Boolean);
  const results=editing?searchIndex.filter(({text})=>tokens.every(token=>text.includes(token))).slice(0,8):[];
  return <article className="battle-unit">
    <div className="battle-unit-title">
      {unit.master>0&&<MonsterPortrait master={unit.master} name={nameOf(unit.master)} element={unit.master%10}/>}
      <div><span>{slotName(unit.key)}</span><h3>{unit.master?nameOf(unit.master):'Posição livre'}</h3></div>
    </div>
    <div className="battle-actions">
      <button className="button small" aria-expanded={editing} onClick={()=>{setEditing(!editing);setSearch('');}}>{editing?'Fechar busca':unit.master?'Trocar monstro':'Selecionar monstro'}</button>
      {unit.master>0&&<button className="button small" onClick={()=>update({master:0,atb:0,skills:[]})}>Remover</button>}
    </div>
    {editing&&<div className="battle-search">
      <label>Buscar por nome ou alias<input type="search" autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ex.: Rigna, Totemista"/></label>
      {results.length?results.map(({monster})=><button className="button small" key={monster.master} onClick={()=>{
        update({master:monster.master,spd:unit.master?unit.spd:monsterBase(monster.master)?.spd||200});
        setEditing(false);
      }}>{monster.name} · {['','Água','Fogo','Vento','Luz','Escuridão'][monster.element]}{results.filter(entry=>entry.monster.name===monster.name&&entry.monster.element===monster.element).length>1?` · ${monster.master}`:''}</button>):<p>Nenhum monstro encontrado.</p>}
    </div>}
    {unit.master>0&&<>
      <div className="battle-fields battle-unit-stats">
        <NumberField label="SPD de combate" value={unit.spd} min={1} max={1000} onChange={spd=>update({spd})}/>
        <NumberField label="ATB inicial (%)" value={unit.atb} min={0} max={100} step={0.1} onChange={atb=>update({atb})}/>
      </div>
      <details className="battle-skill-panel"><summary>Habilidades · {unit.skills.length}</summary>
        <SkillEditor unit={unit} slots={slots} onChange={skills=>update({skills})}/>
      </details>
    </>}
  </article>;
}

export default function BattleSimulator() {
  const [initial] = useState(fromLink);
  const [battle,setBattle] = useState(()=>initial.battle || demoBattle());
  const [saved,setSaved] = useState(readSaved);
  const [notice,setNotice] = useState(initial.error);
  const [link,setLink] = useState('');
  const [tab,setTab] = useState('battle');
  const file = useRef(null);
  const resultsPanel = useRef(null);
  useEffect(()=>{
    const loadHash=()=>{const next=fromLink();if(next.battle){setBattle(next.battle);setTab('battle');setLink('');setNotice('Batalha do link carregada.');}else if(next.error)setNotice(next.error);};
    window.addEventListener('hashchange',loadHash);
    return ()=>window.removeEventListener('hashchange',loadHash);
  },[]);
  const {result,error}=useMemo(()=>{
    try {return {result:runBattle(battle,nameOf)};}
    catch(e){return {error:e.message};}
  },[battle]);
  const names=Object.fromEntries(battle.units.filter(u=>u.master).map(u=>[u.key,nameOf(u.master)]));
  const slots=Object.fromEntries(battle.units.map(u=>[u.key,`${slotName(u.key)} · ${names[u.key]||'livre'}`]));
  const patch = update=>{setLink('');setBattle(previous=>({...previous,...update}));};
  function updateUnit(key,changes) {
    setLink('');
    setBattle(previous=>({...previous,units:previous.units.map(unit=>unit.key===key?{...unit,...changes}:unit)}));
  }
  function persist(items,message) {
    try {localStorage.setItem(storageKey,JSON.stringify(items));setSaved(items);setNotice(message);}
    catch {setNotice('Armazenamento indisponível. Exporte a simulação em JSON.');}
  }
  function save(kind) {
    if (!Object.keys(names).length){setNotice('Selecione pelo menos um monstro antes de salvar.');return;}
    const data=normalizeBattle(battle);
    if(kind==='team')for(const unit of data.units){unit.atb=0;unit.skills=[];}
    const item={id:crypto.randomUUID(),kind,data};
    persist([item,...saved],kind==='team'?'Equipes salvas neste navegador.':'Simulação salva neste navegador.');
  }
  async function share() {
    const url=battleLink(battle,location.href);
    setLink(url);
    try {await navigator.clipboard.writeText(url);setNotice('Link copiado. O acesso segue as permissões do Site.');}
    catch {setNotice('Selecione o endereço no campo para copiar o link.');}
  }
  function download() {
    const url=URL.createObjectURL(new Blob([JSON.stringify(normalizeBattle(battle),null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='swcc-batalha.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    setNotice('JSON exportado.');
  }
  async function upload(event) {
    const source=event.target.files?.[0];event.target.value='';
    if(!source)return;
    try {
      if(source.size>300000)throw new Error('O arquivo excede o limite de 300 KB.');
      const next=normalizeBattle(JSON.parse(await source.text()));
      setBattle(next);setTab('battle');setLink('');setNotice('Simulação importada.');
    } catch(e){setNotice(`Falha na importação. ${e.message}`);}
  }
  return <div className="battle-workspace">
    <header className="battle-hero"><Swords size={28} aria-hidden="true"/><div>
      <h1>Simulador de Batalha</h1>
      <p>Monte um confronto 3 × 3 e teste a ordem dos turnos.</p>
    </div></header>
    <nav className="battle-actions battle-tabs" aria-label="Seções do simulador">
      {[['battle','Batalha'],['saved','Salvos'],['damage','Otimizadores de dano']].map(([key,label])=><button className="button" key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{label}</button>)}
    </nav>
    {notice&&<p className="battle-notice" role="status">{notice}</p>}
    {tab==='battle'&&<>
      <section className="battle-card">
        <div className="battle-fields battle-setup">
          <label>Nome da simulação<input maxLength={80} value={battle.name} onChange={e=>patch({name:e.target.value})}/></label>
          <NumberField label="Turnos para prever" value={battle.turns} min={1} max={30} onChange={turns=>patch({turns})}/>
        </div>
        {result?.turns[0]&&<div className="battle-preview"><span>Abre a batalha <strong>{names[result.turns[0].key]}</strong> · Tick {result.turns[0].tick}</span>
          <button className="button small" onClick={()=>{resultsPanel.current.focus({preventScroll:true});resultsPanel.current.scrollIntoView({block:'start'});}}>Ver timeline</button></div>}
        <div className="battle-actions">
          <button className="button small" onClick={()=>save('simulation')}><Save size={16}/>Salvar simulação</button>
          <button className="button small" onClick={()=>save('team')}>Salvar equipes</button>
          <button className="button small" onClick={share}><Link2 size={16}/>Copiar link</button>
          <button className="button small" onClick={()=>file.current.click()}><Upload size={16}/>Importar JSON</button>
          <button className="button small" onClick={download}><Download size={16}/>Exportar JSON</button>
          <button className="button small" onClick={()=>patch(normalizeBattle({version:1,units:[]}))}>Nova batalha</button>
          <button className="button small" onClick={()=>patch(demoBattle())}>Carregar exemplo</button>
        </div>
        <input hidden type="file" ref={file} accept=".json,application/json" onChange={upload}/>
        {link&&<label className="battle-link">Link da simulação<input readOnly value={link} onFocus={e=>e.target.select()}/></label>}
      </section>
      {[['a','Equipe aliada'],['e','Equipe inimiga']].map(([prefix,label])=><section key={prefix} className="battle-card">
        <h2><span className={prefix==='a'?'battle-dot ally':'battle-dot enemy'}/>{label}</h2>
        <div className="battle-team">{battle.units.filter(unit=>unit.key.startsWith(prefix)).map(unit=><UnitCard key={unit.key} unit={unit} slots={slots} update={changes=>updateUnit(unit.key,changes)}/>)}</div>
      </section>)}
      <section className="battle-card battle-results" ref={resultsPanel} tabIndex={-1}>
        <h2><Activity size={21}/> Previsão de turnos</h2>
        {error?<p role="alert">{error}</p>:<BattleTimeline result={result} names={names}/>}
      </section>
      <section className="battle-card battle-rules">
        <details><summary>Regras e limites do MVP</summary>
          <p>Use a SPD de combate já com runas, torre e líder. Cada tick soma 7% da SPD à barra. A cada tick age uma unidade com pelo menos 100% de ATB. A maior barra vence. O motor desempata por SPD, depois favorece o lado inimigo e a ordem das posições.</p>
          <p>Os efeitos do turno 0 precedem o primeiro tick e seguem a ordem das posições, aliados primeiro. A barra de quem age zera antes dos efeitos. Habilidades e efeitos simultâneos seguem a ordem do editor. Cada efeito resolve seus alvos no momento de aplicação. Empates no menor ATB seguem a ordem das posições.</p>
          <p>A duração conta os turnos do alvo. Efeitos do editor são configurados manualmente e assumidos como resolvidos, respeitando a imunidade para slow e atordoamento. O motor inclui passivas cadastradas. Dano, IA, resistência e procs aleatórios ficam fora desta previsão.</p>
        </details>
      </section>
    </>}
    {tab==='saved'&&<section className="battle-card"><h2>Equipes e simulações salvas</h2>
      <p>Disponíveis neste navegador.</p>
      {saved.length===0&&<p>Nenhum item salvo.</p>}
      <ul className="battle-saves">{saved.map(item=><li key={item.id}><div><strong>{item.data.name}</strong><small>{item.kind==='team'?'Equipes e velocidades':'Simulação completa'}</small></div>
        <div className="battle-actions"><button className="button small" onClick={()=>{setBattle(normalizeBattle(item.data));setLink('');setTab('battle');setNotice('Item salvo carregado.');}}>Carregar</button>
          <button className="button small" onClick={()=>persist(saved.filter(entry=>entry.id!==item.id),'Item removido.')}>Remover</button></div></li>)}</ul>
    </section>}
    {tab==='damage'&&<div className="battle-roadmap">
      <section className="battle-card"><h2><Target size={21}/>Damage Optimizer</h2><p>Área futura para avaliar dano por habilidade e monstro.</p></section>
      <section className="battle-card"><h2><Swords size={21}/>Team Damage Optimizer</h2><p>Área futura para avaliar o dano da equipe ao longo da sequência de ações.</p></section>
    </div>}
  </div>;
}
