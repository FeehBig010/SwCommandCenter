-- Extend normalized backup whitelist; inventory remains owner-only.
alter table public.account_snapshots drop constraint valid_account_snapshot;
alter table public.account_snapshots add constraint valid_account_snapshot check (
 jsonb_typeof(payload)='object' and payload->'version'='1'::jsonb
 and jsonb_typeof(payload->'units')='array' and jsonb_typeof(payload->'runes')='array'
 and jsonb_typeof(payload->'artifacts')='array'
 and payload ?& array['version','id','name','units','runes','artifacts']
 and (payload - array['version','id','name','guild','importedAt','units','runes','artifacts','siege','accountPresets','towers','crafts'])='{}'::jsonb
 and (not (payload ? 'crafts') or jsonb_typeof(payload->'crafts')='array')
 and octet_length(payload::text)<=52428800
);
create table public.account_progression (
 user_id uuid not null references auth.users(id) on delete cascade,
 account_id text not null check(length(account_id) between 1 and 100),
 week date not null,
 payload jsonb not null,
 primary key(user_id,account_id,week),
 constraint valid_progression check (
  jsonb_typeof(payload)='object' and octet_length(payload::text)<=2048
  and payload ?& array['accountId','capturedAt','units','runes','artifacts','meanEfficiency','fastRunes']
  and (payload-array['accountId','capturedAt','units','runes','artifacts','meanEfficiency','fastRunes'])='{}'::jsonb
  and payload->>'accountId'=account_id
  and jsonb_typeof(payload->'capturedAt')='string'
  and jsonb_typeof(payload->'units')='number' and (payload->>'units')::numeric between 0 and 1000000
  and jsonb_typeof(payload->'runes')='number' and (payload->>'runes')::numeric between 0 and 1000000
  and jsonb_typeof(payload->'artifacts')='number' and (payload->>'artifacts')::numeric between 0 and 1000000
  and jsonb_typeof(payload->'meanEfficiency')='number' and (payload->>'meanEfficiency')::numeric between 0 and 1000000
  and jsonb_typeof(payload->'fastRunes')='number' and (payload->>'fastRunes')::numeric between 0 and 1000000
 )
);
alter table public.account_progression enable row level security;
revoke all on public.account_progression from anon,authenticated;
grant select,insert,update,delete on public.account_progression to authenticated;
create policy progression_owner on public.account_progression to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
