import {normalizeAccount} from './data.js';
import {accountSnapshot} from './account-snapshot.js';
const n=value=>{if(!['number','string'].includes(typeof value)||!Number.isFinite(Number(value))||Number(value)<0)throw new Error('Dados de inventário inválidos para o backup.');return Number(value);};
const effect=e=>(e||[]).map(n);
const rune=r=>({rune_id:n(r.id),slot_no:n(r.slot),set_id:n(r.set),class:n(r.stars)+(r.ancient?10:0),upgrade_curr:n(r.level),pri_eff:effect(r.main),prefix_eff:effect(r.innate),sec_eff:(r.subs||[]).map(effect)});
// Allocate only whitelisted primitives. Raw SWEX/social trees are never traversed or sent.
export function cleanAccountPayload(account){
 const byId=new Map(account.runes.map(r=>[r.id,r])),equipped=new Set();
 const unit_list=account.units.map(u=>({unit_id:n(u.id),unit_master_id:n(u.master),unit_level:n(u.level),class:n(u.stars),attribute:n(u.element),con:n(u.base.hp)/15,atk:n(u.base.atk),def:n(u.base.def),spd:n(u.base.spd),critical_rate:n(u.base.cr),critical_damage:n(u.base.cd),resist:n(u.base.res),accuracy:n(u.base.acc),runes:u.runeIds.flatMap(id=>{const r=byId.get(id);if(!r)return [];equipped.add(id);return [rune(r)];})}));
 const payload={unit_list,runes:account.runes.filter(r=>!equipped.has(r.id)).map(rune),deck_list:[],defense_deck_list:[],world_arena_deck_list:[]};
 for(const p of account.accountPresets||[]){const d={deck_id:String(p.id),deck_name:String(p.name||'Deck'),game_mode:p.gameMode===null?null:String(p.gameMode),mode:p.mode==='attack'?'attack':'defense',leader_index:n(p.leaderIndex||0),unit_id_list:p.unitIds.map(id=>n(id||0)),...(p.dungeon?{dungeon_name:String(p.dungeon)}:{}),...(p.raidPartyId?{raid_party_id:String(p.raidPartyId),raid_team_index:n(p.raidTeamIndex||0)}:{})};payload[p.gameMode==='rta'?'world_arena_deck_list':['siege','arena'].includes(p.gameMode)?'defense_deck_list':'deck_list'].push(d);}
 return payload;
}
export function restoreAccountPayload(payload,userId,metadata={}){
 if(!payload?.unit_list)return accountSnapshot(payload); // Legacy normalized backups remain readable.
 const a=normalizeAccount(payload);a.id=String(metadata.id||`cloud-${userId}`).slice(0,100);a.name=String(metadata.name||'Conta sincronizada').slice(0,100);return a;
}
