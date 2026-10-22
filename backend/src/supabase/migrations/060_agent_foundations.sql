-- Mini Elvina foundations (the bid-recovery agent).
-- When a member's bid misses a partner hotel's secret price and the member asks
-- us to, we take the bid to the hotel (Terms 4.6 / hotel agreement 4.6). These
-- tables hold each negotiation, everything said in it, the standing rules a
-- hotel approves along the way, and the texting consent both sides give.

-- 1. One row per negotiation.
CREATE TABLE IF NOT EXISTS public.deal_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  -- The member's best losing bid this offer started from.
  bid_id uuid,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  nights integer NOT NULL CHECK (nights > 0),
  bid_per_night numeric(10,2) NOT NULL,
  -- Snapshots at the moment of the offer, for learning (internal only):
  -- the hotel's acceptance threshold, how far below it the bid was, and how
  -- many days out the stay was.
  floor_per_night numeric(10,2),
  gap_pct numeric(6,2),
  lead_time_days integer,
  status text NOT NULL DEFAULT 'PENDING_MEMBER' CHECK (status IN (
    'PENDING_MEMBER',   -- we asked the member whether to pitch it
    'SENT_TO_HOTEL',    -- pitched; waiting on the hotel
    'HOTEL_ACCEPTED',   -- hotel said yes; member gets a pay link
    'HOTEL_COUNTERED',  -- hotel named a price; member decides
    'HOTEL_DECLINED',
    'MEMBER_DECLINED',  -- member passed on the counter
    'BOOKED',           -- paid; a real reservation exists
    'EXPIRED',          -- nobody answered in time
    'CANCELLED'
  )),
  counter_per_night numeric(10,2),
  final_per_night numeric(10,2),
  booked_bid_id uuid,
  -- One-tap Accept / Counter / Decline link for the hotel (we store a hash).
  hotel_token_hash text UNIQUE,
  channel text,                      -- how the hotel was reached: email | sms
  member_consented_at timestamptz,   -- member said "yes, pitch it"
  sent_to_hotel_at timestamptz,
  hotel_responded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deal_offers_place ON public.deal_offers (place_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_offers_member ON public.deal_offers (member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_offers_status ON public.deal_offers (status);
CREATE INDEX IF NOT EXISTS idx_deal_offers_bid ON public.deal_offers (bid_id);

-- 2. Append-only log of every message and status change in an offer.
CREATE TABLE IF NOT EXISTS public.deal_offer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.deal_offers(id) ON DELETE CASCADE,
  actor text NOT NULL CHECK (actor IN ('member', 'hotel', 'agent', 'admin', 'system')),
  type text NOT NULL CHECK (type IN ('message', 'status', 'note')),
  channel text,                      -- in_app | email | sms
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deal_offer_events_offer ON public.deal_offer_events (offer_id, created_at);

-- 3. Standing instructions a hotel approves while answering an offer
--    ("accept bids like this automatically"), until it changes them in writing.
CREATE TABLE IF NOT EXISTS public.hotel_negotiation_rules (
  place_id text PRIMARY KEY REFERENCES public.places(id) ON DELETE CASCADE,
  auto_accept_floor_per_night numeric(10,2),
  approved_at timestamptz,
  approved_via text,                 -- offer_link | email | sms | admin
  approved_offer_id uuid,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Texting consent. Hotel decision-makers (hotel agreement 4.7) ...
ALTER TABLE public.hotel_contacts ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;
ALTER TABLE public.hotel_contacts ADD COLUMN IF NOT EXISTS sms_opted_out_at timestamptz;
ALTER TABLE public.hotel_contacts ADD COLUMN IF NOT EXISTS consent_source text;

-- ... and members (Terms 15.C). Kept here, not in auth.users.
CREATE TABLE IF NOT EXISTS public.member_contact_prefs (
  user_id uuid PRIMARY KEY,
  phone text,
  sms_consent_at timestamptz,
  sms_opted_out_at timestamptz,
  consent_text text,                 -- the exact wording they agreed to
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Backend-only tables: no policies, so the public Supabase API can't read them.
ALTER TABLE public.deal_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_offer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_negotiation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_contact_prefs ENABLE ROW LEVEL SECURITY;
