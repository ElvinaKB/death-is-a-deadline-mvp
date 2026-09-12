-- Per-listing toggle for the hidden dynamic ("flickering") bid premium.
-- When false, a bid only needs to meet the fixed minimum (floor) to win, so a
-- hotel can run deterministic "bid exactly $X" promotions. Defaults to true so
-- all existing listings keep the current dynamic behavior.
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS dynamic_pricing_enabled boolean NOT NULL DEFAULT true;
