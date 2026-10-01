-- Wholesale supply (Nuitee / LiteAPI). Wholesale hotels are imported as real
-- listings so they get the same pages, map pins and bid analytics as direct
-- partners, but they're booked through Nuitee instead of Cloudbeds/payment link.
--
-- supply_source: 'direct' (default — every existing listing) | 'wholesale'.
-- liteapi_hotel_id: the Nuitee hotel id. Kept even after a hotel signs direct
--   (supply_source flipped to 'direct') so the nightly import never re-creates
--   a duplicate wholesale listing for it.
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS supply_source text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS liteapi_hotel_id text,
  ADD COLUMN IF NOT EXISTS star_rating double precision,
  ADD COLUMN IF NOT EXISTS guest_rating double precision,
  ADD COLUMN IF NOT EXISTS guest_review_count integer,
  ADD COLUMN IF NOT EXISTS wholesale_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS places_liteapi_hotel_id_key
  ON places (liteapi_hotel_id);
CREATE INDEX IF NOT EXISTS idx_places_supply_source
  ON places (supply_source);

-- Per-bid supplier snapshot for wholesale bookings. supplier_cost is what Nuitee
-- charges Deadline for the stay (the margin is bid total - supplier_cost);
-- pay_at_hotel_amount is any mandatory fee/tax the hotel collects at check-in
-- (shown in the price, never charged by us).
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS supplier_offer_id text,
  ADD COLUMN IF NOT EXISTS supplier_cost numeric(10, 2),
  ADD COLUMN IF NOT EXISTS pay_at_hotel_amount numeric(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_prebook_id text,
  ADD COLUMN IF NOT EXISTS supplier_booking_id text,
  ADD COLUMN IF NOT EXISTS supplier_confirmation_code text,
  ADD COLUMN IF NOT EXISTS supplier_status text;
