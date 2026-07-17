-- Migration: Ban/unban a traveler account without deleting their record.
-- Banned accounts are blocked at login and at signup (re-registering the
-- same email), but their history (bids, payments) stays intact.

create or replace function public.ban_student(student_id uuid, reason text default null)
returns void
language plpgsql
security definer
as $$
begin
  update auth.users
  set raw_user_meta_data = jsonb_set(
    jsonb_set(raw_user_meta_data, '{banned}', 'true', true),
    '{banReason}',
    to_jsonb(reason),
    true
  )
  where id = student_id and role = 'STUDENT';
end;
$$;

create or replace function public.unban_student(student_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update auth.users
  set raw_user_meta_data = jsonb_set(
    jsonb_set(raw_user_meta_data, '{banned}', 'false', true),
    '{banReason}',
    'null',
    true
  )
  where id = student_id and role = 'STUDENT';
end;
$$;
