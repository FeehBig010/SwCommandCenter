import './ExportTemplate.css';
import {ExportRuneStone,ExportSetBadge} from './ExportRuneVisual';

const fmt=value=>value==null?'—':Math.round(Number(value)||0).toLocaleString('pt-BR');
const statNames={hp:'HP',atk:'ATK',def:'DEF',spd:'SPD',cr:'CRI Rate',cd:'CRI Dmg',res:'Resistance',acc:'Accuracy'};
const scopeNames={general:'Geral',arena:'Arena',guild:'Guilda',dungeon:'Dungeon',element:'Elemento'};

function Ornament({className=''}){
 return <svg className={`export-ornament ${className}`} viewBox="0 0 100 100" aria-hidden="true"><path d="M50 2L61 31L91 9L69 39L98 50L69 61L91 91L61 69L50 98L39 69L9 91L31 61L2 50L31 39L9 9L39 31Z" fill="#382315" stroke="#cf9d49" strokeWidth="2"/><path d="M50 16L76 50L50 84L24 50Z" fill="#8b572a" stroke="#f2d38a" strokeWidth="2"/><path d="M50 29L64 50L50 71L36 50Z" fill="#ead38a"/></svg>;
}
function RuneWheel({monster,assets}){
 return <div className="export-equipment"><div className="export-artifact-pair">{monster.artifacts.map((artifact,i)=><div className={`export-artifact ${artifact?'filled':''}`} key={i}>
  <svg viewBox="0 0 64 76" aria-hidden="true"><path d="M32 2L59 20V55L32 73L5 55V20Z" fill="#392719" stroke="#c89b56" strokeWidth="3"/><path d="M32 12L48 27L44 49L32 62L20 49L16 27Z" fill={artifact?(i?'#8663b4':'#d2873f'):'#201a17'} stroke={artifact?'#f3d8a0':'#61503c'} strokeWidth="2"/><path d="M32 12V62M16 27L44 49M48 27L20 49" fill="none" stroke={artifact?'#f6d89e':'#61503c'} strokeWidth="1"/></svg>
  <span>{artifact?`+${artifact.level}`:'—'}</span><small>{artifact?`${artifact.stat} +${fmt(artifact.value)}`:`Artefato ${i+1}`}</small>
 </div>)}</div><div className="export-rune-wheel">
  <svg className="export-hexagon" viewBox="0 0 260 256" aria-hidden="true"><polygon points="130,36 212,81 212,171 130,216 48,171 48,81" fill="#201b14" stroke="#987743" strokeWidth="2"/><path d="M130 36L212 171H48ZM130 216L48 81H212Z" fill="none" stroke="#6e5732" strokeWidth="1.5"/><path d="M130 109L146 126L130 143L114 126Z" fill="#553f23" stroke="#c9a768" strokeWidth="1.5"/></svg>
  {Array.from({length:6},(_,i)=>{const angle=i*Math.PI/3;return <div className="export-rune-socket" key={i} style={{left:130+94.7*Math.sin(angle),top:126-90*Math.cos(angle)}}><ExportRuneStone rune={monster.runes[i]} slot={i+1} assets={assets}/></div>;})}
 </div></div>;
}
function MonsterCard({monster,assets}){
 const primary=monster.stats.slice(0,4),secondary=monster.stats.slice(4),skills=monster.skills.length?monster.skills:[{slot:1},{slot:2},{slot:3}];
 return <article className="export-monster-card" data-export-monster={monster.master}>
  {[0,1,2,3].map(c=><span className={`export-corner corner-${c}`} key={c}/>)}
  <div className="export-card-topline"><span>{String(monster.position).padStart(2,'0')} · {monster.role}</span><span>{monster.selectedBuild?'BUILD SELECIONADA':monster.planning?(monster.statsKnown?'PLANEJAMENTO · 6★':'MODELO · STATUS NÃO INFORMADOS'):'FICHA / EQUIPAMENTO SWEX'}</span></div>
  <header className="export-monster-heading"><img className="export-avatar" src={assets[`portrait:${monster.master}`]} alt={monster.name}/><div className="export-monster-identity"><div><span className="export-level">Lv.{monster.level??'—'}</span>{assets[monster.elementIcon]&&<img className="export-element" src={assets[monster.elementIcon]} alt="Elemento"/>}<h2>{monster.name}</h2></div><div className={`export-stars ${monster.awakened?'awakened':''}`}>{monster.stars?'★'.repeat(Math.min(6,monster.stars)):'Estrelas não informadas'}</div></div><div className="export-combat-spd"><small>SPD COMBATE</small><strong>{monster.combatSpd??'—'}</strong></div></header>
  <div className="export-card-main"><div className="export-stat-column"><div className="export-stat-legend"><span>STATUS</span><span>BASE</span><span>+ BÔNUS</span></div><table className="export-stats"><tbody>{primary.map(s=><tr key={s.key}><th>{statNames[s.key]}</th><td>{fmt(s.base)}</td><td className={s.bonus<0?'negative':'bonus'}>{s.bonus==null?'—':`${s.bonus>=0?'+':'−'}${fmt(Math.abs(s.bonus))}`}</td></tr>)}</tbody></table><div className="export-stat-divider"/><table className="export-secondary"><tbody>{secondary.map(s=><tr key={s.key}><th>{statNames[s.key]}</th><td>{fmt(s.total)}{s.total==null?'':'%'}</td></tr>)}</tbody></table></div><RuneWheel monster={monster} assets={assets}/></div>
  {monster.goals.length>0&&<div className="export-goals"><b>METAS</b> {monster.goals.map(g=>`${g.additional?'+':''}${statNames[g.key]} ≥ ${fmt(g.value)}${['cr','cd','res','acc'].includes(g.key)?'%':''}`).join(' · ')}</div>}
  <div className="export-equipment-note"><span>{monster.desiredSets?'Conjuntos desejados':'Conjuntos equipados'}</span><div>{monster.sets.length?monster.sets.map((s,i)=><ExportSetBadge key={i} set={s} assets={assets}/>):'Slots sem itens informados'}</div></div>
  <footer className="export-card-footer"><div className="export-skills">{skills.map((skill,i)=><div className="export-skill" key={i}>{assets[`skill:${skill.icon}`]?<img src={assets[`skill:${skill.icon}`]} alt={skill.name}/>:<span>S{skill.slot||i+1}</span>}<small>{skill.level?`Nv.${skill.level}`:`S${skill.slot||i+1}`}</small></div>)}</div><div className={`export-leader ${monster.activeLeader?'active':''}`}><b>{monster.activeLeader?'LEADER ATIVO':'LEADER SKILL'}</b><span>{monster.leader?`${statNames[monster.leader.stat]||monster.leader.stat.toUpperCase()} +${monster.leader.value}% · ${scopeNames[monster.leader.scope]||monster.leader.scope}`:'Sem habilidade de líder'}</span></div></footer>
  <div className="export-card-speed-note">{monster.runeSpd==null?'Ficha não informada':`Runas +${fmt(monster.runeSpd)} SPD`}{monster.artifactSpd>0?` · Artefatos +${fmt(monster.artifactSpd)} SPD`:''}</div>
 </article>;
}

