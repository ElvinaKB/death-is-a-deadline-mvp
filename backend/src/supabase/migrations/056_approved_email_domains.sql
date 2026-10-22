-- Company domains whose employees are auto-approved at sign-up (e.g.
-- hawkemedia.com), managed from Admin → Travelers. Exact domain match.
CREATE TABLE IF NOT EXISTS public.approved_email_domains (
  domain text PRIMARY KEY,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.approved_email_domains ENABLE ROW LEVEL SECURITY;
