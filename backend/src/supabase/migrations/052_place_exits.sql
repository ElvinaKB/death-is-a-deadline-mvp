-- First-party "left the listing" events: a logged-in traveler navigated away
-- from (or closed) a hotel listing. Consent-gated on the client like
-- place_views. Paired with the bids table to find each bidding session's
-- best-and-final offer and whether the member walked away without booking.
CREATE TABLE IF NOT EXISTS public.place_exits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  place_id text NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  check_in_date date,
  check_out_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_place_exits_place ON public.place_exits (place_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_place_exits_user ON public.place_exits (user_id, created_at DESC);
