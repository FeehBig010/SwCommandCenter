-- Optional normalized inventory backup. Never shared with guilds/leaders/admins.
create table if not exists public.account_snapshots (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null,
 updated_at timestamptz not null default now(),
 constraint valid_account_snapshot check (
  jsonb_typeof(payload)='object' and payload->'version'='1'::jsonb
  and jsonb_typeof(payload->'units')='array' and jsonb_typeof(payload->'runes')='array'
  and jsonb_typeof(payload->'artifacts')='array'
  and payload ?& array['version','id','name','units','runes','artifacts']
  and (payload - array['version','id','name','guild','importedAt','units','runes','artifacts','siege','accountPresets','towers'])='{}'::jsonb
  and octet_length(payload::text)<=52428800
 )
);
alter table public.account_snapshots enable row level security;
revoke all on public.account_snapshots from anon,authenticated;
grant select,insert,update,delete on public.account_snapshots to authenticated;
create policy account_owner_select on public.account_snapshots for select to authenticated using (user_id=(select auth.uid()));
create policy account_owner_insert on public.account_snapshots for insert to authenticated with check (user_id=(select auth.uid()));
create policy account_owner_update on public.account_snapshots for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy account_owner_delete on public.account_snapshots for delete to authenticated using (user_id=(select auth.uid()));
create function public.touch_account_snapshot() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now();return new;end $$;
create trigger account_snapshot_updated before update on public.account_snapshots for each row execute function public.touch_account_snapshot();
