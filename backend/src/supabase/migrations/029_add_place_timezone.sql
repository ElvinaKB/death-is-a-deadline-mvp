-- Hotel IANA timezone (e.g. America/Los_Angeles) — "today" for bids/inventory follows property local date
ALTER TABLE public.places
ADD COLUMN IF NOT EXISTS timezone VARCHAR(64);

UPDATE public.places
SET timezone = 'America/Los_Angeles'
WHERE timezone IS NULL OR TRIM(timezone) = '';
