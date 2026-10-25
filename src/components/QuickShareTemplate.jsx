import './QuickShareTemplate.css';

// A dedicated export surface: no inputs, action buttons, inventory or app chrome.
export default function QuickShareTemplate({data,assets}){
 return <div id="sw-export-template" className="quick-share-template">
  <header><span>SW COMMAND CENTER · {data.title}</span><h1>{data.name}</h1><p>Speed Ficha · Composição de {data.monsters.length} monstros</p></header>
  <div className="quick-share-monsters">{data.monsters.map(monster=><article key={monster.position}>
   <span className="quick-share-position">{monster.position===1?'01 · ABRIDOR':String(monster.position).padStart(2,'0')}</span>
   <div className="quick-share-avatar"><img src={assets[`portrait:${monster.master}`]} alt={monster.name}/>{assets[monster.elementIcon]&&<img className="quick-share-element" src={assets[monster.elementIcon]} alt="Elemento"/>}</div>
   <h2>{monster.name}</h2>
   <div className="quick-share-sets">{monster.sets.length?monster.sets.map((set,i)=><span key={i}>{assets[set.icon]&&<img src={assets[set.icon]} alt=""/>}<small>{set.count>1?`${set.count}× `:''}{set.name}</small></span>):<small>Conjuntos livres</small>}</div>
   <div className="quick-share-speed"><span>SPD FICHA</span><strong>{monster.stats.find(stat=>stat.key==='spd')?.total??'—'}</strong></div>
   <div className="quick-share-combat"><span>Combate</span><b>{monster.combatSpd??'—'} SPD</b></div>
   <div className="quick-share-combat"><span>Runas</span><b>+{monster.runeSpd??'—'} SPD</b></div>
  </article>)}</div>
  <section className="quick-share-turns"><h2>ORDEM DE TURNOS</h2><div>{data.turns.map((turn,i)=><span key={i} className={turn.enemy?'enemy':''}><b>Tick {turn.tick}</b><span>{turn.name}</span></span>)}</div><p>{data.orderLabel}</p></section>
  <footer>CALCULADORA LIVRE · SW COMMAND CENTER</footer>
 </div>;
}
