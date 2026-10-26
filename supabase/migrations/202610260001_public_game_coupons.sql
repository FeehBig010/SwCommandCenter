-- Shared promotional data only: no SWEX, account IDs, tokens or private payloads.
create table public.coupons (
 code text primary key check (code ~ '^[A-Z0-9]{4,40}$'),
 rewards jsonb not null default '[]'::jsonb check (jsonb_typeof(rewards)='array' and jsonb_array_length(rewards)<=20),
 expires_at timestamptz,
 checked_at timestamptz not null default now(),
 status text not null default 'active' check (status in ('active','expired')),
 source text not null default 'manual' check (source in ('manual','community')),
 created_at timestamptz not null default now()
);
create index coupons_active_expiry_idx on public.coupons (expires_at,checked_at desc) where status='active';
alter table public.coupons enable row level security;
create policy coupons_public_active_read on public.coupons for select to anon,authenticated
 using (status='active' and (expires_at>now() or expires_at is null and checked_at>now()-interval '72 hours') and checked_at<=now()+interval '5 minutes');
revoke all on public.coupons from public,anon,authenticated;
grant select (code,rewards,expires_at,checked_at,status,source) on public.coupons to anon,authenticated;
grant all on public.coupons to service_role;
comment on table public.coupons is 'Public Com2uS promotional coupons. Writes restricted to trusted backend/service role. NULL expiry means unknown, requiring recent observation.';
