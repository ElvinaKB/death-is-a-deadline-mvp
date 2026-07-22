-- Migration: public hotel "Ready to Join?" application leads.
--
-- Captured from the public /hotels/join form. Backend-only (written by the
-- public submit endpoint, read by the admin list) — no client key ever touches
-- it, so enable RLS with no policies (deny-all for anon/authenticated; the API's
-- direct connection bypasses RLS), same posture as place_channel_availability.

CREATE TABLE IF NOT EXISTS public.hotel_applications (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  hotel_name    TEXT NOT NULL,
  address       TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT NOT NULL,
  days_of_week  INTEGER[] NOT NULL DEFAULT '{}',
  rooms_per_day INTEGER NOT NULL,
  secret_price  DECIMAL(10, 2) NOT NULL,
  pms           TEXT[] NOT NULL DEFAULT '{}',
  pms_other     TEXT,
  status        TEXT NOT NULL DEFAULT 'new',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_applications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hotel_applications_created_at
  ON public.hotel_applications (created_at DESC);
