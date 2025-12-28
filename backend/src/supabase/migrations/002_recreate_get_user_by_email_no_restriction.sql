-- Migration: drop and recreate get_user_by_email function without any role restriction

drop function if exists public.get_user_by_email(email text);

create or replace function public.get_user_by_email(email text)
returns jsonb
language plpgsql
security definer
as $$
begin
  return (
    select row_to_json(u) from auth.users u where u.email = get_user_by_email.email
  );
end;
$$;
