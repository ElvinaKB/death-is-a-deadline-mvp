-- Migration: rolling state for the dynamic ("flickering") bid threshold.
--
-- Stores the current effective premium sitting on top of a place's hidden
-- floor (places.minimum_bid / minimum_bid_by_day_of_week) for one specific
-- night. Each bid evaluation for that night nudges current_premium up or
-- down within a bounded step, so the number a traveler needs to clear
-- drifts over time instead of staying fixed and shareable. The floor itself
-- never moves. See dynamicPricing.service.ts.

CREATE TABLE IF NOT EXISTS public.place_threshold_state (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id        TEXT NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  current_premium DOUBLE PRECISION NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT place_threshold_state_place_id_date_key UNIQUE (place_id, date)
);

CREATE INDEX IF NOT EXISTS idx_place_threshold_state_place_date
  ON public.place_threshold_state (place_id, date);
