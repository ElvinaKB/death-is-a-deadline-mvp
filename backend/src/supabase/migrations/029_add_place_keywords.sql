-- Optional amenity keywords for listing detail (admin multi-select)
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}';
