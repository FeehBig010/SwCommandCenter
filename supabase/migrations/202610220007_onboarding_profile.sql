alter table public.profiles add column has_completed_onboarding boolean not null default false;
create function public.complete_my_onboarding() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 update public.profiles set has_completed_onboarding=true where id=auth.uid();
end $$;
create function public.save_my_display_profile(new_display_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if new_display_name is null or length(trim(new_display_name))<2 or length(trim(new_display_name))>80 then raise exception 'Invalid display name'; end if;
 update public.profiles set display_name=trim(new_display_name),has_completed_onboarding=true where id=auth.uid();
end $$;
revoke all on function public.complete_my_onboarding() from public,anon;
revoke all on function public.save_my_display_profile(text) from public,anon;
grant execute on function public.complete_my_onboarding() to authenticated;
grant execute on function public.save_my_display_profile(text) to authenticated;
