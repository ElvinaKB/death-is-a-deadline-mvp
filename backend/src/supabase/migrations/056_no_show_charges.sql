-- No-show charges (Model B). The guest's card is saved off-session when they
-- pay the 7% booking fee; if they don't show, the hotel reports it within 72h
-- of arrival and we charge up to the first night's room rate to that card.
-- One row per booking (bid_id UNIQUE) so a booking can never be charged twice;
-- a FAILED attempt is retried on the same row (attempts++).
--
-- status: PENDING          — charge sent to Stripe, outcome not known yet
--         REQUIRES_ACTION  — bank wants 3DS; guest emailed a link to confirm
--         SUCCEEDED        — money collected
--         FAILED           — declined; can be retried
CREATE TABLE IF NOT EXISTS public.no_show_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL UNIQUE REFERENCES public.bids(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency varchar(3) NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED')),
  stripe_payment_intent_id varchar(255) UNIQUE,
  stripe_client_secret varchar(255),
  stripe_payment_method_id varchar(255),
  attempts integer NOT NULL DEFAULT 1,
  -- When the hotel told us the guest didn't arrive (the 72h-window evidence).
  hotel_reported_at timestamptz NOT NULL,
  notes text,
  failure_reason text,
  -- The matching no-show payment we owe the hotel (our own obligation).
  payable_to_hotel numeric(10,2),
  is_paid_to_hotel boolean NOT NULL DEFAULT false,
  charged_by uuid,
  succeeded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_no_show_charges_status ON public.no_show_charges (status);

-- Backend-only table (holds Stripe client secrets): no policies, so the
-- public Supabase API can't read it. Prisma connects as the owner.
ALTER TABLE public.no_show_charges ENABLE ROW LEVEL SECURITY;

-- Model B bookings: we only collected the 7% fee and the hotel collects the
-- room balance at the desk, so we owe the hotel nothing. Earlier code recorded
-- 93% as payable, which put these bookings in "Payouts owed".
-- Only rows where the captured charge was the fee (well under the room total),
-- so a full-collection booking made before a listing switched models is kept.
UPDATE public.bids b
SET payable_to_hotel = 0
FROM public.places p, public.payments pay
WHERE b.place_id = p.id
  AND pay.bid_id = b.id
  AND pay.status = 'CAPTURED'
  AND pay.amount < b.total_amount * 0.5
  AND p.commission_only = true
  AND p.supply_source = 'direct'
  AND b.is_paid_to_hotel = false
  AND b.payable_to_hotel > 0;
