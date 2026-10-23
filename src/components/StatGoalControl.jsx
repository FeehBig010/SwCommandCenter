import { useId } from 'react';
import { goalSlider } from '../core/stat-goals';

export default function StatGoalControl({stat,label,monster,value,onChange,compact=false,disabled=false}){
 const id=useId(),slider=goalSlider(stat,value);
 const progress=(slider.value-slider.min)/(slider.max-slider.min)*100;
 const percent=['cr','cd','res','acc'].includes(stat);
 return <div className="stat-goal-control">
  <label className="field" htmlFor={id}><span>{label}</span><input id={id} aria-label={`${monster} ${stat}`} type="number" disabled={disabled} min="0" max={['cr','res','acc'].includes(stat)?100:undefined} step="1" value={value??''} placeholder="Livre" onChange={e=>onChange(e.target.value)}/></label>
  {<><input className="nautical-slider" type="range" disabled={disabled} aria-label={`Ajustar ${label} de ${monster}`} aria-valuetext={slider.empty?'Sem meta':`${slider.value}${percent?'%':''}`} min={slider.min} max={slider.max} step="1" value={slider.value} style={{'--slider-fill':`${progress}%`}} onChange={e=>onChange(e.target.value)}/>
  <span className="slider-scale" aria-hidden="true"><span>{slider.min.toLocaleString('pt-BR')}</span><span>{slider.max.toLocaleString('pt-BR')}{percent?'%':''}</span></span></>}
 </div>;
}
