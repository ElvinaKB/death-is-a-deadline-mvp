-- Migration: dedicated LinkedIn field for waitlist / newsletter signups, so a
-- person's profile isn't buried in "where did you hear about us" and can be
-- used later to verify them when the waitlist becomes the traveler list.
ALTER TABLE public.waitlist_signups     ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Backfill: move LinkedIn URLs that were pasted into "source" into linkedin_url.
UPDATE public.waitlist_signups
SET linkedin_url = CASE WHEN btrim(split_part(source, '?', 1)) ~* '^https?://'
                        THEN btrim(split_part(source, '?', 1))
                        ELSE 'https://' || btrim(split_part(source, '?', 1)) END,
    source = NULL
WHERE linkedin_url IS NULL AND source ~* '^\s*(https?://)?(www\.)?linkedin\.com/in/\S+\s*$';

UPDATE public.newsletter_subscribers
SET linkedin_url = CASE WHEN btrim(split_part(source, '?', 1)) ~* '^https?://'
                        THEN btrim(split_part(source, '?', 1))
                        ELSE 'https://' || btrim(split_part(source, '?', 1)) END,
    source = NULL
WHERE linkedin_url IS NULL AND source ~* '^\s*(https?://)?(www\.)?linkedin\.com/in/\S+\s*$';
