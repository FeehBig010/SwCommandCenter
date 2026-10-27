import test from 'node:test';import assert from 'node:assert/strict';import{readFile,readdir}from'node:fs/promises';import{PGlite}from'@electric-sql/pglite';
import {normalizeDefense,intelligenceCounter,offenseFromIds} from '../src/core/guild-intelligence.js';
const ids=Array.from({length:6},(_,i)=>`11111111-1111-4111-8111-${String(i+1).padStart(12,'0')}`),trio=[18913,13413,19614];
test('Guild Intelligence production migration: real persistence, member registration without battles, author edits, idempotency, statistics and cross-guild isolation',async()=>{
 const db=new PGlite();async function as(user,sql,args=[]){await db.exec('begin;set local role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);const {rows}=await db.query(sql,args);await db.exec('commit');return rows;}catch(e){await db.exec('rollback');throw e;}}
 const rpc=async(user,name,args,casts)=>(await as(user,`select public.${name}(${casts.map((c,i)=>`$${i+1}::${c}`).join(',')}) value`,args))[0].value;
 try{
 await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;");
 for(const name of(await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort())await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 for(const [i,id]of ids.entries())await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,`gi${i}@example.test`,JSON.stringify({full_name:`Jogador ${i}`})]);
 await db.query("update public.profiles set role='guild_leader' where id=any($1::uuid[])",[[ids[0],ids[3]]]);
 const guildA=await rpc(ids[0],'create_guild',['Guilda A'],['text']),guildB=await rpc(ids[3],'create_guild',['Guilda B'],['text']);
 for(const id of [ids[1],ids[2]])await db.query('insert into public.guild_members(guild_id,user_id) values($1,$2)',[guildA,id]);await db.query('insert into public.guild_members(guild_id,user_id) values($1,$2)',[guildB,ids[4]]);
 await db.query("update public.profiles set role='super_admin' where id=$1",[ids[5]]);
 const defense=normalizeDefense({monster_ids:trio,tier:'G2'}),saveDefs=(user,guild,entries)=>rpc(user,'gi_save_defenses',[guild,JSON.stringify(entries)],['uuid','jsonb']);
 await assert.rejects(saveDefs(ids[1],guildA,[defense]),/liderança/);
 const batch=await saveDefs(ids[0],guildA,[defense]);assert.equal(batch.inserted,1);const defenseId=batch.ids[0];const catalog=await rpc(ids[1],'gi_catalog',[guildA],['uuid']);assert.equal(catalog.total,1);assert.equal(catalog.rows[0].counter_count,0);assert.equal(catalog.rows[0].popularity,null);assert.equal((await saveDefs(ids[0],guildA,[{...defense,monster_ids:[trio[0],trio[2],trio[1]]}])).existing,1);
 const otherLeader=await saveDefs(ids[0],guildA,[{...defense,leader_index:1}]);assert.equal(otherLeader.inserted,1);
 await rpc(ids[0],'gi_save_defenses',[guildA,JSON.stringify([{...defense,category:5,tier:'G3'}]),defenseId],['uuid','jsonb','uuid']);const editedDefense=(await rpc(ids[1],'gi_catalog',[guildA],['uuid'])).rows.find(d=>d.id===defenseId);assert.equal(editedDefense.category,5);assert.equal(editedDefense.tier,'G3');assert.deepEqual(editedDefense.monster_ids,trio);
 const before=(await as(ids[0],'select count(*) n from public.siege_defense_catalog'))[0].n;
 await assert.rejects(saveDefs(ids[0],guildA,[{...defense,monster_ids:[13413,13911,19614]},{...defense,monster_ids:[99999,13413,19614]}]),/IDs desconhecidos/);assert.equal((await as(ids[0],'select count(*) n from public.siege_defense_catalog'))[0].n,before);
 await assert.rejects(saveDefs(ids[0],guildA,[{...defense,source_kind:'authorized_import',authorization:null}]),/autorização/);
 await assert.rejects(saveDefs(ids[0],guildA,[{...defense,source_kind:'authorized_import',authorization:'Permissão',popularity:{}}]),/check constraint/);
 const document=intelligenceCounter(defense,offenseFromIds(trio),'Sem precisar batalhar');
 const saveCounter=(user,req=crypto.randomUUID(),doc=document,previous=null)=>rpc(user,'gi_save_counter',[guildA,defenseId,JSON.stringify(doc),req,null,null,previous?.id||null,previous?.updated_at||null],['uuid','uuid','jsonb','uuid','text','text','uuid','timestamptz']);
 const request=crypto.randomUUID(),counter=await saveCounter(ids[1],request);assert.equal(await saveCounter(ids[1],request),counter);const counter2=await saveCounter(ids[2]);assert.notEqual(counter,counter2);
 await assert.rejects(saveCounter(ids[1]),/já cadastrou/);
 let counters=await rpc(ids[2],'gi_counters',[guildA,defenseId],['uuid','uuid']);assert.equal(counters.total,2);const mine=counters.rows.find(r=>r.id===counter);assert.equal(mine.total,0);assert.equal(mine.win_rate,null);assert.equal(mine.author_label,'Jogador 1');assert.equal(mine.payload.outcome,'unrecorded');assert.equal(JSON.stringify(counters).includes('gi1@example'),false);
 await assert.rejects(saveCounter(ids[2],crypto.randomUUID(),{...document,notes:'Invadido'},mine),/Sem permissão/);
 await saveCounter(ids[1],crypto.randomUUID(),{...document,notes:'Estratégia revisada'},mine);
 await assert.rejects(saveCounter(ids[1],crypto.randomUUID(),document,mine),/counter mudou/);
 await assert.rejects(saveCounter(ids[1],crypto.randomUUID(),{...document,unit_list:[{secret:1}]}),/inválida/);
 await assert.rejects(saveCounter(ids[1],crypto.randomUUID(),{...document,outcome:'win'}),/registre combates/);
 await assert.rejects(saveCounter(ids[1],crypto.randomUUID(),{...document,notes:{invalid:1}}),/rótulos inválidos/);
 for(const stranger of [ids[3],ids[4],ids[5]]){await assert.rejects(rpc(stranger,'gi_counters',[guildA,defenseId],['uuid','uuid']),/restrito/);assert.equal((await as(stranger,'select * from public.siege_defense_catalog where guild_id=$1',[guildA])).length,0);}
 await assert.rejects(rpc(ids[4],'gi_save_counter',[guildB,defenseId,JSON.stringify(document),crypto.randomUUID()],['uuid','uuid','jsonb','uuid']),/não encontrada/);
 await assert.rejects(as(ids[1],'select * from public.gi_visible_counters($1)',[guildB]),/permission denied/);
 const now=new Date().toISOString(),battleReq=crypto.randomUUID();
 const battle=(user,result='win',req=crypto.randomUUID(),counterId=counter)=>rpc(user,'gi_save_battle',[guildA,counterId,result,now,'Teste autorrelatado',req],['uuid','uuid','text','timestamptz','text','uuid']);
 const battleId=await battle(ids[2],'win',battleReq);assert.equal(await battle(ids[2],'win',battleReq),battleId);await battle(ids[1],'loss');await battle(ids[1],'win');await battle(ids[1],'win');await battle(ids[2],'loss');
 counters=await rpc(ids[1],'gi_counters',[guildA,defenseId],['uuid','uuid']);const tested=counters.rows.find(r=>r.id===counter);assert.equal(tested.total,5);assert.equal(tested.wins,3);assert.equal(tested.losses,2);assert.equal(tested.win_rate,60);
 const overview=await rpc(ids[1],'gi_overview',[guildA],['uuid']);assert.equal(overview.counter_count,2);assert.equal(overview.covered_count,1);assert.equal(overview.uncovered_count,1);assert.equal(overview.battles,5);assert.equal(overview.win_rate,60);
 assert.equal((await as(ids[4],'select * from public.guild_counter_battles')).length,0);const hist=await rpc(ids[1],'gi_battles',[guildA,counter],['uuid','uuid']);assert.equal(hist.total,5);assert.ok(hist.rows.every(r=>!('email'in r)));const own=hist.rows.find(r=>r.user_id===ids[2]&&r.outcome==='win');
 await assert.rejects(rpc(ids[1],'gi_save_battle',[guildA,counter,'loss',now,'',crypto.randomUUID(),own.id,own.updated_at],['uuid','uuid','text','timestamptz','text','uuid','uuid','timestamptz']),/Somente o autor/);
 await rpc(ids[2],'gi_save_battle',[guildA,counter,'loss',now,'Correção',crypto.randomUUID(),own.id,own.updated_at],['uuid','uuid','text','timestamptz','text','uuid','uuid','timestamptz']);
 assert.equal((await rpc(ids[1],'gi_counters',[guildA,defenseId],['uuid','uuid'])).rows.find(r=>r.id===counter).win_rate,40);
 await assert.rejects(saveCounter(ids[1],crypto.randomUUID(),intelligenceCounter(defense,offenseFromIds([13413,13911,19614])),tested),/composição possui combates/);
 await assert.rejects(rpc(ids[4],'gi_save_battle',[guildB,counter,'win',now,'',crypto.randomUUID()],['uuid','uuid','text','timestamptz','text','uuid']),/indisponível/);
 await assert.rejects(as(ids[1],"insert into public.guild_counter_battles(guild_id,counter_id,user_id,outcome,fought_at,request_id) values($1,$2,$3,'win',now(),$4)",[guildA,counter,ids[2],crypto.randomUUID()]),/permission denied/);
 await assert.rejects(rpc(ids[1],'gi_remove_defense',[guildA,defenseId],['uuid','uuid']),/liderança/);
 await assert.rejects(rpc(ids[0],'gi_remove_defense',[guildA,defenseId],['uuid','uuid']),/possui counters/);
 await assert.rejects(rpc(ids[1],'gi_remove_battle',[guildA,own.id,own.updated_at],['uuid','uuid','timestamptz']),/Sem permissão/);
 const updatedHist=await rpc(ids[2],'gi_battles',[guildA,counter],['uuid','uuid']),updatedOwn=updatedHist.rows.find(r=>r.id===own.id);await rpc(ids[2],'gi_remove_battle',[guildA,own.id,updatedOwn.updated_at],['uuid','uuid','timestamptz']);assert.equal((await rpc(ids[1],'gi_overview',[guildA],['uuid'])).battles,4);
 const moderatorView=await rpc(ids[0],'gi_battles',[guildA,counter],['uuid','uuid']);const moderated=moderatorView.rows[0];await rpc(ids[0],'gi_remove_battle',[guildA,moderated.id,moderated.updated_at],['uuid','uuid','timestamptz']);assert.equal((await rpc(ids[1],'gi_overview',[guildA],['uuid'])).battles,3);
 const last=(await rpc(ids[1],'gi_counters',[guildA,defenseId],['uuid','uuid'])).rows.find(r=>r.id===counter);await rpc(ids[1],'gi_remove_counter',[guildA,counter,last.updated_at],['uuid','uuid','timestamptz']);assert.equal((await rpc(ids[2],'gi_overview',[guildA],['uuid'])).battles,0);
 await rpc(ids[0],'gi_remove_defense',[guildA,otherLeader.ids[0]],['uuid','uuid']);assert.equal((await rpc(ids[1],'gi_catalog',[guildA],['uuid'])).total,1);
 const legacyDefense=normalizeDefense({monster_ids:[13413,13911,19614]}),legacy={...intelligenceCounter(legacyDefense,offenseFromIds(trio)),outcome:'win'};
 const legacyId=(await as(ids[0],"insert into public.guild_teams(owner_id,guild_id,kind,visibility,name,payload) values($1,$2,'counter','guild','Legado',$3) returning id",[ids[0],guildA,JSON.stringify(legacy)]))[0].id;
 const pending=(await as(ids[0],'select updated_at from public.guild_teams where id=$1',[legacyId]))[0];await rpc(ids[0],'admin_moderate_counter',[legacyId,'approve',pending.updated_at],['uuid','text','timestamptz']);
 const legacyCatalog=await rpc(ids[2],'gi_catalog',[guildA],['uuid']);const legacyRow=legacyCatalog.rows.find(d=>d.source_name==='Acervo existente da guilda');assert.ok(legacyRow);const legacyCounters=await rpc(ids[2],'gi_counters',[guildA,legacyRow.id],['uuid','uuid']);assert.equal(legacyCounters.rows[0].legacy,true);assert.equal(legacyCounters.rows[0].total,0);assert.equal(legacyCounters.rows[0].win_rate,null);
 await db.exec('begin;set local role anon');try{await assert.rejects(db.query('select public.gi_catalog($1)',[guildA]),/permission denied/);}finally{await db.exec('rollback');}
 }finally{await db.close();}
});
