-- Extend normalized backup whitelist; inventory remains owner-only.
alter table public.account_snapshots drop constraint valid_account_snapshot;
alter table public.account_snapshots add constraint valid_account_snapshot check (
 jsonb_typeof(payload)='object' and payload->'version'='1'::jsonb
 and jsonb_typeof(payload->'units')='array' and jsonb_typeof(payload->'runes')='array'
 and jsonb_typeof(payload->'artifacts')='array'
 and payload ?& array['version','id','name','units','runes','artifacts']
 and (payload - array['version','id','name','guild','importedAt','units','runes','artifacts','siege','accountPresets','towers','crafts','equipmentPools'])='{}'::jsonb
 and (not (payload ? 'crafts') or jsonb_typeof(payload->'crafts')='array')
 and (not (payload ? 'equipmentPools') or jsonb_typeof(payload->'equipmentPools')='object')
 and octet_length(payload::text)<=52428800
);
