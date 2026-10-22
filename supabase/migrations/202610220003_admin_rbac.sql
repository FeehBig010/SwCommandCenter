begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text, display_name text not null default 'Membro',
 role text not null default 'member' check(role in ('super_admin','guild_leader','member')),
 created_at timestamptz not null default now(), swex_updated_at timestamptz, last_seen_at timestamptz
);
create index profiles_role_idx on public.profiles(role);
create function public.sync_auth_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,email,display_name) values(new.id,new.email,left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),nullif(new.raw_user_meta_data->>'preferred_username',''),'Membro'),80))
 on conflict(id) do update set email=excluded.email,display_name=excluded.display_name;
 return new;
end $$;
create trigger auth_profile_sync after insert or update of email,raw_user_meta_data on auth.users for each row execute function public.sync_auth_profile();
insert into public.profiles(id,email,display_name) select id,email,left(coalesce(nullif(raw_user_meta_data->>'full_name',''),nullif(raw_user_meta_data->>'preferred_username',''),'Membro'),80) from auth.users;
-- Preserve existing legitimate guild leadership, not metadata-supplied roles.
update public.profiles p set role='guild_leader' where exists(select 1 from public.guild_members m where m.user_id=p.id and m.role='leader');
create function public.current_app_role() returns text language sql stable security definer set search_path='' as $$
 select coalesce((select role from public.profiles where id=(select auth.uid())),'member');
$$;
create or replace function public.is_guild_leader(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.current_app_role()='super_admin' or (public.current_app_role()='guild_leader' and exists(select 1 from public.guild_members where guild_id=target and user_id=(select auth.uid()) and role='leader'));
$$;
create function public.can_manage_profile(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.current_app_role()='super_admin' or (public.current_app_role()='guild_leader' and exists(select 1 from public.guild_members member join public.guild_members leader on leader.guild_id=member.guild_id where member.user_id=target and leader.user_id=(select auth.uid()) and leader.role='leader'));
$$;
alter table public.profiles enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()) or public.can_manage_profile(id));
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;

-- Trusted database-owner bootstrap only: never callable from the browser, even with a forged email claim.
create function public.bootstrap_super_admin(owner_email text) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid; matches integer;
begin
 select count(*),(array_agg(id))[1] into matches,target from auth.users where lower(email)=lower(btrim(owner_email)) and email_confirmed_at is not null;
 if matches<>1 then raise exception 'Exactly one confirmed account with this email is required'; end if;
 if exists(select 1 from public.profiles where role='super_admin' and id<>target) then raise exception 'Super admin is already configured'; end if;
 update public.profiles set role='super_admin' where id=target;
 return target;
end $$;
revoke all on function public.bootstrap_super_admin(text) from public,anon,authenticated;

