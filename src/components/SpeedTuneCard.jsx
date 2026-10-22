import TurnTimeline from './TurnTimeline';
import {useId,useState} from 'react';
import { AlertTriangle, Compass, RefreshCw } from 'lucide-react';
import { teamTurnPreview } from '../core/optimizer';
import MonsterPortrait from './MonsterPortrait';
export default function SpeedTuneCard({team,account,options,builds,onRecalc,manualPreview,manualError}){
 const tip=useId(),[help,setHelp]=useState(false);
 let preview,error;
 try{if(manualError)throw new Error(manualError);preview=manualPreview||teamTurnPreview(account,team,options,builds);}catch(e){error=e.message;}
 return <aside className="speed-tune-widget" aria-label={`Speed Tune de ${team.name}`}><header><h3><Compass size={16}/>Speed Tune</h3><div className="speed-card-actions"><div className="speed-help"><button type="button" className="speed-help-trigger" aria-label="Regras do Speed Tune" aria-describedby={tip} aria-expanded={help} onKeyDown={e=>{if(e.key==="Escape"){setHelp(false);e.currentTarget.blur();}}} onClick={()=>setHelp(!help)}>i</button><div id={tip} role="tooltip" className={`speed-tooltip ${help?"is-open":""}`}>Ticks globais inteiros, uma ação por tick. O Tick Alvo é um limiar natural de preenchimento de barra; eventos e passivas podem alterar a ordem. O anti-corte compara o time com a defesa informada na primeira rotação. Configure buffs e interrupções no cenário anti-corte; procs aleatórios são riscos condicionais.</div></div></div></header>
  <p className="fineprint">{manualPreview?'Status manuais':builds?'Build otimizada':'Runas equipadas'}</p>
  {error?<p className="notice warning">{error}</p>:!preview.complete?<div className="speed-pending"><strong>{manualPreview?'Selecione os monstros':'Aguardando builds'}</strong>{preview.missing.map((name,i)=><small key={i}>{name}: {manualPreview?'posição pendente':'build incompleta'}</small>)}</div>:<>
   <TurnTimeline preview={preview}/><ol>{preview.turns.filter(t=>!t.enemy).map((turn,i)=>{const actor=preview.actors.find(a=>a.key===turn.key);const cut=preview.cut===true&&preview.turns.findIndex(t=>t.key===turn.key)>preview.turns.findIndex(t=>t.enemy);return <li key={turn.key} className={cut?'turn-is-cut':''}><b className="turn-position">{i+1}</b><MonsterPortrait master={actor.master} name={actor.name} element={actor.master%10}/><span><strong>{actor.name}</strong><small>Tick {turn.tick} · posição do card {team.configs.findIndex(c=>c.key===turn.key)+1}</small>{turn.disabled&&<small className="turn-cut-label">⏸ Turno sem ação</small>}{cut&&<small className="turn-cut-label">⚠ Após o inimigo</small>}</span><b>{actor.spd}</b></li>;})}</ol>
   <p className={preview.cut===true?'speed-cut warning':preview.cut===false&&!preview.scenario?.risks.length?'speed-cut safe':'fineprint'}>{preview.cut===true?<><AlertTriangle size={15}/>Risco de corte na primeira rotação</>:preview.cut===false?(preview.scenario?.risks.length?'Sem corte neste ramo · risco condicional':'Sem corte no cenário informado'):'Informe a SPD inimiga para avaliar corte.'}</p>
  </>}
  {preview?.scenario?.risks.map((risk,i)=><p className="speed-cut warning" key={i}>{risk}</p>)}
  {preview?.complete&&<details className="combat-breakdown"><summary>Atributos e eventos</summary>{preview.actors.map(a=><p className="fineprint" key={a.key}>{a.name} · HP {a.attributes.hp} · DEF {a.attributes.def} · ATK {a.attributes.atk} · CR {a.attributes.cr}%</p>)}{preview.scenario?.log.map((e,i)=><p key={i} className="fineprint">Tick {e.tick} · {e.type} · {e.amount}%</p>)}</details>}
 </aside>;
}
