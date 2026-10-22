-- Dynamic retail anchor for DIRECT listings: link a listing to its LiteAPI
-- (Nuitee) hotel by address, then pull a live, per-date public price as the
-- "retail" anchor instead of a static admin number. `retail_anchor_hotel_id`
-- is NOT unique (a paused wholesale copy may already hold the same hotel via
-- liteapi_hotel_id). Auto-matching is on by default; a toggle can disable it.
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS retail_anchor_hotel_id text,
  ADD COLUMN IF NOT EXISTS dynamic_retail_enabled boolean NOT NULL DEFAULT true;
