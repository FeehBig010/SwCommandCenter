import {estimateRealDamage,normalizeDamageSettings} from '../core/damage.js';
// Curated skill snapshots already used by the Cairos wave model. No fallback
// multiplier is called official. Other skills keep explicit manual coefficients.
export const SKILL_PROFILES=Object.freeze({
 '13413:3':Object.freeze({master:13413,skill:3,name:'Lushen · Amputation Magic',multiplier:.68,hits:3,ignoreDefense:true,maxSkillUps:30,source:'https://swarfarm.com/bestiary/13413-wind-joker-lushen/'}),
 '13911:3':Object.freeze({master:13911,skill:3,name:'Julie · Thousand Shots (HP cheio)',multiplier:1.2,hits:6,ignoreDefense:false,maxSkillUps:15,requiresFullHp:true,source:'https://swarfarm.com/bestiary/13911-water-pierret-julie/'})
});
export function skillProfile(master,slot){return SKILL_PROFILES[`${master}:${slot}`]||null;}
export function applySkillProfile(settings,master,slot){
 const profile=skillProfile(master,slot);if(!profile)throw new Error('Habilidade sem multiplicador validado; informe os coeficientes manualmente.');
 return {...normalizeDamageSettings(settings),skill:slot,multiplier:profile.multiplier,hpMultiplier:0,defMultiplier:0,spdMultiplier:0,hits:profile.hits,ignoreDefense:profile.ignoreDefense,skillUps:Math.min(Number(settings?.skillUps)||0,profile.maxSkillUps),...(profile.requiresFullHp?{selfHp:100}:{})};
}
export function calculateDamage({unit,stats,settings={},effects,profile=false}){
 const configured=profile?applySkillProfile(settings,unit.master,Number(settings.skill||3)):settings;
 if(profile&&skillProfile(unit.master,configured.skill)?.requiresFullHp&&Number(settings.selfHp??100)!==100)throw new Error('Este perfil de Julie exige HP cheio para seis golpes.');
 return estimateRealDamage(unit,stats,configured,effects);
}
