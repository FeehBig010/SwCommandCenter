import test from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';
const users=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
test('attack votes use authenticated membership, one vote per user and author-only target editing in PostgreSQL',async()=>{
 const db=new PGlite();async function as(user,sql,args=[]){await db.exec('begin;set local role authenticated;');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);const result=await db.query(sql,args);await db.exec('commit');return result.rows;}catch(error){await db.exec('rollback');throw error;}}
 try{
 await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;");for(const id of users)await db.query('insert into auth.users(id) values($1)',[id]);
 for(const name of ['202610220001_guild_cloud.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 const guild=(await as(users[0],"select public.create_guild('Guilda') id"))[0].id,invite=(await as(users[0],'select public.create_guild_invite($1) code',[guild]))[0].code;await as(users[1],'select public.join_guild($1)',[invite]);
 for(const name of ['202610220002_siege_counters.sql','202610220003_admin_rbac.sql','202610230001_guild_attack_votes.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 const payload={version:1,team:{mode:'attack'}},row=(await as(users[0],"insert into public.guild_teams(owner_id,guild_id,kind,visibility,name,payload,target_defense) values($1,$2,'plan','guild','Ataque',$3,'Molly / Vritra / Solveig') returning *",[users[0],guild,JSON.stringify(payload)]))[0];
 assert.deepEqual(row.votes,{upvotes:0,downvotes:0});assert.equal((await as(users[1],'select target_defense from public.guild_teams where id=$1',[row.id]))[0].target_defense,'Molly / Vritra / Solveig');
 assert.equal((await as(users[1],"update public.guild_teams set target_defense='Hijack' where id=$1 returning id",[row.id])).length,0);
 assert.equal((await as(users[0],"update public.guild_teams set target_defense='Nova defesa' where id=$1 returning target_defense",[row.id]))[0].target_defense,'Nova defesa');
 const vote=async(user,value)=>(await as(user,'select public.set_guild_team_vote($1,$2::smallint) result',[row.id,value]))[0].result;
 assert.deepEqual((await vote(users[1],1)).votes,{upvotes:1,downvotes:0});assert.deepEqual((await vote(users[1],1)).votes,{upvotes:1,downvotes:0});assert.deepEqual((await vote(users[1],-1)).votes,{upvotes:0,downvotes:1});assert.deepEqual((await vote(users[0],1)).votes,{upvotes:1,downvotes:1});assert.deepEqual((await vote(users[1],null)).votes,{upvotes:1,downvotes:0});
 await assert.rejects(vote(users[2],1),/access denied/);await assert.rejects(vote(users[1],2),/Invalid vote/);
 await assert.rejects(as(users[0],"update public.guild_teams set votes='{\"upvotes\":999,\"downvotes\":0}' where id=$1",[row.id]),/permission denied/);
 await assert.rejects(as(users[0],"insert into public.guild_teams(owner_id,kind,name,payload,votes) values($1,'plan','Fake',$2,'{\"upvotes\":999}')",[users[0],JSON.stringify(payload)]),/permission denied/);
 await assert.rejects(as(users[1],'insert into public.guild_team_votes(team_id,user_id,vote) values($1,$2,1)',[row.id,users[0]]),/permission denied/);
 const privateRow=(await as(users[0],"insert into public.guild_teams(owner_id,kind,name,payload) values($1,'plan','Privado',$2) returning id",[users[0],JSON.stringify(payload)]))[0];await assert.rejects(as(users[1],'select public.set_guild_team_vote($1,1::smallint)',[privateRow.id]),/access denied/);
 assert.equal((await as(users[1],'select * from public.guild_team_votes')).length,0);assert.equal((await as(users[0],'select * from public.guild_team_votes')).length,1);
 await db.exec('begin;set local role anon;');try{await assert.rejects(db.query('select public.set_guild_team_vote($1,1::smallint)',[row.id]),/permission denied/);}finally{await db.exec('rollback');}
 await vote(users[1],-1);await db.query('delete from auth.users where id=$1',[users[1]]);assert.deepEqual((await as(users[0],'select votes from public.guild_teams where id=$1',[row.id]))[0].votes,{upvotes:1,downvotes:0});
 }finally{await db.close();}
});
