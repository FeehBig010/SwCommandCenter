import AnimatedNumber from './AnimatedNumber';
import {leaderApplies} from '../core/leaders';
import {equippedBuild} from '../core/optimizer';
import {leaderImpact} from '../core/speedTuner';
import {artifactEffects} from '../core/artifacts';
import {LABELS} from '../core/data';
export default function CombatStatsPreview({account,team={},config,options={},build}){
 const unit=account?.units.find(u=>u.id===config.unitId),current=build?.stats?.total?build:equippedBuild(account,team,config,options);
 if(!unit||!current)return <small className="combat-stat-pending">Importe seis runas equipadas para ver os bônus de combate.</small>;
 const impact=leaderImpact(unit,current.stats,current.counts||{},team,config.combat,artifactEffects(account,unit,options.artifacts!==false&&config.artifacts!==false));
 return <div className="combat-stat-preview" aria-label={`Status de combate de ${config.label}`}><span>SPD combate <b><AnimatedNumber value={impact.combat.spd}/></b>{impact.bonus.spd>0&&<em>+{impact.bonus.spd} SPD de Líder</em>}</span>{Object.entries(impact.bonus).filter(([key,n])=>key!=='spd'&&n>0).map(([key,n])=><span key={key}>{LABELS[key]} combate <b><AnimatedNumber value={impact.combat[key]}/></b><em>+{n.toLocaleString('pt-BR')} {LABELS[key]} de Líder</em></span>)}{team.leader&&!leaderApplies(team.leader,unit,team.gameMode||'siege')&&<small className="leader-inapplicable">Líder sem efeito nesta área/elemento.</small>}</div>;
}
