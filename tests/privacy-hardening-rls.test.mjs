import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {portableTeam,cleanCloudPayload} from '../src/core/hub.js';
import {makeTeam,blankConfig} from '../src/core/data.js';
const ids=Array.from({length:4},(_,i)=>`11111111-1111-4111-8111-${String(i+1).padStart(12,'0')}`);
const compact={unit_list:[],runes:[],deck_list:[],defense_deck_list:[],world_arena_deck_list:[]};
test('production migrations isolate private stores across members, leaders and admins and restrict guild writes',async t=>{
 const db=new PGlite();
 async function as(user,sql,args=[]){await db.exec('begin;set local role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);const result=await db.query(sql,args);await db.exec('commit');return result.rows;}catch(error){await db.exec('rollback');throw error;}}
 try{
  await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;");
  const files=(await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort();
  for(const file of files.filter(f=>f<'202610260002_private_data_hardening.sql'))await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
  for(const [i,id]of ids.entries())await db.query('insert into auth.users(id,email) values($1,$2)',[id,`test${i}@example.com`]);
  await db.query("update public.profiles set role='super_admin' where id=$1",[ids[0]]);await db.query("update public.profiles set role='guild_leader' where id=$1",[ids[1]]);
  const guild=(await as(ids[1],"select public.create_guild('Destino') id"))[0].id;await db.query("insert into public.guild_members(guild_id,user_id) values($1,$2)",[guild,ids[2]]);
  // Legacy poison is inserted before the new CHECK to prove read policies
  // hide it and the SECURITY DEFINER favorite RPC cannot copy it around RLS.
  const team=portableTeam({...makeTeam('siege'),configs:[1,2,3].map(n=>({...blankConfig(),masterId:18913,label:`Monstro ${n}`}))});
  const safe={version:1,team},counter=cleanCloudPayload('counter',{version:1,offense:team,enemyDefense:team.configs.map(c=>({masterId:c.masterId,label:c.label})),name:'Counter'});
  const legacy=(await db.query("insert into public.guild_teams(owner_id,guild_id,kind,visibility,name,payload,moderation_status) values($1,$2,'counter','guild','Legacy',$3,'approved') returning id",[ids[1],guild,{...counter,unit_list:[{unit_id:12345}]}])).rows[0].id;
  await db.exec(await readFile(new URL('../supabase/migrations/202610260002_private_data_hardening.sql',import.meta.url),'utf8'));
  for(const file of files.filter(f=>f>'202610260002_private_data_hardening.sql'))await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
  for(const table of ['user_inventory','swex_data','account_snapshots'])await t.test(`${table}: all application roles are denied another owner's SELECT/INSERT/UPDATE/DELETE`,async()=>{
   await as(ids[2],`insert into public.${table}(user_id,payload) values($1,$2)`,[ids[2],compact]);
   for(const user of [ids[0],ids[1],ids[3]]){
    assert.deepEqual(await as(user,`select * from public.${table}`),[]);
    assert.deepEqual(await as(user,`update public.${table} set payload=$1 returning user_id`,[compact]),[]);
    assert.deepEqual(await as(user,`delete from public.${table} returning user_id`),[]);
    await assert.rejects(as(user,`insert into public.${table}(user_id,payload) values($1,$2)`,[ids[2],compact]),/row-level security/);
   }
   await as(ids[2],`update public.${table} set payload=$1 where user_id=$2`,[compact,ids[2]]);
   assert.equal((await as(ids[2],`select * from public.${table}`)).length,1);
   await assert.rejects(as(ids[2],`update public.${table} set user_id=$1`,[ids[3]]),/row-level security/);
   assert.equal((await as(ids[2],`delete from public.${table} returning user_id`)).length,1);
  });
  const insert=(actor,visibility='guild',kind='template',payload=safe)=>as(actor,"insert into public.guild_teams(owner_id,guild_id,kind,visibility,name,payload) values($1,$2,$3,$4,'Modelo',$5) returning id",[actor,guild,kind,visibility,payload]);
  const shared=(await insert(ids[1]))[0].id,privateId=(await insert(ids[1],'private'))[0].id;
  await t.test('members read portable shared presets only; foreign guilds and private/poisoned rows stay hidden',async()=>{
   assert.deepEqual((await as(ids[2],'select id from public.guild_teams')).map(r=>r.id),[shared]);
   assert.deepEqual(await as(ids[3],'select id from public.guild_teams'),[]);
   assert.deepEqual(await as(ids[0],'select id from public.guild_teams where id=$1',[privateId]),[]);
   assert.equal((await as(ids[1],'select id from public.guild_teams where id=$1',[legacy])).length,1);
   await assert.rejects(as(ids[2],'select public.save_counter_favorite($1)',[legacy]),/denied|Access|Counter|not available/i);
  });
  await t.test('member direct writes fail; trusted leadership can write within scope',async()=>{
   for(const visibility of ['guild','private'])await assert.rejects(insert(ids[2],visibility),/row-level security/);
   assert.deepEqual(await as(ids[2],"update public.guild_teams set name='Hijacked' where id=$1 returning id",[shared]),[]);
   assert.deepEqual(await as(ids[2],'delete from public.guild_teams where id=$1 returning id',[shared]),[]);
   assert.equal((await as(ids[1],"update public.guild_teams set name='Updated' where id=$1 returning id",[shared])).length,1);
   assert.equal((await insert(ids[0])).length,1);
   await assert.rejects(as(ids[1],'update public.guild_teams set owner_id=$1 where id=$2',[ids[2],shared]),/proprietário/);
  });
  await t.test('leadership private drafts without a guild remain owner-only and can be published deliberately',async()=>{
   const id=(await as(ids[1],"insert into public.guild_teams(owner_id,kind,visibility,name,payload) values($1,'plan','private','Rascunho',$2) returning id",[ids[1],safe]))[0].id;
   assert.deepEqual(await as(ids[0],'delete from public.guild_teams where id=$1 returning id',[id]),[]);
   await as(ids[1],"update public.guild_teams set guild_id=$1,visibility='guild' where id=$2",[guild,id]);assert.equal((await as(ids[2],'select id from public.guild_teams where id=$1',[id])).length,1);
   await as(ids[1],"update public.guild_teams set guild_id=null,visibility='private' where id=$1",[id]);assert.deepEqual(await as(ids[2],'select id from public.guild_teams where id=$1',[id]),[]);
  });
  await t.test('REST payload injection cannot bypass portable sharing; profiles never expose another user or writable role',async()=>{
   for(const payload of [{version:1,team,unit_list:[{}]},{version:1,team:{...team,configs:team.configs.map(c=>({...c,unitId:123}))}},{version:1,team:{...team,configs:team.configs.map(c=>({...c,goals:{unit_list:[{}]}}))}}])await assert.rejects(insert(ids[1],'guild','template',payload),/check constraint/);
   for(const user of ids)assert.deepEqual((await as(user,'select id from public.profiles')).map(r=>r.id),[user]);
   await assert.rejects(as(ids[2],"update public.profiles set role='super_admin'"),/permission denied/);
   await as(ids[2],'select public.complete_my_onboarding()');assert.equal((await as(ids[2],'select has_completed_onboarding from public.profiles'))[0].has_completed_onboarding,true);
  });
  await t.test('anonymous access and role spoofing are denied',async()=>{
   for(const table of ['profiles','user_inventory','swex_data','account_snapshots','guild_teams']){await db.exec('begin;set local role anon');try{await assert.rejects(db.query(`select * from public.${table}`),/permission denied/);}finally{await db.exec('rollback');}}
   await db.query("update auth.users set raw_user_meta_data='{\"role\":\"super_admin\"}' where id=$1",[ids[2]]);await assert.rejects(insert(ids[2]),/row-level security/);
  });
 }finally{await db.close();}
});
