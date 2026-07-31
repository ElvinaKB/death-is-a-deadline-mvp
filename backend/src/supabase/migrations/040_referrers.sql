-- Migration: affiliate/referrer program.
--
-- A referrer refers hotels to Deadline and earns a share of commission on that
-- hotel's bookings for a fixed window (default 12 months from referralStartedAt).
-- A referrer is also a normal traveler (user_id -> auth.users), so they can bid.
-- Raw tax IDs (SSN/EIN) are intentionally NOT stored — the W-9 TIN must be
-- handled by a secure vault / tax-payout service before real payouts run.
-- Backend-only writes (admin + the affiliate's own portal via the API); enable
-- RLS with no policies (deny-all for client keys, the API bypasses via its
-- direct connection), same posture as the other admin tables.

CREATE TABLE IF NOT EXISTS public.referrers (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id                UUID NOT NULL UNIQUE,
  display_name           TEXT NOT NULL,
  email                  TEXT NOT NULL,
  split_percent          DOUBLE PRECISION NOT NULL DEFAULT 3.5,
  referral_window_months INTEGER NOT NULL DEFAULT 12,
  tax_status             TEXT NOT NULL DEFAULT 'pending',
  tax_legal_name         TEXT,
  tax_classification     TEXT,
  tax_address            TEXT,
  status                 TEXT NOT NULL DEFAULT 'active',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referrers ENABLE ROW LEVEL SECURITY;

-- Link a hotel listing to the referrer who brought it in, plus when the
-- 1-year referral window started.
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS referrer_id TEXT
    REFERENCES public.referrers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_places_referrer_id ON public.places (referrer_id);
