-- Migration: Drop and recreate resubmit_id function to only update status and image url
DROP FUNCTION IF EXISTS resubmit_id(student_id uuid, studentIdUrl text);

CREATE OR REPLACE FUNCTION resubmit_id(student_id uuid, studentIdUrl text)
RETURNS TABLE (id uuid, email text, updated_at timestamptz) AS $$
DECLARE
  student_email text;
  now_time timestamptz := NOW();
BEGIN
  -- Update the student's studentIdUrl and approvalStatus
  UPDATE auth.users
  SET
    raw_user_meta_data = jsonb_set(
      jsonb_set(raw_user_meta_data, '{studentIdUrl}', to_jsonb(studentIdUrl)),
      '{approvalStatus}', '"PENDING"'
    ),
    updated_at = now_time
  WHERE id = student_id
  RETURNING id, email, updated_at INTO id, student_email, updated_at;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
