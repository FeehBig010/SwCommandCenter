begin;
create table public.guilds (
 id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 1 and 100),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.guild_members (
 guild_id uuid not null references public.guilds(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'member' check (role in ('member','leader')),
 primary key (guild_id,user_id)
);
create index guild_members_user_idx on public.guild_members(user_id,guild_id);
create table public.guild_invites (
 code uuid primary key default gen_random_uuid(), guild_id uuid not null references public.guilds(id) on delete cascade,
 expires_at timestamptz not null default (now()+interval '7 days')
);
create index guild_invites_guild_idx on public.guild_invites(guild_id);
create table public.guild_teams (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 guild_id uuid references public.guilds(id) on delete cascade,
 kind text not null check (kind in ('template','counter','plan')),
 visibility text not null default 'private' check (visibility in ('private','guild')),
 is_leadership boolean not null default false,
 name text not null check (length(name) between 1 and 100),
 payload jsonb not null check (jsonb_typeof(payload)='object' and octet_length(payload::text)<=100000 and (payload->>'version') is not distinct from '1'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (visibility='private' or guild_id is not null),
 check (not is_leadership or (guild_id is not null and visibility='guild' and kind='template'))
);
create index guild_teams_owner_idx on public.guild_teams(owner_id,updated_at desc);
create index guild_teams_shared_idx on public.guild_teams(guild_id,updated_at desc) where visibility='guild';
alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;
alter table public.guild_invites enable row level security;
alter table public.guild_teams enable row level security;

create function public.is_guild_member(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.guild_members where guild_id=target and user_id=(select auth.uid()));
$$;
create function public.is_guild_leader(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.guild_members where guild_id=target and user_id=(select auth.uid()) and role='leader');
$$;
create policy guild_read on public.guilds for select to authenticated using (public.is_guild_member(id));
create policy membership_read on public.guild_members for select to authenticated using (user_id=(select auth.uid()));
create policy invite_read on public.guild_invites for select to authenticated using (public.is_guild_leader(guild_id));
create policy team_read on public.guild_teams for select to authenticated using (
 owner_id=(select auth.uid()) or (visibility='guild' and public.is_guild_member(guild_id))
);
create policy team_insert on public.guild_teams for insert to authenticated with check (
 owner_id=(select auth.uid()) and (guild_id is null or public.is_guild_member(guild_id))
 and (not is_leadership or public.is_guild_leader(guild_id))
);
create policy team_update on public.guild_teams for update to authenticated using (owner_id=(select auth.uid())) with check (
 owner_id=(select auth.uid()) and (guild_id is null or public.is_guild_member(guild_id))
 and (not is_leadership or public.is_guild_leader(guild_id))
);
create policy team_delete on public.guild_teams for delete to authenticated using (owner_id=(select auth.uid()));
create function public.touch_guild_team() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=clock_timestamp(); new.created_at=old.created_at; return new; end;
$$;
create trigger guild_team_updated before update on public.guild_teams for each row execute function public.touch_guild_team();

-- Membership/leadership cannot be granted from user metadata or a client-side toggle.
create function public.create_guild(guild_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; actor uuid := auth.uid();
begin
 if actor is null then raise exception 'Authentication required'; end if;
 if guild_name is null or length(btrim(guild_name)) not between 1 and 100 then raise exception 'Invalid guild name'; end if;
 insert into public.guilds(name,created_by) values(btrim(guild_name),actor) returning id into result;
 insert into public.guild_members(guild_id,user_id,role) values(result,actor,'leader');
 return result;
end;
$$;
create function public.create_guild_invite(target uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not public.is_guild_leader(target) then raise exception 'Leader access required'; end if;
 insert into public.guild_invites(guild_id) values(target) returning code into result; return result;
end;
$$;
create function public.join_guild(invite_code uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid; actor uuid := auth.uid();
begin
 if actor is null then raise exception 'Authentication required'; end if;
 select guild_id into target from public.guild_invites where code=invite_code and expires_at>now();
 if target is null then raise exception 'Invalid or expired invite'; end if;
 insert into public.guild_members(guild_id,user_id,role) values(target,actor,'member') on conflict do nothing;
 return target;
end;
$$;
revoke all on public.guilds,public.guild_members,public.guild_invites,public.guild_teams from anon,authenticated;
grant select on public.guilds,public.guild_members,public.guild_invites to authenticated;
grant select,insert,update,delete on public.guild_teams to authenticated;
revoke all on function public.is_guild_member(uuid),public.is_guild_leader(uuid),public.create_guild(text),public.create_guild_invite(uuid),public.join_guild(uuid),public.touch_guild_team() from public;
grant execute on function public.is_guild_member(uuid),public.is_guild_leader(uuid),public.create_guild(text),public.create_guild_invite(uuid),public.join_guild(uuid) to authenticated;
commit;
