begin;
alter table public.guild_teams
 add column votes jsonb not null default '{"upvotes":0,"downvotes":0}'::jsonb
 check (jsonb_typeof(votes)='object' and (votes->>'upvotes')::bigint>=0 and (votes->>'downvotes')::bigint>=0),
 add column target_defense text not null default '' check (length(target_defense)<=1000);

create table public.guild_team_votes (
 team_id uuid not null references public.guild_teams(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 vote smallint not null check (vote in (-1,1)),
 primary key(team_id,user_id)
);
create index guild_team_votes_user_idx on public.guild_team_votes(user_id,team_id);
alter table public.guild_team_votes enable row level security;
create policy attack_vote_read on public.guild_team_votes for select to authenticated using (
 user_id=(select auth.uid()) and exists(select 1 from public.guild_teams t where t.id=team_id and t.visibility='guild' and public.is_guild_member(t.guild_id))
);
revoke all on public.guild_team_votes from public,anon,authenticated;
grant select on public.guild_team_votes to authenticated;

-- Authors keep their existing ownership RLS for content and Defesa Alvo.
-- Counts cannot be inserted or edited directly, even by an author's REST client.
revoke insert,update on public.guild_teams from authenticated;
grant insert(owner_id,guild_id,kind,visibility,is_leadership,name,payload,target_defense) on public.guild_teams to authenticated;
grant update(owner_id,guild_id,kind,visibility,is_leadership,name,payload,target_defense) on public.guild_teams to authenticated;

-- Atomic deltas also keep counts correct when a user/account is deleted.
create function public.refresh_guild_team_votes() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; up_delta integer:=0; down_delta integer:=0;
begin
 if tg_op in ('DELETE','UPDATE') then target=old.team_id;up_delta=up_delta-case when old.vote=1 then 1 else 0 end;down_delta=down_delta-case when old.vote=-1 then 1 else 0 end;end if;
 if tg_op in ('INSERT','UPDATE') then target=new.team_id;up_delta=up_delta+case when new.vote=1 then 1 else 0 end;down_delta=down_delta+case when new.vote=-1 then 1 else 0 end;end if;
 update public.guild_teams set votes=jsonb_build_object('upvotes',(votes->>'upvotes')::bigint+up_delta,'downvotes',(votes->>'downvotes')::bigint+down_delta) where id=target;
 return null;
end $$;
create trigger guild_team_vote_counts after insert or update or delete on public.guild_team_votes for each row execute function public.refresh_guild_team_votes();
revoke all on function public.refresh_guild_team_votes() from public,anon,authenticated;

create function public.set_guild_team_vote(target uuid,value smallint) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); team public.guild_teams; result jsonb;
begin
 if actor is null then raise exception 'Authentication required'; end if;
 if value is not null and value not in (-1,1) then raise exception 'Invalid vote'; end if;
 -- Serialize per team: concurrent votes cannot overwrite one another's counts.
 select * into team from public.guild_teams where id=target for update;
 if not found or team.visibility<>'guild' or not public.is_guild_member(team.guild_id)
 or coalesce(team.payload->'team'->>'mode',team.payload->'offense'->>'mode','')<>'attack'
 then raise exception 'Attack access denied'; end if;
 if team.kind='counter' and coalesce(to_jsonb(team)->>'moderation_status','pending')<>'approved' and team.owner_id<>actor and not public.is_guild_leader(team.guild_id) then raise exception 'Attack access denied';end if;
 if value is null then delete from public.guild_team_votes where team_id=target and user_id=actor;
 else insert into public.guild_team_votes(team_id,user_id,vote) values(target,actor,value)
 on conflict(team_id,user_id) do update set vote=excluded.vote;
 end if;
 select votes into result from public.guild_teams where id=target;
 return jsonb_build_object('votes',result,'my_vote',value);
end $$;
revoke all on function public.set_guild_team_vote(uuid,smallint) from public,anon,authenticated;
grant execute on function public.set_guild_team_vote(uuid,smallint) to authenticated;
commit;
