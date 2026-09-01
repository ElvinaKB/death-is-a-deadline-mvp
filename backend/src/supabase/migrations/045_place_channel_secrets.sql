-- Per-property channel connection secret.
--
-- A hotel enters this secret (with its listing slug as the "Property ID") when
-- connecting the Deadline channel in Cloudbeds/myallocator. Because listing
-- slugs are public (they're in the deadlinetravel.com URL), the secret is what
-- stops one hotel from linking a Cloudbeds property to another hotel's Deadline
-- listing. Every SetupProperty / booking call must present the matching secret
-- (see findPlaceByOtaId in backend/src/routers/myallocator.router.ts).
--
-- Run this BEFORE deploying the code that reads/validates the secret.
CREATE TABLE IF NOT EXISTS public.place_channel_secrets (
  place_id   text PRIMARY KEY REFERENCES public.places(id) ON DELETE CASCADE,
  secret     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Deny-all for client keys; the backend uses the service role and bypasses RLS,
-- matching the posture of the other server-only tables.
ALTER TABLE public.place_channel_secrets ENABLE ROW LEVEL SECURITY;

-- Backfill a random secret for every existing place so all listings are both
-- connectable and protected. New places get one at creation time in code.
INSERT INTO public.place_channel_secrets (place_id, secret)
SELECT id, substr(md5(random()::text || id || clock_timestamp()::text), 1, 20)
FROM public.places
ON CONFLICT (place_id) DO NOTHING;
