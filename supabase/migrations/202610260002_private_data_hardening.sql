begin;
-- Private stores remain private even from guild leadership/application admins.
create table if not exists public.user_inventory (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=52428800),
 updated_at timestamptz not null default now()
);
create table if not exists public.swex_data (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=52428800),
 updated_at timestamptz not null default now()
);
-- Rebuild policies to remove permissive legacy policies, including unknown names.
do $$ declare tab text; pol record; begin
 foreach tab in array array['user_inventory','swex_data','account_snapshots'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('alter table public.%I force row level security',tab);
  for pol in select policyname from pg_policies where schemaname='public' and tablename=tab loop
   execute format('drop policy %I on public.%I',pol.policyname,tab);
  end loop;
  execute format('revoke all on public.%I from public,anon,authenticated',tab);
  execute format('grant select,insert,update,delete on public.%I to authenticated',tab);
  execute format('grant all on public.%I to service_role',tab);
  execute format('create policy private_owner on public.%I for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',tab);
 end loop;
end $$;
do $$ declare pol record;begin for pol in select policyname from pg_policies where schemaname='public' and tablename='profiles' loop execute format('drop policy %I on public.profiles',pol.policyname);end loop;end $$;
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()));
-- Profile mutations stay behind owner-scoped RPCs, never an editable role column.
revoke all on public.profiles from public,anon,authenticated;
grant select on public.profiles to authenticated;

-- Portable compositions can be shared; inventory trees and instance identifiers cannot.
create function public.guild_payload_is_portable(doc jsonb,kind text) returns boolean
language plpgsql immutable set search_path='' as $$
declare team jsonb; config jsonb; key text;
begin
 if jsonb_typeof(doc)<>'object' or doc->'version' is distinct from '1'::jsonb then return false; end if;
 if kind='counter' then
  if doc-array['version','arenaContext','offense','enemyDefense','outcome','notes','name','siege']<>'{}'::jsonb or jsonb_typeof(doc->'enemyDefense') is distinct from 'array' then return false; end if;
  team=doc->'offense';
 elsif kind in ('template','plan') then
  if doc-array['version','team']<>'{}'::jsonb then return false; end if; team=doc->'team';
 else return false; end if;
 if jsonb_typeof(team) is distinct from 'object' or jsonb_typeof(team->'configs') is distinct from 'array' then return false; end if;
 if team-array['name','description','gameMode','arenaContext','mode','towerSpd','guildSpd','leaderSpd','enemyCombatSpd','leader','leaderIndex','configs','autoOpener','autoName','combatScenario','dungeon','exportContext']<>'{}'::jsonb then return false; end if;
 if jsonb_array_length(team->'configs') not between 3 and 6 then return false; end if;
 for config in select value from jsonb_array_elements(team->'configs') loop
  if jsonb_typeof(config)<>'object' or config-array['masterId','label','sets','strictSets','mains','goals','basis','artifacts','lockSpeedSync','objective','damage','combat','combatSpd','maxTick','focuses']<>'{}'::jsonb then return false; end if;
 end loop;
 foreach key in array array['unit_list','rune_list','runes','units','wizard_info','unit_id','unitId','rune_id','runeIds','artifactIds','artifact_list','session_key','accountPresets','plannedRunes','payload'] loop
  if jsonb_path_exists(doc,('$.**.'||key)::jsonpath) then return false; end if;
 end loop;
 return true;
end $$;
revoke all on function public.guild_payload_is_portable(jsonb,text) from public,anon;
grant execute on function public.guild_payload_is_portable(jsonb,text) to authenticated;
-- Existing incompatible rows stay available to their owner, but can never leak
-- to members. NOT VALID avoids deleting or rewriting legacy private data.
alter table public.guild_teams add constraint guild_portable_payload check(public.guild_payload_is_portable(payload,kind)) not valid;
drop policy team_read on public.guild_teams;
drop policy team_insert on public.guild_teams;
drop policy team_update on public.guild_teams;
drop policy team_delete on public.guild_teams;
create policy team_read on public.guild_teams for select to authenticated using(
 owner_id=(select auth.uid()) or (visibility='guild' and public.guild_payload_is_portable(payload,kind)
 and (public.is_guild_member(guild_id) or public.is_guild_leader(guild_id))
 and (kind<>'counter' or moderation_status='approved' or public.is_guild_leader(guild_id)))
);
create policy team_insert on public.guild_teams for insert to authenticated with check(
 owner_id=(select auth.uid()) and (public.current_app_role()='super_admin' or (public.current_app_role()='guild_leader' and (guild_id is null or public.is_guild_leader(guild_id))))
);
create policy team_update on public.guild_teams for update to authenticated using(
 (visibility='guild' or owner_id=(select auth.uid())) and (public.current_app_role()='super_admin' or (public.current_app_role()='guild_leader' and (guild_id is null or public.is_guild_leader(guild_id)))
)) with check((visibility='guild' or owner_id=(select auth.uid())) and (public.current_app_role()='super_admin' or (public.current_app_role()='guild_leader' and (guild_id is null or public.is_guild_leader(guild_id)))));
create policy team_delete on public.guild_teams for delete to authenticated using(
 (visibility='guild' or owner_id=(select auth.uid())) and (public.current_app_role()='super_admin' or (public.current_app_role()='guild_leader' and (guild_id is null or public.is_guild_leader(guild_id))))
);
create or replace function public.can_access_siege_counter(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.guild_teams t where t.id=target and t.kind='counter' and public.guild_payload_is_portable(t.payload,t.kind)
 and (t.owner_id=(select auth.uid()) or (t.visibility='guild' and ((public.is_guild_member(t.guild_id) and t.moderation_status='approved') or public.is_guild_leader(t.guild_id))))
 and case when jsonb_typeof(t.payload->'offense'->'configs')='array' then jsonb_array_length(t.payload->'offense'->'configs')=3 else false end
 and case when jsonb_typeof(t.payload->'enemyDefense')='array' then jsonb_array_length(t.payload->'enemyDefense')=3 else false end);
$$;
drop policy favorite_read on public.counter_favorites;
create policy favorite_read on public.counter_favorites for select to authenticated using(owner_id=(select auth.uid()) and public.guild_payload_is_portable(counter_snapshot,'counter'));
create function public.keep_guild_team_owner() returns trigger language plpgsql set search_path='' as $$
begin if new.owner_id<>old.owner_id then raise exception 'O proprietário da composição não pode ser alterado.';end if;return new;end $$;
create trigger guild_team_owner_immutable before update on public.guild_teams for each row execute function public.keep_guild_team_owner();
revoke all on function public.keep_guild_team_owner() from public,anon,authenticated;
commit;
