-- Migration: create function to get full user from auth.users by email
-- This function can only be called by the service role (authenticator = 'service_role')

create or replace function public.get_user_by_email(email text)
returns jsonb
language plpgsql
security definer
as $$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'Permission denied';
  end if;
  return (
    select row_to_json(u) from auth.users u where u.email = get_user_by_email.email
  );
end;
$$;

-- Grant execute only to service role (no-op in Supabase, enforced by function logic)
