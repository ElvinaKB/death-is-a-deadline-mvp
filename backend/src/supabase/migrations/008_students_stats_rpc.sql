-- Migration: Students stats RPC for dashboard

create or replace function public.students_stats()
returns jsonb
language plpgsql
security definer
as $$
declare
  total integer;
  approved integer;
  pending integer;
begin
  select count(*) into total from auth.users where role = 'STUDENT';
  select count(*) into approved from auth.users where role = 'STUDENT' and raw_user_meta_data->>'approvalStatus' = 'APPROVED';
  select count(*) into pending from auth.users where role = 'STUDENT' and raw_user_meta_data->>'approvalStatus' = 'PENDING';
  return jsonb_build_object(
    'totalStudents', total,
    'approvedStudents', approved,
    'pendingStudents', pending
  );
end;
$$;
