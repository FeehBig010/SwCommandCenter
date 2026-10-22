import {LEADER_STATS,LEADER_SCOPES} from '../core/leaders';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageDown, LoaderCircle } from 'lucide-react';
import { GAME_MODES, LABELS, SETS, STATS, STAT_NAMES } from '../core/data';
import { cardFileName, createTeamCard, downloadCardPng, loadCardPortraits } from '../core/team-card';

const fmt=n=>Number(n).toLocaleString('pt-BR');
function VisualTeamCard({card,portraits,cardRef}){
 const chain=card.monsters.filter(m=>m.lockSpeedSync).map(m=>m.name);
 return <article ref={cardRef} className={`png-team-card png-team-size-${card.monsters.length}`} style={{width:card.monsters.length===1?720:1200}}>
  <header className="png-team-header"><div><p className="png-eyebrow">SW COMMANDCENTER · COMPOSIÇÃO E METAS</p><h1>{card.heading.title}</h1><p className="png-composition-name">{card.name}</p><p className="png-team-mode">{GAME_MODES[card.gameMode]?.label||(card.heading.kind==='pve'?'PvE / Dimensional':'Siege / GvG')} · {card.monsters.length} monstro(s){card.heading.kind==='pve'?' · PvE':card.mode==='attack'?' · Ataque':card.mode==='defense'?' · Defesa':''}</p></div><span className="png-team-seal">SW</span></header>
  {card.description&&<p className="png-team-description">{card.description}</p>}
  <div className="png-combat-bonuses"><span>Torre SPD <b>{card.towerSpd}%</b></span>{card.gameMode==='siege'&&card.guildSpd>0&&<span>Totem Guilda SPD <b>{card.guildSpd}%</b></span>}<span>{card.leader?`Líder ${LEADER_STATS[card.leader.stat]} · ${LEADER_SCOPES[card.leader.scope]}`:'Líder SPD'} <b>{card.leader?.value??card.leaderSpd}%</b></span>{card.enemyCombatSpd>0&&<span>Inimigo · SPD de combate <b>{card.enemyCombatSpd}</b></span>}</div>
  <div className="png-monster-grid">{card.monsters.map((monster,index)=>{
   const counts=monster.sets.filter(Boolean).reduce((all,id)=>({...all,[id]:(all[id]||0)+1}),{});
   return <section className="png-monster" key={index}>
    <div className="png-monster-heading"><span className="png-portrait">{portraits[monster.master]?<img src={portraits[monster.master]} alt={monster.name} width="64" height="64"/>:<span>{monster.name?.[0]||'?'}</span>}</span><div><small>POSIÇÃO {String(index+1).padStart(2,'0')}</small><h2>{monster.isLeader?'👑 ':''}{monster.name}</h2>{monster.isLeader&&<span className="png-leader-badge">LÍDER ATIVO</span>}</div></div>
    <p className="png-section-label">{monster.strictSets?'SETS OBRIGATÓRIOS':'SETS PREFERIDOS'}</p>
    <div className="png-set-badges">{Object.keys(counts).length?Object.entries(counts).map(([id,count])=><span key={id}>{count>1?`${count}× `:''}{SETS[id]&&<img src={`/game-icons/runes/${SETS[id].toLowerCase()}.png`} alt="" width="22" height="22"/>}{SETS[id]||id}</span>):<span>Livres</span>}</div>
    <div className="png-main-stats">{[2,4,6].map(slot=><div key={slot}><small>SLOT {slot}</small><strong>{STAT_NAMES[monster.mains[slot]]||'Livre'}</strong></div>)}</div>
    <p className="png-section-label">METAS {monster.basis==='bonus'?'ADICIONAIS (+)':'TOTAIS'} · SPD DE FICHA</p>
    <div className="png-targets">{STATS.map(key=><div key={key}><span>{LABELS[key]}{['cr','cd','res','acc'].includes(key)?' %':''}</span><strong>{Number(monster.goals[key])>0?fmt(monster.goals[key]):'Livre'}</strong></div>)}</div>
    {monster.technical&&<><p className="png-section-label">{monster.technical.source==='manual'?'STATUS INFORMADOS':monster.technical.source==='local-plan'?'PLANO LOCAL · STATUS ATUAIS':'STATUS DO SWEX'} · BASE + BÔNUS</p><table className="png-actual-stats"><thead><tr><th>Status</th><th>Base</th><th>+ Bônus¹</th><th>Grinds²</th><th>Total</th></tr></thead><tbody>{STATS.map(key=><tr key={key}><th>{LABELS[key]}</th><td>{fmt(monster.technical.base[key])}</td><td>{monster.technical.total?fmt(monster.technical.bonus[key]):'—'}</td><td>{monster.technical.grinds?fmt(monster.technical.grinds[key]):'—'}</td><td>{monster.technical.total?fmt(monster.technical.total[key]):'—'}</td></tr>)}</tbody></table>{monster.technical.sets&&<><p className="png-section-label">CONJUNTOS ATUAIS</p><div className="png-set-badges">{monster.technical.sets.map((id,i)=><span key={i}>{SETS[id]&&<img src={`/game-icons/runes/${SETS[id].toLowerCase()}.png`} alt="" width="22" height="22"/>}{SETS[id]||id}</span>)}</div><div className="png-main-stats">{[2,4,6].map(slot=><div key={slot}><small>SLOT {slot} ATUAL</small><strong>{STAT_NAMES[monster.technical.mains[slot]]||'Não informado'}</strong></div>)}</div></>}</>}
    <p className="png-section-label">NÍVEL DAS HABILIDADES</p><div className="png-skill-levels">{monster.skillLevels.length?monster.skillLevels.map(s=><span key={s.slot}>S{s.slot} · Nv. {s.level}</span>):<span>Não informado{monster.technical?.source==='swex'?' no JSON':''}</span>}</div>
    <p className="png-section-label">{monster.combatSpd?`SPD COMBATE ≥ ${monster.combatSpd}`:''}</p><div className={`png-sync-badge ${monster.lockSpeedSync?'png-sync-locked':''}`}>{monster.lockSpeedSync?'SPD SYNC · VINCULADO':'SPD LIVRE'}</div>
   </section>;
  })}</div>
  <footer className="png-team-footer"><p>{chain.length?`Ordem de SPD de combate: ${chain.join(' → ')}`:'Sem vínculo obrigatório de ordem de SPD.'}</p><span>¹ Bônus inclui runas, conjuntos e artefatos equipados; não inclui líder/torres. ² Grinds já estão incluídos no bônus, não somar novamente.</span><span>TC / DC / RES / ACC sempre totais. Exportado com SW CommandCenter.</span></footer>
 </article>;
}
export default function TeamCardExport({team,account}){
 const [heading,setHeading]=useState('');
 useEffect(()=>setHeading(''),[team.id,team.gameMode,team.dungeon,team.sourceDungeon]);
 const card=createTeamCard(heading?{...team,exportContext:{...team.exportContext,title:heading}}:team,account);
 const [job,setJob]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const cardRef=useRef(),requestRef=useRef();
 useEffect(()=>()=>requestRef.current?.abort(),[]);
 useEffect(()=>{
  if(!job)return;
  const controller=requestRef.current;
  downloadCardPng(cardRef.current,job.card.name,controller.signal)
   .then(()=>{if(!controller.signal.aborted)setMessage(`PNG exportado: ${cardFileName(job.card.name)}${job.missing?' · Miniaturas indisponíveis foram substituídas por iniciais.':''}`);})
   .catch(()=>{if(!controller.signal.aborted)setMessage('Não foi possível gerar o PNG. Tente novamente.');})
   .finally(()=>{if(!controller.signal.aborted){requestRef.current=null;setJob(null);setBusy(false);}});
 },[job]);
 async function exportCard(){
  if(!card||requestRef.current)return;
  const controller=new AbortController();requestRef.current=controller;
  setBusy(true);setMessage('');
  try{
   const portraits=await loadCardPortraits(card.monsters,controller.signal);
   if(!controller.signal.aborted)setJob({card,portraits,missing:card.monsters.some(m=>!portraits[m.master])});
  }catch{if(!controller.signal.aborted){setMessage('Não foi possível preparar o card. Tente novamente.');requestRef.current=null;setBusy(false);}}
 }
 return <div className="team-png-export">
  <details className="export-context"><summary>Contexto do card</summary><label className="field"><span>Objetivo/chefe PvE ou uso/counter PvP</span><input maxLength={200} aria-label={`Título de exportação de ${team.name}`} placeholder={card?.heading.title||'Título automático'} value={heading} onChange={e=>setHeading(e.target.value)}/></label></details>
  <button type="button" className="button small" aria-label={`Exportar card PNG de ${team.name}`} aria-busy={busy} disabled={!card||busy} title={card?'Baixar composição e metas em alta resolução':'Selecione todos os monstros incluídos para exportar'} onClick={exportCard}>{busy?<LoaderCircle className="spin" size={15}/>:<ImageDown size={15}/>} {busy?'Gerando PNG…':'Exportar card (PNG)'}</button>
  {!card&&<span className="fineprint">Selecione todos os monstros incluídos.</span>}
  {message&&<span className="png-export-message" role="status">{message}</span>}
  {job&&createPortal(<div className="png-export-stage" aria-hidden="true"><VisualTeamCard card={job.card} portraits={job.portraits} cardRef={cardRef}/></div>,document.body)}
 </div>;
}
