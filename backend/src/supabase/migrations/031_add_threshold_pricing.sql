-- Migration: Add threshold pricing mode and per-weekday minimum bids

CREATE TYPE public.threshold_pricing_mode AS ENUM ('UNIFORM', 'PER_WEEKDAY');

ALTER TABLE public.places
ADD COLUMN IF NOT EXISTS threshold_pricing_mode public.threshold_pricing_mode NOT NULL DEFAULT 'UNIFORM';

ALTER TABLE public.places
ADD COLUMN IF NOT EXISTS minimum_bid_by_day_of_week DOUBLE PRECISION[] NOT NULL DEFAULT ARRAY[]::DOUBLE PRECISION[];

-- Backfill existing places with uniform minimum across all weekdays
UPDATE public.places
SET minimum_bid_by_day_of_week = ARRAY[
  "minimumBid", "minimumBid", "minimumBid", "minimumBid",
  "minimumBid", "minimumBid", "minimumBid"
]
WHERE cardinality(minimum_bid_by_day_of_week) = 0;
