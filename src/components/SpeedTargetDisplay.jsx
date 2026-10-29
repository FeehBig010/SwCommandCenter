import MotionValue from './MotionValue';
import {useState} from 'react';
import InfoTooltip from './InfoTooltip';
export default function SpeedTargetDisplay({name,combatSpd,runeSpd,target=false}){
 const [runes,setRunes]=useState(false);
 return <div className="speed-target-display"><div className="speed-target-heading"><span>{runes?'SPD requerida nas runas':'Velocidade de combate real'}{target?' · alvo':''}</span><InfoTooltip label={`Conversão de velocidade de ${name}`}>Combate inclui ficha, líder, torres, buffs, passivas e bônus de artefatos informados. Runagem mostra somente o adicional sobre a SPD base, invertendo a mesma fórmula com arredondamento inteiro. A meta anti-corte depende da ordem e do cenário; eventos futuros continuam sendo avaliados na timeline.</InfoTooltip></div><MotionValue value={runes?runeSpd:combatSpd} aria-label={`Velocidade exibida de ${name}`}>{runes?`+${runeSpd}`:combatSpd} SPD</MotionValue><label className="speed-view-switch" data-export-ignore><span>Combate</span><input type="checkbox" role="switch" aria-label={`Mostrar somente SPD das runas de ${name}`} checked={runes} onChange={e=>setRunes(e.target.checked)}/><span>Runagem</span></label></div>;
}
