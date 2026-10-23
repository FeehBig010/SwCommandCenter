import {assertUuid} from './guild-cloud.js';
import {cleanMatchup} from '../core/hub.js';
export const ROLES={super_admin:'Super Admin',guild_leader:'Guild Leader',member:'Member'};
export const FIXED_BRAND=Object.freeze({name:'Clã D8stino - Euro',color:'#d4af37',logo:'/guild-crest.png'});
export const ENGINE_DEFAULTS=Object.freeze({default_speed_tick:7,max_teams:10,maintenance_mode:false});
export const canAdmin=profile=>!!profile?.id&&['super_admin','guild_leader'].includes(profile.role);
export const canManageSystem=profile=>!!profile?.id&&profile.role==='super_admin';
export function pageFromLocation({pathname='',hash=''}={}){const page=hash.replace(/^#\/?/,'').split(/[/?]/)[0];if(page)return page==='guild'?'siege':page;return /^\/admin(?:\/|$)/.test(pathname)?'admin':'optimizer';}
export function normalizeEngineSettings(input){
 const tick=Number(input?.default_speed_tick),max=Number(input?.max_teams);
 if(!Number.isFinite(tick)||tick<1||tick>100||!Number.isInteger(max)||max<1||max>10||typeof input?.maintenance_mode!=='boolean')throw new Error('Configurações do motor inválidas.');
 return {default_speed_tick:tick,max_teams:max,maintenance_mode:input.maintenance_mode};
}
const data=response=>{if(response.error)throw new Error('Operação não autorizada ou indisponível. Confira as permissões, a conexão e a migration de administração.');return response.data;};
export async function getMyProfile(client,userId){
 assertUuid(userId);const profile=data(await client.from('profiles').select('id,email,display_name,role,swex_updated_at,last_seen_at').eq('id',userId).maybeSingle());
 if(!profile||profile.id!==userId||!ROLES[profile.role])throw new Error('Não foi possível verificar seu cargo.');return profile;
}
export async function getEngineSettings(client){return normalizeEngineSettings(data(await client.rpc('get_engine_settings')));}
export async function getAdminOverview(client,guildId=null){
 if(guildId)assertUuid(guildId);const overview=data(await client.rpc('get_admin_overview',{target_guild:guildId}));
 if(!overview||!Array.isArray(overview.members)||!Array.isArray(overview.counters)||!Array.isArray(overview.guilds))throw new Error('Resposta administrativa inválida.');
 return {...overview,counters:overview.counters.flatMap(row=>{try{return [{...row,payload:cleanMatchup(row.payload)}];}catch{return [];}})};
}
export async function setMemberRole(client,userId,role,guildId=null){
 assertUuid(userId);if(!['member','guild_leader'].includes(role))throw new Error('Escolha Guild Leader ou Member.');if(guildId)assertUuid(guildId);
 data(await client.rpc('admin_set_member_role',{target:userId,new_role:role,target_guild:role==='guild_leader'?guildId:null}));
}
export async function moderateCounter(client,row,operation,edited){
 assertUuid(row.id);if(!['approve','edit','delete'].includes(operation))throw new Error('Ação inválida.');
 const payload=operation==='edit'?cleanMatchup(edited):null;
 data(await client.rpc('admin_moderate_counter',{target:row.id,operation,expected_updated:row.updated_at,edited_payload:payload,edited_name:payload?.name||null}));
}
export async function updateEngineSettings(client,input){const s=normalizeEngineSettings(input);data(await client.rpc('admin_update_settings',{tick:s.default_speed_tick,team_limit:s.max_teams,maintenance:s.maintenance_mode}));}
export async function recordEvent(client,code){if(!['optimizer_completed','optimizer_failed','swex_failed','swex_imported'].includes(code))throw new Error('Evento inválido.');data(await client.rpc('record_app_event',{code}));}
export function swexAge(timestamp,now=Date.now()){
 if(!timestamp||!Number.isFinite(Date.parse(timestamp)))return 'Pendente';const days=Math.max(0,Math.floor((now-Date.parse(timestamp))/86400000));return days===0?'Atualizado hoje':`Atualizado há ${days} dia${days===1?'':'s'}`;
}
