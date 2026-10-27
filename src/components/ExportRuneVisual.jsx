import './ExportRuneVisual.css';

// Both PNG templates use the untouched game artwork, inlined before capture.
// Unknown equipment stays empty; a desired set is never presented as a real rune.
export function ExportRuneStone({rune,slot,assets}){
 const shape=`/game-icons/runes/rune${slot}.png`,filled=!!rune;
 return <div className={`export-rune-stone ${filled?'is-equipped':'is-empty'}`} aria-label={filled?`Slot ${slot}: ${rune.name}, +${rune.level}`:`Slot ${slot} sem runa informada`}>
  <span className="export-rune-slot-number">{slot}</span>
  {filled?<><div className="export-rune-stone-art">{assets[shape]&&<img className="export-rune-shape" src={assets[shape]} alt=""/>}{assets[rune.icon]?<img className="export-rune-glyph" src={assets[rune.icon]} alt={rune.name}/>:<span className="export-rune-unknown">?</span>}</div><span className="export-rune-upgrade">+{rune.level}</span>{rune.stars>0&&<span className="export-rune-stars" aria-label={`${rune.stars} estrelas`}>{'★'.repeat(Math.min(6,rune.stars))}</span>}</>:<span className="export-rune-empty-mark">—</span>}
 </div>;
}

export function ExportSetBadge({set,assets}){
 return <span className="export-set-badge"><span className="export-set-art">{assets[set.icon]?<img src={assets[set.icon]} alt=""/>:<span aria-hidden="true">—</span>}</span><span className="export-set-label">{set.count>1?`${set.count}× `:''}{set.name}{set.partial?` (${set.partial})`:''}</span></span>;
}
