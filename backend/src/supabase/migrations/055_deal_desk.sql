-- Deal desk: the decision-maker we reach at each hotel, and a log of every
-- call made from a member's best-and-final bid.
CREATE TABLE IF NOT EXISTS public.hotel_contacts (
  place_id text PRIMARY KEY REFERENCES public.places(id) ON DELETE CASCADE,
  name text,
  role text,
  phone text,
  email text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deal_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  bid_id uuid,
  member_id uuid,
  check_in_date date,
  check_out_date date,
  member_bid_per_night numeric(10,2),
  outcome text NOT NULL,
  amount_per_night numeric(10,2),
  reason text,
  notes text,
  direct_lead boolean NOT NULL DEFAULT false,
  callback_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deal_calls_place ON public.deal_calls (place_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_calls_bid ON public.deal_calls (bid_id);
CREATE INDEX IF NOT EXISTS idx_deal_calls_created ON public.deal_calls (created_at DESC);
