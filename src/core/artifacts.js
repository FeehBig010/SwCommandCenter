// SWEX artifact effect IDs, from Xzandro/sw-exporter app/mapping.js (2026-10-22).
export const ARTIFACT_EFFECTS={
 200:['atkLostHp','ATK proporcional ao HP perdido'],201:['defLostHp','DEF proporcional ao HP perdido'],202:['spdLostHp','SPD proporcional ao HP perdido'],203:['spdDisabled','SPD sob incapacidade'],
 204:['atkBuff','Efeito do buff ATK'],205:['defBuff','Efeito do buff DEF'],206:['spdBuff','Efeito do buff SPD'],207:['critBuff','Efeito do buff TC'],
 208:['counterDamage','Dano em contra-ataque'],209:['coopDamage','Dano em ataque conjunto'],210:['bombDamage','Dano de bombas'],211:['reflectDamage','Dano refletido'],212:['crushingDamage','Dano esmagador'],213:['disabledReduction','Redução sob incapacidade'],214:['receivedCritReduction','Redução de dano crítico recebido'],215:['lifeDrain','Roubo de vida'],216:['reviveHp','HP ao reviver'],217:['reviveAtb','Barra ao reviver'],
 218:['additionalHp','Dano adicional por HP'],219:['additionalAtk','Dano adicional por ATK'],220:['additionalDef','Dano adicional por DEF'],221:['additionalSpd','Dano adicional por SPD'],
 222:['critEnemyHighHp','DC com HP inimigo alto'],223:['critEnemyLowHp','DC com HP inimigo baixo'],224:['singleTargetCrit','DC de alvo único no próprio turno'],225:['counterCoopDamage','Dano em contra-ataque/cooperação'],226:['atkDefBuff','Efeito dos buffs ATK/DEF'],
 300:['damageFire','Dano em Fogo'],301:['damageWater','Dano em Água'],302:['damageWind','Dano em Vento'],303:['damageLight','Dano em Luz'],304:['damageDark','Dano em Trevas'],
 305:['reductionFire','Redução de dano de Fogo'],306:['reductionWater','Redução de dano de Água'],307:['reductionWind','Redução de dano de Vento'],308:['reductionLight','Redução de dano de Luz'],309:['reductionDark','Redução de dano de Trevas'],
 400:['critS1','DC da S1'],401:['critS2','DC da S2'],402:['critS3','DC da S3'],403:['critS4','DC da S4'],404:['healS1','Cura da S1'],405:['healS2','Cura da S2'],406:['healS3','Cura da S3'],
 407:['accuracyS1','ACC da S1'],408:['accuracyS2','ACC da S2'],409:['accuracyS3','ACC da S3'],410:['critS34','DC da S3/S4'],411:['firstAttackCrit','DC do primeiro ataque'],
};
const BY_KEY=new Map(Object.entries(ARTIFACT_EFFECTS).map(([id,[key]])=>[key,Number(id)]));
// Named imports may explicitly describe own-HP CD; no native numeric effect ID is invented for it.
BY_KEY.set('critLostHp',null);
export function normalizeArtifactSubstats(artifact){
 const raw=Array.isArray(artifact.sec_eff)&&artifact.sec_eff.length?artifact.sec_eff:artifact.sec_effects??artifact.artifact_substats??artifact.subs??[];
 const rows=Array.isArray(raw)?raw:Object.entries(raw||{}).map(([type,value])=>({type,value}));
 return rows.slice(0,16).flatMap(row=>{
  const type=Array.isArray(row)?row[0]:row?.effect_id??row?.id??row?.type??row?.key;
  const value=Number(Array.isArray(row)?row[1]:row?.value??row?.amount);
  if(!Number.isFinite(value)||value<0||value>1000000)return [];
  const id=BY_KEY.has(type)?BY_KEY.get(type):Number(type),key=BY_KEY.has(type)?type:ARTIFACT_EFFECTS[id]?.[0]||null;
  if(!key&&(!Number.isSafeInteger(id)||id<=0))return [];
  return [{id,key,value}];
 });
}
export function artifactEffects(account,unit,enabled=true){
 const totals={},unknown=[];if(!enabled)return {totals,unknown,artifactIds:[]};
 const equipped=new Set(unit.artifactIds||[]),artifacts=(account.artifacts||[]).filter(a=>equipped.has(a.id));
 for(const a of artifacts){const rows=normalizeArtifactSubstats(a);for(const effect of rows){const key=effect.key||ARTIFACT_EFFECTS[effect.id]?.[0];if(key)totals[key]=(totals[key]||0)+effect.value;else unknown.push({id:effect.id,value:effect.value});}}
 return {totals,unknown,artifactIds:artifacts.map(a=>a.id)};
}
export function artifactEffectLabel(effect){return ARTIFACT_EFFECTS[effect.id]?.[1]||(effect.key==='critLostHp'?'DC por HP próprio perdido (campo nomeado)':`Efeito ${effect.id} não reconhecido`);}