// Mounted exclusively for export, in an off-screen host. Contains no app chrome,
// form fields or live editor DOM; the PNG is a separate shareable composition.
export default function ExportTemplate({data,assets}){
 return <div id="sw-export-template" className={`sw-export-template export-area-${data.area}`} style={{backgroundImage:`url("${assets[data.background]}")`}}>
  <div className="export-poster-frame"/><header className="export-poster-header"><span className="export-header-seal"><Ornament/></span><div className="export-title-banner"><span>{data.title}</span><h1>{data.subtitle}</h1></div><div className="export-team-title">{data.name}</div>{data.context&&<div className="export-context-title">{data.context}</div>}<div className="export-header-rule"><i/><Ornament/><i/></div></header>
  <div className={`export-monster-grid slots-${data.monsters.length}`}>{data.monsters.map((monster,i)=><MonsterCard key={i} monster={monster} assets={assets}/>)}</div>
  {data.description&&<p className="export-description">{data.description}</p>}<section className="export-turn-order"><header><h2>ORDEM DE TURNOS</h2><span className={data.safe?'safe':''}>{data.orderLabel}</span></header><div>{!data.turns.length&&<span className="export-no-turns">Preencha os status ou equipe o time para calcular os ticks.</span>}{data.turns.map((turn,i)=><span className={`export-turn ${turn.enemy?'enemy':''}`} key={i}><b>Tick {turn.tick}</b><span>{turn.name}{turn.disabled?' · sem ação':''}</span>{i<data.turns.length-1&&<em>›</em>}</span>)}</div></section>
  <footer className="export-poster-footer"><Ornament/><div><strong>SW COMMAND CENTER</strong><span>Base + bônus de ficha · Combate inclui os efeitos informados{data.referenceEnemy?` · Inimigo de referência: ${data.referenceEnemy} SPD`:''}</span></div><Ornament/></footer>
 </div>;
}
