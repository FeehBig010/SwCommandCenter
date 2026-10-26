import {cleanCloudPayload} from '../core/hub.js';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function assertUuid(id){if(!UUID.test(id||''))throw new Error('Identificador de nuvem inválido.');return id;}
const fields='id,owner_id,guild_id,kind,visibility,is_leadership,name,payload,created_at,updated_at,moderation_status';
function check(response){if(response.error)throw new Error('Operação não autorizada ou indisponível. Confira sua conexão e permissões.');return response.data;}
export async function listMemberships(client){return check(await client.from('guild_members').select('guild_id,role,guilds(id,name)'));}
export async function listCloudTeams(client,userId,guildId){
 assertUuid(userId);if(guildId)assertUuid(guildId);
 const filter=guildId?`owner_id.eq.${userId},and(visibility.eq.guild,guild_id.eq.${guildId})`:`owner_id.eq.${userId}`;
 const rows=check(await client.from('guild_teams').select(fields).or(filter).order('updated_at',{ascending:false}).limit(500));
 const clean=rows.flatMap(row=>{try{return [{...row,payload:cleanCloudPayload(row.kind,row.payload)}];}catch{return [];}});
 // Upgrade gracefully while a deployment's database migration is still pending.
 const metadata=await client.from('guild_teams').select('id,votes,target_defense').in('id',clean.length?clean.map(r=>r.id):[userId]);
 let ballots={data:[],error:null};if(!metadata.error&&clean.length)ballots=await client.from('guild_team_votes').select('team_id,vote').eq('user_id',userId).in('team_id',clean.map(r=>r.id));
 const ready=!metadata.error&&!ballots.error;
 const enriched=clean.map(row=>({...row,...(Array.isArray(metadata.data)?metadata.data.find(m=>m.id===row.id):{}),votes:(Array.isArray(metadata.data)?metadata.data.find(m=>m.id===row.id)?.votes:null)||{upvotes:0,downvotes:0},my_vote:Array.isArray(ballots.data)?ballots.data.find(v=>v.team_id===row.id)?.vote||null:null,attackFeaturesReady:ready}));
 enriched.attackFeaturesReady=ready;return enriched;
}
export async function saveCloudTeam(client,userId,input,previous=null){
 assertUuid(userId);if(input.guild_id)assertUuid(input.guild_id);
 const payload=cleanCloudPayload(input.kind,input.payload),name=String(input.name||'Composição').trim();
 if(!name||name.length>100)throw new Error('Nome inválido.');
 const target=Object.hasOwn(input,'target_defense')?{target_defense:cleanTargetDefense(input.target_defense)}:{};
 const value={...target,owner_id:userId,guild_id:input.guild_id||null,kind:input.kind,visibility:input.visibility==='guild'?'guild':'private',is_leadership:input.is_leadership===true,name,payload};
 if(value.visibility==='guild'&&!value.guild_id)throw new Error('Escolha uma guilda antes de compartilhar.');
 if(previous){assertUuid(previous.id);const response=await client.from('guild_teams').update(value).eq('id',previous.id).eq('owner_id',userId).eq('updated_at',previous.updated_at).select(fields).maybeSingle();const row=check(response);if(!row)throw new Error('A composição mudou em outro dispositivo. Atualize a biblioteca antes de salvar.');return row;}
 return check(await client.from('guild_teams').insert(value).select(fields).single());
}
export async function deleteCloudTeam(client,userId,row){assertUuid(userId);assertUuid(row.id);const rows=check(await client.from('guild_teams').delete().eq('id',row.id).eq('owner_id',userId).eq('updated_at',row.updated_at).select('id'));if(!rows.length)throw new Error('A composição mudou. Atualize a biblioteca e tente novamente.');}

export function cleanTargetDefense(value){if(typeof value!=='string'||value.length>1000)throw new Error('Use até 1.000 caracteres em Defesa Alvo.');return value.trim();}
export async function voteGuildAttack(client,row,value){assertUuid(row.id);if(value!==null&&![1,-1].includes(value))throw new Error('Voto inválido.');return check(await client.rpc('set_guild_team_vote',{target:row.id,value}));}
export async function updateGuildAttackTarget(client,userId,row,target){assertUuid(userId);assertUuid(row.id);if(row.owner_id!==userId)throw new Error('Somente o autor pode editar Defesa Alvo.');const result=check(await client.from('guild_teams').update({target_defense:cleanTargetDefense(target)}).eq('id',row.id).eq('owner_id',userId).eq('updated_at',row.updated_at).select(fields+',votes,target_defense').maybeSingle());if(!result)throw new Error('A composição mudou. Atualize antes de salvar Defesa Alvo.');return result;}
