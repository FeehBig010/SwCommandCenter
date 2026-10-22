-- Execute ONCE as the project owner in Supabase SQL Editor, after all migrations
-- and after this account has registered and confirmed its email.
-- This is deliberately not an automatic migration: the account may not exist yet.
-- No frontend role, email variable or user metadata can grant this permission.
select public.bootstrap_super_admin('felipe.amaral.matos@gmail.com');
