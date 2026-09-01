-- One-time backfill (not a schema change): places.short_description was
-- previously derived by hard-slicing full_description at exactly 100
-- characters, which frequently cut off mid-word ("...Fairfax Bouleva",
-- "...3-star bo"). The app code that generates it now truncates at the
-- last whole word instead; this recomputes existing rows the same way so
-- already-created listings don't need to be manually re-saved.
-- Safe to re-run.

WITH normalized AS (
  SELECT id, regexp_replace(btrim("fullDescription"), '\s+', ' ', 'g') AS full_norm
  FROM public.places
)
UPDATE public.places p
SET "shortDescription" = trim(
  CASE
    WHEN char_length(n.full_norm) = 0 THEN p.name
    WHEN char_length(n.full_norm) <= 100 THEN n.full_norm
    WHEN substr(n.full_norm, 101, 1) = ' ' THEN substr(n.full_norm, 1, 100)
    ELSE regexp_replace(substr(n.full_norm, 1, 100), '\S+$', '')
  END
)
FROM normalized n
WHERE p.id = n.id;
