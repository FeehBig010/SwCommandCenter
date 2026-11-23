import {AMOUNTS, CONDITIONS, DURATIONS, EFFECTS, TARGETS, TRIGGERS, defaultEffect, defaultSkill} from '../../core/battle-simulator';

export function SelectField({label, value, options, onChange}) {
  return <label>{label}<select value={value} onChange={e=>onChange(e.target.value)}>
    {Object.entries(options).map(([key,text])=><option key={key} value={key}>{text}</option>)}
  </select></label>;
}

export function NumberField({label, value, min, max, step=1, onChange}) {
  return <label>{label}<input type="number" inputMode={step===1?'numeric':'decimal'} value={value}
    min={min} max={max} step={step} onChange={e=>onChange(e.target.value===''?'':Number(e.target.value))}
    onBlur={e=>{const number=e.target.valueAsNumber;onChange(Number.isFinite(number)?Math.max(min,Math.min(number,max)):min);}}/></label>;
}

export default function SkillEditor({unit, slots, onChange}) {
  const replaceSkill = (index, patch) => onChange(unit.skills.map((skill,i)=> i===index?{...skill,...patch}:skill));
  return <>
    {unit.skills.map((skill,index)=>{
      const edit = patch=>replaceSkill(index,patch);
      return <section className="battle-skill" key={index} aria-label={skill.name || 'Habilidade'}>
        <div className="battle-fields">
          <label>Nome da habilidade<input value={skill.name} maxLength={80} onChange={e=>edit({name:e.target.value})}/></label>
          <SelectField label="Quando usar" value={skill.trigger} options={TRIGGERS} onChange={trigger=>edit({trigger})}/>
          {skill.trigger==='once'&&<NumberField label="Turno do monstro" value={skill.turn} min={1} max={30} onChange={turn=>edit({turn})}/>}
        </div>
        {skill.effects.map((effect,effectIndex)=>{
          const update = patch=>edit({effects:skill.effects.map((item,i)=>i===effectIndex?{...item,...patch}:item)});
          return <div className="battle-effect" key={effectIndex}>
            <div className="battle-fields">
              <SelectField label="Efeito" value={effect.type} options={EFFECTS} onChange={type=>update({type})}/>
              <SelectField label="Tipo de alvo" value={effect.target} options={TARGETS} onChange={target=>update({target})}/>
              {effect.target==='specific'&&<SelectField label="Alvo específico" value={effect.specific} options={slots} onChange={specific=>update({specific})}/>}
              {AMOUNTS.includes(effect.type)&&<NumberField label="Variação de ATB (p.p.)" value={effect.amount} min={0} max={300} step={0.1} onChange={amount=>update({amount})}/>}
              {DURATIONS.includes(effect.type)&&<NumberField label="Duração (turnos do alvo)" value={effect.duration} min={1} max={10} onChange={duration=>update({duration})}/>}
              <SelectField label="Condição de uso" value={effect.condition} options={CONDITIONS} onChange={condition=>update({condition})}/>
              {effect.condition!=='always'&&<NumberField label="Limiar de ATB (%)" value={effect.threshold} min={0} max={500} step={0.1} onChange={threshold=>update({threshold})}/>}
            </div>
            <button className="button small" onClick={()=>edit({effects:skill.effects.filter((_,i)=>i!==effectIndex)})}>Remover efeito</button>
          </div>;
        })}
        <div className="battle-actions">
          <button className="button small" disabled={skill.effects.length>=8} onClick={()=>edit({effects:[...skill.effects,defaultEffect()]})}>Adicionar efeito</button>
          <button className="button small" onClick={()=>onChange(unit.skills.filter((_,i)=>i!==index))}>Remover habilidade</button>
        </div>
      </section>;
    })}
    <button className="button small" disabled={unit.skills.length>=12} onClick={()=>onChange([...unit.skills,defaultSkill()])}>Adicionar habilidade</button>
  </>;
}
