import {normalizeCombat} from '../core/speedTuner';
import InfoTooltip from './InfoTooltip';
export default function ArtifactBonuses({config,onChange,inline=false}){
 const combat=normalizeCombat(config.combat);
 const fields=[['artifactSpd','SPD adicional',500],['artifactSpdBuff','Buff SPD %',100],['artifactSpdLostHp','SPD / HP perdido %',100],['artifactSpdDisabled','SPD incapacitado %',100]];
 const field=([key,label,max])=><label className="field" key={key}><span>{key==='artifactSpd'&&inline?'Artefatos · +SPD':label}</span><input type="number" min="0" max={max} step="1" aria-label={`${label} de ${config.label}`} value={combat[key]} onChange={e=>onChange({...config,combat:{...combat,[key]:Math.max(0,Math.min(max,Number(e.target.value)||0))}})}/></label>;
 return <>{inline&&<div className="artifact-spd-inline">{field(fields[0])}</div>}<details className="artifact-bonus-inputs"><summary>{inline?'Outros bônus de artefatos':'Bônus de artefatos'} <InfoTooltip label={`Bônus de artefatos de ${config.label}`}>Bônus manuais adicionais aos artefatos do inventário. SPD fixa é somada uma vez antes dos multiplicadores. Buff SPD só atua com o buff ativo; HP perdido e incapacidade dependem do estado de combate. Zere os campos para usar apenas o SWEX.</InfoTooltip></summary><div className="artifact-bonus-grid">{(inline?fields.slice(1):fields).map(field)}</div></details></>;
}
