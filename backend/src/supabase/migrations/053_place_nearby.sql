-- "What's nearby" cache: restaurants, cafés, bars, groceries and shops within
-- walking distance of a listing, from Mapbox category search. Fetched once and
-- refreshed monthly so map/search costs don't grow with traffic.
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS nearby_json jsonb,
  ADD COLUMN IF NOT EXISTS nearby_fetched_at timestamptz;
