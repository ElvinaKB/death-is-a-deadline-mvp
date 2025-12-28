-- Migration: Fix return type for students RPCs (use jsonb)

-- 1. List all students (optionally filter by approval status)
create or replace function public.list_students(status text default null)
returns setof jsonb
language plpgsql
security definer
as $$
begin
  return query
    select row_to_json(u)::jsonb
    from auth.users u
    where (status is null or u.raw_user_meta_data->>'approvalStatus' = status)
      and u.role = 'STUDENT';
end;
$$;

-- 2. Get student detail by id
create or replace function public.get_student_detail(student_id uuid)
returns jsonb
language plpgsql
security definer
as $$
begin
  return (
    select row_to_json(u)::jsonb
    from auth.users u
    where u.id = student_id and u.role = 'STUDENT'
  );
end;
$$;

-- 3. Approve student
create or replace function public.approve_student(student_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update auth.users
  set raw_user_meta_data = jsonb_set(raw_user_meta_data, '{approvalStatus}', '"APPROVED"', true)
  where id = student_id and role = 'STUDENT';
end;
$$;

-- 4. Reject student
create or replace function public.reject_student(student_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update auth.users
  set raw_user_meta_data = jsonb_set(raw_user_meta_data, '{approvalStatus}', '"REJECTED"', true)
  where id = student_id and role = 'STUDENT';
end;
$$;
