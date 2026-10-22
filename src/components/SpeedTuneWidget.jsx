import { AlertTriangle, Compass, RefreshCw } from 'lucide-react';
import { teamTurnPreview } from '../core/optimizer';
import MonsterPortrait from './MonsterPortrait';
export default function SpeedTuneWidget({team,account,options,builds,onRecalc}){
 let preview,error;
 try{preview=teamTurnPreview(account,team,options,builds);}catch(e){error=e.message;}
 return <aside className="speed-tune-widget" aria-label={`Speed Tune de ${team.name}`}><header><h3><Compass size={16}/>Speed Tune</h3><button className="icon-button" type="button" aria-label={`Recalcular ordem de ${team.name}`} onClick={onRecalc}><RefreshCw size={14}/></button></header>
  <p className="fineprint">{builds?'Build otimizada':'Runas equipadas'} · tick {options.speedTick??7}%</p>
  {error?<p className="notice warning">{error}</p>:!preview.complete?<div className="speed-pending"><p>Selecione os monstros e otimize, ou importe seis runas equipadas por unidade.</p>{preview.missing.map((name,i)=><small key={i}>{name}: build incompleta</small>)}</div>:<>
   <ol>{preview.turns.filter(t=>t.key!=='__enemy__').map((turn,i)=>{const actor=preview.actors.find(a=>a.key===turn.key);const cut=preview.cut===true&&preview.turns.findIndex(t=>t.key===turn.key)>preview.turns.findIndex(t=>t.key==='__enemy__');return <li key={turn.key} className={cut?'turn-is-cut':''}><b className="turn-position">{i+1}</b><MonsterPortrait master={actor.master} name={actor.name} element={actor.master%10}/><span><strong>{actor.name}</strong><small>Tick {turn.tick} · posição do card {team.configs.findIndex(c=>c.key===turn.key)+1}</small>{cut&&<small className="turn-cut-label">⚠ Após o inimigo</small>}</span><b>{actor.spd}</b></li>;})}</ol>
   <p className={preview.cut===true?'speed-cut warning':preview.cut===false?'speed-cut safe':'fineprint'}>{preview.cut===true?<><AlertTriangle size={15}/>Risco de corte na primeira rotação</>:preview.cut===false?'Sem corte no cenário informado':'Informe a SPD inimiga para avaliar corte.'}</p>
  </>}
  <p className="fineprint">SPD de combate. Modelo sem habilidades, passivas ou boosts de barra.</p>
 </aside>;
}
