import { useId, useState } from 'react';
import { Anchor, Gem } from 'lucide-react';
import {artifactEffectLabel,normalizeArtifactSubstats} from '../core/artifacts';
import { SETS, STAT_NAMES } from '../core/data';

function Effect({effect}){
 return <span>{STAT_NAMES[effect[0]]||effect[0]} +{effect[1]}{effect[3]?` (+${effect[3]} grind)`:''}</span>;
}
function HelmArt(){
 const id=useId().replace(/[^a-zA-Z0-9]/g,'');
 return <svg className="helm-art" viewBox="0 0 400 400" aria-hidden="true">
  <defs><pattern id={`${id}grain`} width="400" height="400" patternUnits="userSpaceOnUse"><image href="/dark-oak-chart.webp" width="400" height="400" preserveAspectRatio="xMidYMid slice"/></pattern><linearGradient id={`${id}wood`}><stop stopColor="#51351d"/><stop offset=".4" stopColor="#201a12"/><stop offset="1" stopColor="#6c4927"/></linearGradient><linearGradient id={`${id}brass`}><stop stopColor="#47361d"/><stop offset=".4" stopColor="#c4a266"/><stop offset=".65" stopColor="#6a4d25"/><stop offset="1" stopColor="#d3af62"/></linearGradient></defs>
  {Array.from({length:6},(_,i)=><g key={i} transform={`rotate(${i*60} 200 200)`}><path d="M200 200V28" stroke={`url(#${id}wood)`} strokeWidth="17" strokeLinecap="round"/><path d="M197 177V30" stroke="#9d783c" strokeWidth="3"/><rect x="189" y="21" width="22" height="27" rx="9" fill={`url(#${id}brass)`}/></g>)}
  <circle cx="200" cy="200" r="126" fill="none" stroke={`url(#${id}brass)`} strokeWidth="10"/>
  <circle cx="200" cy="200" r="111" fill="none" stroke={`url(#${id}grain)`} strokeWidth="24"/>
  <circle cx="200" cy="200" r="96" fill="none" stroke={`url(#${id}brass)`} strokeWidth="5"/>
  {Array.from({length:12},(_,i)=><circle key={i} cx={200+126*Math.sin(i*Math.PI/6)} cy={200-126*Math.cos(i*Math.PI/6)} r="3" fill="#e1c17a"/>)}
  <circle cx="200" cy="200" r="55" fill="#061920" stroke={`url(#${id}brass)`} strokeWidth="7"/>
  <g className="compass-glow"><circle cx="200" cy="200" r="44" fill="none" stroke="#00f2fe" strokeOpacity=".5"/><path d="M200 157L210 190L243 200L210 210L200 243L190 210L157 200L190 190Z" fill="#074656" stroke="#00f2fe" strokeWidth="2"/><path d="M200 163V237M163 200H237" stroke="#b0fbff" strokeWidth="1.5"/><circle cx="200" cy="200" r="5" fill="#c4fcff"/></g>
 </svg>;
}
export default function EquipmentWheel({build,account}){
 const [selected,setSelected]=useState(1);
 const runes=(build.runeIds||[]).map(id=>account.runes.find(r=>r.id===id)).filter(Boolean);
 const current=runes.find(r=>r.slot===selected)||runes[0];
 const artifacts=Array.from({length:2},(_,i)=>({id:build.artifactIds?.[i],artifact:account.artifacts?.find(a=>a.id===build.artifactIds?.[i])}));
 return <section className="equipment-deck" aria-label={`Equipamentos de ${build.name}`}>
  <h4><Anchor size={18}/> Runas e artefatos</h4>
  <p className="fineprint">Selecione um slot no timão para consultar a runa atual no seu JSON.</p>
  <div className="helm-layout"><div className="rune-helm" role="group" aria-label={`Timão de runas de ${build.name}`}>
   <HelmArt/>
   {Array.from({length:6},(_,i)=>{
    const slot=i+1,rune=runes.find(r=>r.slot===slot),angle=i*Math.PI/3;
    return <button type="button" key={slot} className={`helm-rune ${current?.slot===slot?'selected':''}`} aria-label={`Slot ${slot}${rune?` · ${SETS[rune.set]||rune.set} +${rune.level}`:' · Indisponível'}`} aria-pressed={current?.slot===slot} disabled={!rune} onClick={()=>setSelected(slot)} style={{left:`${50+38*Math.sin(angle)}%`,top:`${50-38*Math.cos(angle)}%`}}><span className="helm-slot">{slot}</span><span>{rune&&SETS[rune.set]?<img className="rune-set-icon" src={`/game-icons/runes/${SETS[rune.set].toLowerCase()}.png`} alt={SETS[rune.set]}/>:<Gem size={20}/>}</span><small>{rune?`+${rune.level}`:'—'}</small></button>;
   })}
  </div>
  <div className="rune-log" aria-live="polite"><h4>Detalhes da runa selecionada</h4>{current?<article className="rune-detail" key={current.id}>
   <div className="rune-heading"><span className="slot-number">{current.slot}</span><strong>{SETS[current.set]?<img className="rune-set-icon" src={`/game-icons/runes/${SETS[current.set].toLowerCase()}.png`} alt={SETS[current.set]} title={SETS[current.set]}/>:current.set}</strong><small>+{current.level}</small></div>
   <p className="main-stat"><Effect effect={current.main}/></p>{current.innate?.[0]>0&&<small className="innate">Inato: <Effect effect={current.innate}/></small>}
   <ul>{current.subs.map((effect,i)=><li key={i}><Effect effect={effect}/></li>)}</ul>
   <footer>{account.units.find(u=>u.id===current.owner)?.name||'No inventário'}<br/><span>Runa #{current.id}</span></footer>
  </article>:<p className="notice warning">As runas desta build não estão disponíveis no JSON atual.</p>}</div></div>
  <section className="artifact-hold" aria-label={`Artefatos de ${build.name}`}><h4>Artefatos · Tesouros equipados</h4><div className="artifact-chests">{artifacts.map(({id,artifact},i)=><article className={`artifact-chest ${artifact?'occupied':'empty'}`} key={i}>
   <div className="treasure-chest" aria-hidden="true"><Gem size={30}/></div><div><h5>Artefato {i+1}</h5>{artifact?<><strong>{({100:'HP',101:'ATK',102:'DEF'})[artifact.main?.[0]]||'Atributo principal'} +{artifact.main?.[1]??0}</strong><small>+{artifact.level} · #{artifact.id}</small><ul className="artifact-substats">{normalizeArtifactSubstats(artifact).map((e,j)=><li key={j}>{artifactEffectLabel(e)} +{e.value}%</li>)}</ul></>:<p>{id?`Artefato #${id} indisponível no JSON atual`:'Nenhum artefato considerado nesta build'}</p>}</div>
  </article>)}</div><p className="fineprint">Somente artefatos considerados no resultado. Nenhum item é equipado automaticamente.</p></section>
 </section>;
}
