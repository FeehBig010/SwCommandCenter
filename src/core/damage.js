const BOUNDS={skill:[1,4,1],hits:[1,30,1],multiplier:[0,100,1],hpMultiplier:[0,100,0],defMultiplier:[0,100,0],spdMultiplier:[0,100,0],enemyDef:[0,100000,1000],enemyElement:[0,5,0],enemyHp:[0,100,100],selfHp:[0,100,100],towerAtk:[0,100,0],leaderAtk:[0,100,0],towerCd:[0,100,0],skillUps:[0,100,0],variance:[.1,1,.9],healing:[0,10000000,0],incomingDamage:[0,10000000,0],enemyCritReduction:[0,100,0],enemyRes:[0,100,15],debuffActivation:[0,100,100]};
const FLAGS=['enabled','ignoreDefense','attackBuff','defenseBuff','speedBuff','critBuff','singleTarget','ownTurn','firstAttack','incomingCritical','disabled','armorBreak','brand','glancing'];
export function normalizeDamageSettings(raw={}){
 if(raw==null)raw={};if(typeof raw!=='object'||Array.isArray(raw))throw new Error('Cenário de dano inválido.');
 const result={};
 for(const [key,[min,max,fallback]] of Object.entries(BOUNDS)){const n=Number(raw[key]??fallback);if(!Number.isFinite(n)||n<min||n>max||(['skill','hits','enemyElement'].includes(key)&&!Number.isInteger(n)))throw new Error(`Cenário de dano inválido: ${key}.`);result[key]=n;}
 for(const key of FLAGS)result[key]=raw[key]===undefined?['singleTarget','ownTurn'].includes(key):raw[key]===true;
 result.critMode=['expected','normal','critical'].includes(raw.critMode)?raw.critMode:'expected';
 result.attackKind=['normal','counter','coop'].includes(raw.attackKind)?raw.attackKind:'normal';
 return result;
}
export function estimateRealDamage(unit,stats,settings={},effects={totals:{},unknown:[]}){
 const s=normalizeDamageSettings(settings),a=effects.totals||{},t=stats.total;
 if(!t||!['hp','atk','def','spd','cr','cd'].every(k=>Number.isFinite(t[k])&&t[k]>=0))throw new Error('Atributos de dano incompletos ou inválidos.');
 const lost=1-s.selfHp/100;
 const atkBuff=s.attackBuff ? .5*(1+((a.atkBuff||0)+(a.atkDefBuff||0))/100):0;
 const defBuff=s.defenseBuff ? .7*(1+((a.defBuff||0)+(a.atkDefBuff||0))/100):0;
 const spdBuff=s.speedBuff ? .3*(1+(a.spdBuff||0)/100):0;
 const atk=(t.atk+(unit.base.atk||0)*(s.towerAtk+s.leaderAtk)/100)*(1+(a.atkLostHp||0)*lost/100)*(1+atkBuff);
 const def=t.def*(1+(a.defLostHp||0)*lost/100)*(1+defBuff);
 const spd=(stats.combat?.spd??t.spd)*(1+(a.spdLostHp||0)*lost/100+(s.disabled?(a.spdDisabled||0)/100:0))*(1+spdBuff);
 const advantage=({1:2,2:3,3:1})[unit.element]===s.enemyElement,disadvantage=({1:2,2:3,3:1})[s.enemyElement]===unit.element;
 const cr=Math.min(100,Math.max(0,t.cr+(advantage?15:0)+(s.critBuff?30*(1+(a.critBuff||0)/100):0)));
 const conditionalCd=(a.critEnemyHighHp||0)*s.enemyHp/100+(a.critEnemyLowHp||0)*(1-s.enemyHp/100)+(a.critLostHp||0)*lost;
 const extraCd=(a[`critS${s.skill}`]||0)+([3,4].includes(s.skill)?a.critS34||0:0)+(s.singleTarget&&s.ownTurn?a.singleTargetCrit||0:0)+(s.firstAttack?a.firstAttackCrit||0:0)+conditionalCd;
 const cd=Math.max(0,t.cd+s.towerCd+extraCd-s.enemyCritReduction);
 const critChance=s.glancing?0:disadvantage||s.critMode==='normal'?0:s.critMode==='critical'?1:cr/100;
 const suffix={1:'Water',2:'Fire',3:'Wind',4:'Light',5:'Dark'}[s.enemyElement];
 const onElement=a[`damage${suffix}`]||0,receivedReduction=Math.min(100,a[`reduction${suffix}`]||0);
 const counter=s.attackKind==='counter'?(a.counterDamage||0)+(a.counterCoopDamage||0):s.attackKind==='coop'?(a.coopDamage||0)+(a.counterCoopDamage||0):0;
 const base=atk*s.multiplier+t.hp*s.hpMultiplier+def*s.defMultiplier+spd*s.spdMultiplier;
 const effectiveEnemyDef=s.ignoreDefense?0:s.enemyDef*(s.armorBreak ? .3 : 1);
 const brand=s.brand?1.25:1,glance=s.glancing ? .7 : (disadvantage?.7:1);
 const skillPerHit=Math.floor(base*(1+s.skillUps/100)*(1+critChance*cd/100)*1000/(1140+3.5*effectiveEnemyDef)*s.variance*glance*brand*(1+onElement/100)*(1+counter/100));
 // Flat additional damage is per hit and does not crit or inherit the skill multiplier/DEF mitigation.
 const additionalPerHit=Math.floor(brand*(t.hp*(a.additionalHp||0)/100+atk*(a.additionalAtk||0)/100+def*(a.additionalDef||0)/100+spd*(a.additionalSpd||0)/100));
 const healingBonus=a[`healS${s.skill}`]||0;
 const incomingCritReduction=s.incomingCritical?Math.min(100,a.receivedCritReduction||0):0;
 const disabledReduction=s.disabled?Math.min(100,a.disabledReduction||0):0;
 const applied=new Set(['atkLostHp','defLostHp','spdLostHp','spdDisabled','atkBuff','defBuff','atkDefBuff','spdBuff','critBuff','counterDamage','coopDamage','counterCoopDamage','critEnemyHighHp','critEnemyLowHp','critLostHp','singleTargetCrit','firstAttackCrit','critS1','critS2','critS3','critS4','critS34','healS1','healS2','healS3','accuracyS1','accuracyS2','accuracyS3','receivedCritReduction','disabledReduction','additionalHp','additionalAtk','additionalDef','additionalSpd',...['Fire','Water','Wind','Light','Dark'].flatMap(e=>[`damage${e}`,`reduction${e}`])]);
 const effectiveAccuracy=Math.min(100,(t.acc||0)+(a[`accuracyS${s.skill}`]||0)),debuffChance=s.debuffActivation/100*(1-Math.max(15,s.enemyRes-effectiveAccuracy)/100);
 return {debuffChance:debuffChance*100,effectiveEnemyDef,total:(skillPerHit+additionalPerHit)*s.hits,skillDamage:skillPerHit*s.hits,additionalDamage:additionalPerHit*s.hits,hits:s.hits,critChance:critChance*100,effectiveCritDamage:cd,combat:{atk,def,spd},healing:{base:s.healing,bonus:healingBonus,total:Math.floor(s.healing*(1+healingBonus/100))},defense:{elementReduction:receivedReduction,critReduction:incomingCritReduction,received:Math.floor(s.incomingDamage*(1-receivedReduction/100)*(1-incomingCritReduction/100)*(1-disabledReduction/100))},skillAccuracy:a[`accuracyS${s.skill}`]||0,unknown:effects.unknown||[],unmodeled:Object.keys(a).filter(key=>!applied.has(key)),assumptions:{...s,conditionalCdModel:'linear-hp-at-start-of-skill',additional:'per-hit-no-crit-no-def-mitigation',artifactIds:effects.artifactIds||[]}};
}
