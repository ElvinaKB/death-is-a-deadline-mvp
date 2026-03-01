CREATE OR REPLACE FUNCTION get_users_by_emails(emails text[])
RETURNS TABLE (
  id uuid,
  email text,
  raw_user_meta_data jsonb
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, email, raw_user_meta_data
  FROM auth.users
  WHERE email = ANY(emails);
$$;