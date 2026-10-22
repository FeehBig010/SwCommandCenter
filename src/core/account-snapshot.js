import {equipmentPools} from './equipment-pools.js';
import {normalizeCrafts} from './rune-crafts.js';
import {cleanTowers} from './towers.js';
import {normalizeAccount,STATS} from './data.js';
const fail=()=>{throw new Error('Backup de conta inválido ou incompatível.');};
const num=(v,max=100000000)=>{const n=Number(v);if(!Number.isFinite(n)||n<0||n>max)fail();return n;};
const id=v=>{const n=num(v,Number.MAX_SAFE_INTEGER);if(!Number.isSafeInteger(n)||n<=0)fail();return n;};
const effect=value=>{if(!Array.isArray(value)||value.length>4)fail();return value.map(v=>num(v));};
// Reconstruct and re-parse a whitelist. Neither raw SWEX nor arbitrary nested keys are uploaded.
export function accountSnapshot(input){
 if(!input||input.version!==1||!Array.isArray(input.units)||!Array.isArray(input.runes)||!Array.isArray(input.artifacts)||input.units.length>10000||input.runes.length>100000||input.artifacts.length>100000)fail();
 const runes=input.runes.map(r=>({rune_id:id(r.id),slot_no:num(r.slot,6),set_id:num(r.set,100),class:num(r.stars,6)+(r.ancient?10:0),upgrade_curr:num(r.level,15),occupied_id:num(r.owner||0,Number.MAX_SAFE_INTEGER),pri_eff:effect(r.main),prefix_eff:effect(r.innate||[]),sec_eff:(r.subs||[]).map(effect)}));
 const artifacts=input.artifacts.map(a=>({rid:id(a.id),occupied_id:num(a.owner||0,Number.MAX_SAFE_INTEGER),type:num(a.type||0),attribute:num(a.element||0,5),unit_style:num(a.style||0),level:num(a.level||0,15),pri_eff:effect(a.main),artifact_substats:(a.subs||[]).map(s=>({type:s.key||s.id,value:num(s.value)}))}));
 const rById=new Map(runes.map(r=>[r.rune_id,r])),aById=new Map(artifacts.map(a=>[a.rid,a]));
 const unit_list=input.units.map(u=>{const base=Object.fromEntries(STATS.map(k=>[k,num(u.base?.[k])]));const runeIds=(u.runeIds||[]).map(id),artifactIds=(u.artifactIds||[]).map(id);if(runeIds.some(i=>!rById.has(i))||artifactIds.some(i=>!aById.has(i))||runeIds.length>6||artifactIds.length>2)fail();return {unit_id:id(u.id),unit_master_id:id(u.master),unit_level:num(u.level||40,40),class:num(u.stars||6,6),skills:(u.skillLevels||[]).map(s=>({slot:num(s.slot,8),level:num(s.level,50)})),attribute:num(u.element,5),con:base.hp/15,atk:base.atk,def:base.def,spd:base.spd,critical_rate:base.cr,critical_damage:base.cd,resist:base.res,accuracy:base.acc,runes:runeIds.map(i=>rById.get(i)),artifacts:artifactIds.map(i=>aById.get(i))};});
 const result=normalizeAccount({wizard_info:{wizard_id:String(input.id).slice(0,100),wizard_name:String(input.name||'Minha conta').slice(0,100)},guild:{guild_info:{name:String(input.guild||'').slice(0,100)}},unit_list,runes,artifacts,rune_lock_list:input.runes.filter(r=>r.locked).map(r=>r.id)});
 if(result.units.length!==input.units.length||result.runes.length!==input.runes.length||result.artifacts.length!==input.artifacts.length)fail();
 const known=new Set(result.units.map(u=>u.id));
 result.accountPresets=(input.accountPresets||[]).map(p=>({id:String(p.id).slice(0,200),name:String(p.name||'Deck').slice(0,100),gameMode:['siege','arena','cairos','rta'].includes(p.gameMode)?p.gameMode:null,dungeon:['gb12','db12','nb12','gbah','dbah','nbah','sf10','pc10'].includes(p.dungeon)?p.dungeon:null,unitIds:(p.unitIds||[]).slice(0,5).map(i=>known.has(i)?i:null),missingIds:(p.missingIds||[]).map(id)}));
 result.siege=(input.siege||[]).map(s=>({name:String(s.name||'Defesa').slice(0,100),unitIds:(s.unitIds||[]).map(id).filter(i=>known.has(i))}));
 result.crafts=normalizeCrafts((input.crafts||[]).map(c=>({craft_item_id:c.id,craft_type:c.ancient?(c.kind==='gem'?5:6):(c.kind==='gem'?1:2),craft_type_id:c.set*10000+c.stat*100+c.grade,quantity:c.quantity})));
 const assignments=input.equipmentPools?.rta?.assignments||{};result.equipmentPools=equipmentPools({world_arena_rune_equip_list:Object.entries(assignments).map(([unit_id,rune_id_list])=>({unit_id,rune_id_list}))},result.units,result.runes);
 if(input.towers)result.towers=cleanTowers(input.towers);
 return result;
}
