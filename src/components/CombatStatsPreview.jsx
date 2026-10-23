import SpeedTargetDisplay from './SpeedTargetDisplay';
import {combatAttributes,requiredSheetSpeed} from '../core/speedTuner';
import InfoTooltip from './InfoTooltip';
import AnimatedNumber from './AnimatedNumber';
import {leaderApplies} from '../core/leaders';
import {equippedBuild} from '../core/optimizer';
import {leaderImpact} from '../core/speedTuner';
import {artifactEffects} from '../core/artifacts';
import {LABELS} from '../core/data';
export default function CombatStatsPreview({account,team={},config,options={},build}){
 const unit=account?.units.find(u=>u.id===config.unitId),current=build?.stats?.total?build:equippedBuild(account,team,config,options);
 if(!unit||!current)return <InfoTooltip label="Prévia de combate pendente">Importe seis runas equipadas para ver os bônus de combate.</InfoTooltip>;
 const impact=leaderImpact(unit,current.stats,current.counts||{},team,config.combat,artifactEffects(account,unit,options.artifacts!==false&&config.artifacts!==false));
 const goal=Number(config.goals?.spd)||0,effects=artifactEffects(account,unit,options.artifacts!==false&&config.artifacts!==false),target=Number(config.combatSpd)>0?Number(config.combatSpd):goal>0?(config.raidGoals?goal:combatAttributes(unit,{total:{...current.stats.total,spd:goal+(config.basis==='bonus'?unit.base.spd:0)}},current.counts||{},team,config.combat,effects).spd):impact.combat.spd,sheet=requiredSheetSpeed(target,unit,team,config.combat,effects,current.counts||{});
 return <div className="combat-stat-preview" aria-label={`Status de combate de ${config.label}`}><SpeedTargetDisplay name={config.label} combatSpd={target} runeSpd={Math.max(0,(sheet??unit.base.spd)-unit.base.spd)} target={Number(config.combatSpd)>0||goal>0}/>{Object.entries(impact.bonus).filter(([key,n])=>key!=='spd'&&n>0).map(([key,n])=><span key={key}>{LABELS[key]} combate <b><AnimatedNumber value={impact.combat[key]}/></b><em>+{n.toLocaleString('pt-BR')} {LABELS[key]} de Líder</em></span>)}{team.leader&&!leaderApplies(team.leader,unit,team.gameMode||'siege')&&<InfoTooltip label="Líder sem efeito nesta área ou elemento">A habilidade selecionada não se aplica a esta área ou elemento; nenhum bônus foi somado.</InfoTooltip>}</div>;
}
