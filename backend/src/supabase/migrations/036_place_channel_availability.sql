-- Migration: per-date channel availability from Cloudbeds/myallocator ARIUpdate.
--
-- Stores the `units` Cloudbeds pushes per room/date. Drives the effective
-- per-date cap for bidding: available = min(places.max_inventory, units) minus
-- accepted bids. Rows are absent for dates Cloudbeds hasn't pushed (or for
-- hotels not connected to a channel manager), in which case max_inventory
-- alone applies.

CREATE TABLE IF NOT EXISTS public.place_channel_availability (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id   TEXT NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  units      INTEGER NOT NULL,
  source     VARCHAR(20) NOT NULL DEFAULT 'cloudbeds',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT place_channel_availability_place_id_date_key UNIQUE (place_id, date)
);

CREATE INDEX IF NOT EXISTS idx_place_channel_availability_place_date
  ON public.place_channel_availability (place_id, date);
