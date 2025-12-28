-- Migration: Update reject_student RPC to accept a reason and set it in raw_user_meta_data

create or replace function public.reject_student(student_id uuid, reason text default null)
returns void
language plpgsql
security definer
as $$
begin
  update auth.users
  set raw_user_meta_data = jsonb_set(
    jsonb_set(raw_user_meta_data, '{approvalStatus}', '"REJECTED"', true),
    '{rejectionReason}',
    to_jsonb(reason),
    true
  )
  where id = student_id and role = 'STUDENT';
end;
$$;
