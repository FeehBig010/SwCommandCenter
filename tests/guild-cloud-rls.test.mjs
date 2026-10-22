import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const users=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
let db;
async function as(user,sql,params=[]){await db.exec('begin; set local role authenticated;');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);const result=await db.query(sql,params);await db.exec('commit');return result.rows;}catch(e){await db.exec('rollback');throw e;}}
test('Supabase migration enforces membership, ownership and leadership in real PostgreSQL RLS',async t=>{
 db=new PGlite();await db.exec("create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth to authenticated,anon;");
 for(const id of users)await db.query('insert into auth.users values ($1)',[id]);
 await db.exec(await readFile(new URL('../supabase/migrations/202610220001_guild_cloud.sql',import.meta.url),'utf8'));
 try{
  const guild=(await as(users[0],"select public.create_guild('Destino') as id"))[0].id;
  const other=(await as(users[2],"select public.create_guild('Outra guilda') as id"))[0].id;
  const invite=(await as(users[0],'select public.create_guild_invite($1) as code',[guild]))[0].code;
  await as(users[1],'select public.join_guild($1)',[invite]);
  const insert=(user,scope,lead=false,guildId=guild,kind='template')=>as(user,"insert into public.guild_teams(owner_id,guild_id,kind,visibility,is_leadership,name,payload) values($1,$2,$3,$4,$5,'Composição','{\"version\":1}') returning *",[user,guildId,kind,scope,lead]);
  const privateRow=(await insert(users[0],'private'))[0],shared=(await insert(users[0],'guild',true))[0];
  await t.test('members can see shared suggestions but cannot read another member’s private rows',async()=>{const rows=await as(users[1],'select id from public.guild_teams');assert.deepEqual(rows.map(r=>r.id),[shared.id]);assert.equal((await as(users[2],'select id from public.guild_teams')).length,0);});
  await t.test('member can publish their own counter but cannot impersonate a leader or another owner',async()=>{const row=(await insert(users[1],'guild',false,guild,'counter'))[0];assert.equal(row.kind,'counter');await assert.rejects(insert(users[1],'guild',true),/row-level security/);await assert.rejects(as(users[1],"insert into public.guild_teams(owner_id,guild_id,kind,visibility,name,payload) values($1,$2,'plan','private','Spoof','{\"version\":1}')",[users[0],guild]),/row-level security/);});
  await t.test('leader role in one guild never grants access to another guild',async()=>{await assert.rejects(insert(users[2],'guild',true,guild),/row-level security/);await assert.rejects(as(users[2],'select public.create_guild_invite($1)',[guild]),/Leader access/);assert.equal((await as(users[2],'select id from public.guilds'))[0].id,other);});
  await t.test('members cannot modify or delete leadership rows or mutate membership directly',async()=>{assert.equal((await as(users[1],"update public.guild_teams set name='Hijack' where id=$1 returning id",[shared.id])).length,0);assert.equal((await as(users[1],'delete from public.guild_teams where id=$1 returning id',[shared.id])).length,0);await assert.rejects(as(users[1],"update public.guild_members set role='leader' where user_id=$1",[users[1]]),/permission denied/);});
  await t.test('owner edits get server timestamps and ownership transfer is denied',async()=>{const edited=(await as(users[0],"update public.guild_teams set name='Atualizada' where id=$1 returning *",[privateRow.id]))[0];assert.ok(new Date(edited.updated_at)>=new Date(privateRow.updated_at));assert.equal(edited.created_at.getTime(),privateRow.created_at.getTime());await assert.rejects(as(users[0],'update public.guild_teams set owner_id=$1 where id=$2',[users[1],privateRow.id]),/row-level security/);});
  await t.test('private rows without a guild stay private and cannot become leadership suggestions',async()=>{const row=(await insert(users[1],'private',false,null,'plan'))[0];assert.equal((await as(users[0],'select id from public.guild_teams where id=$1',[row.id])).length,0);await assert.rejects(as(users[1],'update public.guild_teams set is_leadership=true where id=$1',[row.id]),/constraint|row-level security/);});
  await t.test('expired invites fail and an existing leader is never demoted by joining again',async()=>{await as(users[0],'select public.join_guild($1)',[invite]);assert.equal((await as(users[0],'select role from public.guild_members where guild_id=$1',[guild]))[0].role,'leader');await db.query("update public.guild_invites set expires_at=now()-interval '1 second' where code=$1",[invite]);await assert.rejects(as(users[2],'select public.join_guild($1)',[invite]),/Invalid or expired/);});
  await t.test('anonymous clients have no table or provisioning RPC access',async()=>{await db.exec('begin;set local role anon;');try{await assert.rejects(db.query('select * from public.guild_teams'),/permission denied/);}finally{await db.exec('rollback');}await db.exec('begin;set local role anon;');try{await assert.rejects(db.query("select public.create_guild('Public')"),/permission denied/);}finally{await db.exec('rollback');}});
  await t.test('invalid payload versions are rejected at the database boundary',async()=>{await assert.rejects(as(users[0],"insert into public.guild_teams(owner_id,kind,visibility,name,payload) values($1,'plan','private','Bad','{}')",[users[0]]),/check constraint/);});
 }finally{await db.close();}
});
