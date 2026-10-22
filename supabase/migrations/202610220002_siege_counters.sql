begin;
create function public.can_access_siege_counter(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.guild_teams t where t.id=target and t.kind='counter'
 and (t.owner_id=(select auth.uid()) or (t.visibility='guild' and public.is_guild_member(t.guild_id)))
 and case when jsonb_typeof(t.payload->'offense'->'configs')='array' then jsonb_array_length(t.payload->'offense'->'configs')=3 else false end
 and case when jsonb_typeof(t.payload->'enemyDefense')='array' then jsonb_array_length(t.payload->'enemyDefense')=3 else false end);
$$;
create table public.counter_feedback (
 counter_id uuid not null references public.guild_teams(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reaction text check (reaction in ('free_win','rng','high_runes')),
 outcome text check (outcome in ('win','loss')),
 updated_at timestamptz not null default now(), primary key(counter_id,user_id)
);
create index counter_feedback_user_idx on public.counter_feedback(user_id);
create table public.counter_favorites (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 source_counter_id uuid references public.guild_teams(id) on delete set null,
 counter_snapshot jsonb not null check (jsonb_typeof(counter_snapshot)='object' and octet_length(counter_snapshot::text)<=100000),
 saved_at timestamptz not null default now(), unique(owner_id,source_counter_id)
);
create index counter_favorites_owner_idx on public.counter_favorites(owner_id,saved_at desc);
alter table public.counter_feedback enable row level security;
alter table public.counter_favorites enable row level security;
create policy feedback_read on public.counter_feedback for select to authenticated using (public.can_access_siege_counter(counter_id));
create policy favorite_read on public.counter_favorites for select to authenticated using (owner_id=(select auth.uid()));
create policy favorite_delete on public.counter_favorites for delete to authenticated using (owner_id=(select auth.uid()));
revoke all on public.counter_feedback,public.counter_favorites from anon,authenticated;
grant select on public.counter_feedback,public.counter_favorites to authenticated;
grant delete on public.counter_favorites to authenticated;

create function public.set_counter_feedback(target uuid,field text,value text) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not public.can_access_siege_counter(target) then raise exception 'Counter access denied'; end if;
 if field not in ('reaction','outcome') or field is null then raise exception 'Invalid feedback field'; end if;
 if field='reaction' and value is not null and value not in ('free_win','rng','high_runes') then raise exception 'Invalid reaction'; end if;
 if field='outcome' and value is not null and value not in ('win','loss') then raise exception 'Invalid outcome'; end if;
 insert into public.counter_feedback(counter_id,user_id,reaction,outcome) values(target,actor,case when field='reaction' then value end,case when field='outcome' then value end)
 on conflict(counter_id,user_id) do update set
 reaction=case when field='reaction' then excluded.reaction else public.counter_feedback.reaction end,
 outcome=case when field='outcome' then excluded.outcome else public.counter_feedback.outcome end,updated_at=clock_timestamp();
end;
$$;
create function public.save_counter_favorite(target uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; snapshot jsonb; actor uuid:=auth.uid();
begin
 if actor is null or not public.can_access_siege_counter(target) then raise exception 'Counter access denied'; end if;
 select payload into snapshot from public.guild_teams where id=target;
 insert into public.counter_favorites(owner_id,source_counter_id,counter_snapshot) values(actor,target,snapshot)
 on conflict(owner_id,source_counter_id) do update set counter_snapshot=excluded.counter_snapshot,saved_at=clock_timestamp() returning id into result;
 return result;
end;
$$;
create function public.get_siege_feedback(target_ids uuid[]) returns table (
 counter_id uuid,author_label text,free_win bigint,rng bigint,high_runes bigint,wins bigint,losses bigint,my_reaction text,my_outcome text
) language sql stable security definer set search_path='' as $$
 select t.id,left(coalesce(nullif(u.raw_user_meta_data->>'preferred_username',''),nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),'Membro da guilda'),80),
 count(f.user_id) filter(where f.reaction='free_win'),count(f.user_id) filter(where f.reaction='rng'),count(f.user_id) filter(where f.reaction='high_runes'),
 count(f.user_id) filter(where f.outcome='win'),count(f.user_id) filter(where f.outcome='loss'),
 max(f.reaction) filter(where f.user_id=(select auth.uid())),max(f.outcome) filter(where f.user_id=(select auth.uid()))
 from public.guild_teams t join auth.users u on u.id=t.owner_id left join public.counter_feedback f on f.counter_id=t.id
 where t.id=any(target_ids[1:500]) and public.can_access_siege_counter(t.id)
 group by t.id,u.raw_user_meta_data;
$$;
revoke all on function public.can_access_siege_counter(uuid),public.set_counter_feedback(uuid,text,text),public.save_counter_favorite(uuid),public.get_siege_feedback(uuid[]) from public;
grant execute on function public.can_access_siege_counter(uuid),public.set_counter_feedback(uuid,text,text),public.save_counter_favorite(uuid),public.get_siege_feedback(uuid[]) to authenticated;
-- Supabase projects already have this publication; local PostgreSQL tests may not.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='counter_feedback') then
  alter publication supabase_realtime add table public.counter_feedback;
 end if;
end $$;
commit;
