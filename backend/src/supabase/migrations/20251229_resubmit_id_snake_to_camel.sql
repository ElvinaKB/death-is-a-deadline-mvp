-- Drop and recreate resubmit_id to accept snake_case argument but update camelCase in JSON
DROP FUNCTION IF EXISTS resubmit_id(uuid, text);

CREATE OR REPLACE FUNCTION resubmit_id(student_id uuid, student_id_url text)
RETURNS TABLE (id uuid, email text, updated_at timestamptz) AS $$
DECLARE
  student_email text;
  now_time timestamptz := NOW();
BEGIN
  -- Update the student's studentIdUrl (camelCase) and approvalStatus
  UPDATE auth.users au
  SET
    raw_user_meta_data = jsonb_set(
      jsonb_set(raw_user_meta_data, '{studentIdUrl}', to_jsonb(student_id_url)),
      '{approvalStatus}', '"PENDING"'
    ),
    updated_at = now_time
  WHERE au.id = student_id
  RETURNING au.id, au.email, au.updated_at INTO id, student_email, updated_at;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
