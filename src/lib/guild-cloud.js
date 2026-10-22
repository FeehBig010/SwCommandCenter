import {cleanCloudPayload} from '../core/hub.js';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function assertUuid(id){if(!UUID.test(id||''))throw new Error('Identificador de nuvem inválido.');return id;}
const fields='id,owner_id,guild_id,kind,visibility,is_leadership,name,payload,created_at,updated_at';
function check(response){if(response.error)throw new Error(response.error.message||'Não foi possível sincronizar.');return response.data;}
export async function listMemberships(client){return check(await client.from('guild_members').select('guild_id,role,guilds(id,name)'));}
export async function listCloudTeams(client,userId,guildId){
 assertUuid(userId);if(guildId)assertUuid(guildId);
 const filter=guildId?`owner_id.eq.${userId},and(visibility.eq.guild,guild_id.eq.${guildId})`:`owner_id.eq.${userId}`;
 const rows=check(await client.from('guild_teams').select(fields).or(filter).order('updated_at',{ascending:false}).limit(500));
 return rows.flatMap(row=>{try{return [{...row,payload:cleanCloudPayload(row.kind,row.payload)}];}catch{return [];}});
}
export async function saveCloudTeam(client,userId,input,previous=null){
 assertUuid(userId);if(input.guild_id)assertUuid(input.guild_id);
 const payload=cleanCloudPayload(input.kind,input.payload),name=String(input.name||'Composição').trim();
 if(!name||name.length>100)throw new Error('Nome inválido.');
 const value={owner_id:userId,guild_id:input.guild_id||null,kind:input.kind,visibility:input.visibility==='guild'?'guild':'private',is_leadership:input.is_leadership===true,name,payload};
 if(value.visibility==='guild'&&!value.guild_id)throw new Error('Escolha uma guilda antes de compartilhar.');
 if(previous){assertUuid(previous.id);const response=await client.from('guild_teams').update(value).eq('id',previous.id).eq('owner_id',userId).eq('updated_at',previous.updated_at).select(fields).maybeSingle();const row=check(response);if(!row)throw new Error('A composição mudou em outro dispositivo. Atualize a biblioteca antes de salvar.');return row;}
 return check(await client.from('guild_teams').insert(value).select(fields).single());
}
export async function deleteCloudTeam(client,userId,row){assertUuid(userId);assertUuid(row.id);const rows=check(await client.from('guild_teams').delete().eq('id',row.id).eq('owner_id',userId).eq('updated_at',row.updated_at).select('id'));if(!rows.length)throw new Error('A composição mudou. Atualize a biblioteca e tente novamente.');}
