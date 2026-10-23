-- Accept compact SWEX-shaped backups without changing owner-only RLS.
BEGIN;
alter table public.account_snapshots add column if not exists source_account_id text;
alter table public.account_snapshots add column if not exists source_account_name text;
alter table public.account_snapshots drop constraint if exists valid_account_snapshot;
alter table public.account_snapshots add constraint valid_account_snapshot check (
coalesce((jsonb_typeof(payload)='object' and payload->'version'='1'::jsonb
 and jsonb_typeof(payload->'units')='array' and jsonb_typeof(payload->'runes')='array'
 and jsonb_typeof(payload->'artifacts')='array'
 and payload ?& array['version','id','name','units','runes','artifacts']
 and (payload - array['version','id','name','guild','importedAt','units','runes','artifacts','siege','accountPresets','towers','crafts','equipmentPools'])='{}'::jsonb
 and (not (payload ? 'crafts') or jsonb_typeof(payload->'crafts')='array')
 and (not (payload ? 'equipmentPools') or jsonb_typeof(payload->'equipmentPools')='object')
 and octet_length(payload::text)<=52428800),false) OR (
 jsonb_typeof(payload)='object'
 and payload ?& array['unit_list','runes','deck_list','defense_deck_list','world_arena_deck_list']
 and (payload - array['unit_list','runes','deck_list','defense_deck_list','world_arena_deck_list'])='{}'::jsonb
 and jsonb_typeof(payload->'unit_list')='array'
 and jsonb_typeof(payload->'runes')='array'
 and jsonb_typeof(payload->'deck_list')='array'
 and jsonb_typeof(payload->'defense_deck_list')='array'
 and jsonb_typeof(payload->'world_arena_deck_list')='array'
 and octet_length(payload::text)<=52428800
));
COMMIT;