create table public.admin_audit (
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null,
 action text not null, target_id uuid, created_at timestamptz not null default now()
);
create index admin_audit_created_idx on public.admin_audit(created_at desc);
create table public.app_events (
 id bigint generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade,
 event_code text not null check(event_code in ('optimizer_completed','optimizer_failed','swex_failed','swex_imported')),
 created_at timestamptz not null default now()
);
create index app_events_user_time_idx on public.app_events(user_id,created_at desc);
create index app_events_time_idx on public.app_events(created_at desc);
create table public.system_settings (
 id boolean primary key default true check(id), default_speed_tick numeric not null default 7 check(default_speed_tick between 1 and 100),
 max_teams integer not null default 10 check(max_teams between 1 and 10), maintenance_mode boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into public.system_settings default values;
alter table public.admin_audit enable row level security;
alter table public.app_events enable row level security;
alter table public.system_settings enable row level security;
revoke all on public.admin_audit,public.app_events,public.system_settings from anon,authenticated;
revoke all on sequence public.admin_audit_id_seq,public.app_events_id_seq from anon,authenticated;

create function public.record_app_event(code text) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'Authentication required'; end if;
 if code is null or code not in ('optimizer_completed','optimizer_failed','swex_failed','swex_imported') then raise exception 'Invalid event'; end if;
 if (select count(*) from public.app_events where user_id=actor and created_at>now()-interval '1 minute')>=60 then raise exception 'Event rate limit'; end if;
 insert into public.app_events(user_id,event_code) values(actor,code);
 update public.profiles set last_seen_at=now(),swex_updated_at=case when code='swex_imported' then now() else swex_updated_at end where id=actor;
end $$;
create function public.touch_my_profile() returns void language plpgsql security definer set search_path='' as $$
begin update public.profiles set last_seen_at=now() where id=(select auth.uid()); end $$;
create function public.get_engine_settings() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('default_speed_tick',default_speed_tick,'max_teams',max_teams,'maintenance_mode',maintenance_mode) from public.system_settings where id;
$$;
create function public.admin_update_settings(tick numeric,team_limit integer,maintenance boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if public.current_app_role()<>'super_admin' then raise exception 'Super admin required'; end if;
 if tick is null or team_limit is null or maintenance is null then raise exception 'Invalid settings'; end if;
 update public.system_settings set default_speed_tick=tick,max_teams=team_limit,maintenance_mode=maintenance,updated_at=clock_timestamp() where id;
 insert into public.admin_audit(actor_id,action) values(auth.uid(),'settings_updated');
end $$;
create function public.admin_set_member_role(target uuid,new_role text,target_guild uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if public.current_app_role()<>'super_admin' then raise exception 'Super admin required'; end if;
 if new_role is null or new_role not in ('guild_leader','member') then raise exception 'Only leader/member changes are allowed'; end if;
 select role into previous from public.profiles where id=target for update;
 if previous is null or previous='super_admin' then raise exception 'Cannot change this account'; end if;
 if new_role='guild_leader' and target_guild is not null then
  if not exists(select 1 from public.guilds where id=target_guild) then raise exception 'Unknown guild'; end if;
  insert into public.guild_members(guild_id,user_id,role) values(target_guild,target,'leader') on conflict(guild_id,user_id) do update set role='leader';
 elsif new_role='member' then update public.guild_members set role='member' where user_id=target and role='leader';
 end if;
 update public.profiles set role=new_role where id=target;
 insert into public.admin_audit(actor_id,action,target_id) values(auth.uid(),'role_'||new_role,target);
end $$;
create or replace function public.create_guild(guild_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; actor uuid:=auth.uid();
begin
 if actor is null or public.current_app_role() not in ('super_admin','guild_leader') then raise exception 'Leadership role required'; end if;
 if guild_name is null or length(btrim(guild_name)) not between 1 and 100 then raise exception 'Invalid guild name'; end if;
 insert into public.guilds(name,created_by) values(btrim(guild_name),actor) returning id into result;
 insert into public.guild_members(guild_id,user_id,role) values(result,actor,'leader');return result;
end $$;

alter table public.guild_teams add column moderation_status text not null default 'pending' check(moderation_status in ('pending','approved'));
create index guild_counters_moderation_idx on public.guild_teams(guild_id,moderation_status,updated_at desc) where kind='counter' and visibility='guild';
create function public.guard_counter_moderation() returns trigger language plpgsql set search_path='' as $$
begin
 -- RPCs execute as the trusted owner. Ordinary authenticated writers cannot approve themselves.
 if current_user in ('authenticated','anon') then
  if tg_op='INSERT' then new.moderation_status='pending';
  elsif new.payload is distinct from old.payload or new.name is distinct from old.name or new.guild_id is distinct from old.guild_id or new.visibility is distinct from old.visibility or new.kind is distinct from old.kind then new.moderation_status='pending';
  else new.moderation_status=old.moderation_status; end if;
 end if;return new;
end $$;
create trigger counter_moderation_guard before insert or update on public.guild_teams for each row execute function public.guard_counter_moderation();
drop policy team_read on public.guild_teams;
create policy team_read on public.guild_teams for select to authenticated using(
 owner_id=(select auth.uid()) or (visibility='guild' and ((public.is_guild_member(guild_id) and (kind<>'counter' or moderation_status='approved')) or public.is_guild_leader(guild_id)))
);
create or replace function public.can_access_siege_counter(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.guild_teams t where t.id=target and t.kind='counter'
 and (t.owner_id=(select auth.uid()) or (t.visibility='guild' and ((public.is_guild_member(t.guild_id) and t.moderation_status='approved') or public.is_guild_leader(t.guild_id))))
 and case when jsonb_typeof(t.payload->'offense'->'configs')='array' then jsonb_array_length(t.payload->'offense'->'configs')=3 else false end
 and case when jsonb_typeof(t.payload->'enemyDefense')='array' then jsonb_array_length(t.payload->'enemyDefense')=3 else false end);
$$;
create function public.admin_moderate_counter(target uuid,operation text,expected_updated timestamptz,edited_payload jsonb default null,edited_name text default null) returns void language plpgsql security definer set search_path='' as $$
declare row public.guild_teams;
begin
 select * into row from public.guild_teams where id=target for update;
 if row.id is null or row.kind<>'counter' or row.visibility<>'guild' or not public.is_guild_leader(row.guild_id) then raise exception 'Counter moderation denied'; end if;
 if expected_updated is null or row.updated_at<>expected_updated then raise exception 'Counter changed; refresh before moderating'; end if;
 if operation='approve' then update public.guild_teams set moderation_status='approved' where id=target;
 elsif operation='delete' then delete from public.guild_teams where id=target;
 elsif operation='edit' then
  if edited_payload is null or edited_name is null then raise exception 'Edited counter is required'; end if;
  update public.guild_teams set name=edited_name,payload=edited_payload,moderation_status='pending' where id=target;
 else raise exception 'Invalid moderation action'; end if;
 insert into public.admin_audit(actor_id,action,target_id) values(auth.uid(),'counter_'||operation,target);
end $$;

create function public.get_admin_overview(target_guild uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; app_role text:=public.current_app_role();
begin
 if app_role not in ('super_admin','guild_leader') then raise exception 'Admin access denied'; end if;
 if target_guild is not null and not public.is_guild_leader(target_guild) then raise exception 'Guild access denied'; end if;
 select jsonb_build_object(
 'guilds',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name)) from public.guilds g where public.is_guild_leader(g.id)),'[]'::jsonb),
 'members',coalesce((select jsonb_agg(to_jsonb(p)) from (select p.* from public.profiles p where public.can_manage_profile(p.id) and (target_guild is null or exists(select 1 from public.guild_members m where m.user_id=p.id and m.guild_id=target_guild)) order by p.created_at desc,p.id limit 500) p),'[]'::jsonb),
 'counters',coalesce((select jsonb_agg(to_jsonb(t)) from (select t.* from public.guild_teams t where t.kind='counter' and t.visibility='guild' and public.is_guild_leader(t.guild_id) and (target_guild is null or t.guild_id=target_guild) order by t.updated_at desc,t.id limit 500) t),'[]'::jsonb),
 'metrics',case when app_role='super_admin' then jsonb_build_object(
 'registered',(select count(*) from public.profiles),'guilds',(select count(*) from public.guilds),'shared_counters',(select count(*) from public.guild_teams where kind='counter' and visibility='guild'),
 'active_7d',(select count(*) from public.profiles where last_seen_at>now()-interval '7 days'),
 'imports_7d',(select count(*) from public.app_events where event_code='swex_imported' and created_at>now()-interval '7 days'),
 'optimizations_7d',(select count(*) from public.app_events where event_code='optimizer_completed' and created_at>now()-interval '7 days'),
 'errors_7d',(select count(*) from public.app_events where event_code in ('swex_failed','optimizer_failed') and created_at>now()-interval '7 days')) else null end,
 'errors',case when app_role='super_admin' then coalesce((select jsonb_agg(to_jsonb(e)) from (select id,user_id,event_code,created_at from public.app_events where event_code in ('swex_failed','optimizer_failed') order by created_at desc limit 50) e),'[]'::jsonb) else '[]'::jsonb end,
 'audit',case when app_role='super_admin' then coalesce((select jsonb_agg(to_jsonb(a)) from (select * from public.admin_audit order by created_at desc limit 50) a),'[]'::jsonb) else '[]'::jsonb end,
 'settings',case when app_role='super_admin' then public.get_engine_settings() else null end
 ) into result;return result;
end $$;
revoke all on function public.sync_auth_profile(),public.current_app_role(),public.can_manage_profile(uuid),public.record_app_event(text),public.touch_my_profile(),public.get_engine_settings(),public.admin_update_settings(numeric,integer,boolean),public.admin_set_member_role(uuid,text,uuid),public.guard_counter_moderation(),public.admin_moderate_counter(uuid,text,timestamptz,jsonb,text),public.get_admin_overview(uuid) from public;
grant execute on function public.current_app_role(),public.can_manage_profile(uuid),public.record_app_event(text),public.touch_my_profile(),public.get_engine_settings(),public.admin_update_settings(numeric,integer,boolean),public.admin_set_member_role(uuid,text,uuid),public.admin_moderate_counter(uuid,text,timestamptz,jsonb,text),public.get_admin_overview(uuid) to authenticated;
grant execute on function public.get_engine_settings() to anon;
commit;
